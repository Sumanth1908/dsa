import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import CodeTabs from '@/components/shared/CodeTabs'

type Resource = 'events' | 'bookings' | 'users'
type RaceTab = 'problem' | 'solution'

const ENDPOINTS: Record<Resource, { method: string; path: string; description: string; request: string; response: string }[]> = {
  events: [
    { method: 'GET', path: '/api/v1/events', description: 'List all events', request: '?city=NYC&date=2025-12-31&page=1', response: '{ events: [...], total, next_cursor }' },
    { method: 'GET', path: '/api/v1/events/:id', description: 'Get event details', request: '—', response: '{ id, name, venue, date, totalSeats, availableSeats }' },
    { method: 'POST', path: '/api/v1/events', description: 'Create event (admin)', request: '{ name, venue, date, totalSeats, price }', response: '{ id, status: "created" }' },
    { method: 'PUT', path: '/api/v1/events/:id', description: 'Update event (admin)', request: '{ name?, venue?, date?, totalSeats? }', response: '{ id, status: "updated" }' },
    { method: 'DELETE', path: '/api/v1/events/:id', description: 'Cancel event (admin)', request: '—', response: '{ status: "cancelled" }' },
  ],
  bookings: [
    { method: 'GET', path: '/api/v1/bookings', description: 'My bookings', request: '?status=confirmed&page=1', response: '[{ id, event, seats, status, totalPrice }]' },
    { method: 'POST', path: '/api/v1/bookings', description: 'Book tickets', request: '{ eventId, seats: 2, paymentToken }', response: '{ bookingId, confirmationCode, status }' },
    { method: 'GET', path: '/api/v1/bookings/:id', description: 'Booking detail', request: '—', response: '{ id, event, seats, status, qrCode }' },
    { method: 'PUT', path: '/api/v1/bookings/:id', description: 'Modify booking', request: '{ seats? }', response: '{ status: "modified" }' },
    { method: 'DELETE', path: '/api/v1/bookings/:id', description: 'Cancel booking', request: '—', response: '{ status: "cancelled", refundId }' },
  ],
  users: [
    { method: 'POST', path: '/api/v1/users', description: 'Register', request: '{ email, password, name }', response: '{ userId, token }' },
    { method: 'GET', path: '/api/v1/users/me', description: 'Get profile', request: 'Authorization: Bearer <token>', response: '{ id, email, name, preferences }' },
    { method: 'PUT', path: '/api/v1/users/me', description: 'Update profile', request: '{ name?, phone?, preferences? }', response: '{ status: "updated" }' },
    { method: 'DELETE', path: '/api/v1/users/me', description: 'Delete account', request: '—', response: '{ status: "deleted" }' },
  ],
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  POST: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  PUT: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  DELETE: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400',
}

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python (DB-level lock)',
    code: `from sqlalchemy import select, update
from sqlalchemy.orm import Session

# ─── SAFE BOOKING WITH SELECT FOR UPDATE ─────────────────────
def create_booking(db: Session, event_id: int, user_id: int, num_seats: int):
    """
    SELECT FOR UPDATE acquires a row-level lock — no two transactions
    can modify the same event row simultaneously.
    """
    # Lock the event row for this transaction
    event = db.execute(
        select(Event)
        .where(Event.id == event_id)
        .with_for_update()   # ← row-level lock acquired here
    ).scalar_one_or_none()

    if not event:
        raise ValueError("Event not found")

    if event.available_seats < num_seats:
        raise ValueError(f"Only {event.available_seats} seats left")

    # Safe to decrement — no other transaction can read stale value
    event.available_seats -= num_seats
    booking = Booking(event_id=event_id, user_id=user_id, seats=num_seats)
    db.add(booking)
    db.commit()   # lock released on commit
    return booking

# ─── OPTIMISTIC LOCKING ALTERNATIVE ──────────────────────────
def create_booking_optimistic(db: Session, event_id: int, num_seats: int):
    """
    No locks — uses version column. Fails fast on conflict (retry-friendly).
    Better throughput when conflicts are rare.
    """
    event = db.query(Event).filter(Event.id == event_id).one()
    current_version = event.version

    rows_affected = db.execute(
        update(Event)
        .where(Event.id == event_id, Event.version == current_version)
        .values(
            available_seats=Event.available_seats - num_seats,
            version=current_version + 1
        )
    ).rowcount

    if rows_affected == 0:
        raise ConcurrentModificationError("Booking conflict — please retry")

    db.commit()`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (Redis distributed lock)',
    code: `import { createClient } from 'redis'
import { v4 as uuid } from 'uuid'

const redis = createClient()
const LOCK_TTL = 5000  // 5 seconds — auto-releases if server crashes

// ─── DISTRIBUTED LOCK (for multi-server deployments) ──────────
const acquireLock = async (key, ttlMs = LOCK_TTL) => {
    const token = uuid()
    // SET NX = only set if key doesn't exist (atomic acquire)
    const acquired = await redis.set(key, token, { NX: true, PX: ttlMs })
    return acquired ? token : null
}

const releaseLock = async (key, token) => {
    // Lua script — atomic check-then-delete (prevents releasing someone else's lock)
    const script = \`
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    \`
    return redis.eval(script, { keys: [key], arguments: [token] })
}

// ─── BOOKING HANDLER ──────────────────────────────────────────
const createBooking = async (eventId, userId, numSeats) => {
    const lockKey = \`lock:event:\${eventId}\`
    const lockToken = await acquireLock(lockKey)

    if (!lockToken) {
        throw new Error('Event is busy — please retry in a moment')
    }

    try {
        const event = await db.events.findById(eventId)

        if (event.availableSeats < numSeats) {
            throw new Error(\`Only \${event.availableSeats} seats remaining\`)
        }

        const [booking] = await db.transaction(async (trx) => {
            await trx('events').where({ id: eventId })
                .decrement('available_seats', numSeats)
            return trx('bookings').insert({ eventId, userId, seats: numSeats }).returning('*')
        })

        return booking
    } finally {
        await releaseLock(lockKey, lockToken)  // always release
    }
}`,
  },
  {
    lang: 'java' as const, label: 'Java (Spring + JPA Optimistic Lock)',
    code: `import jakarta.persistence.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Entity
public class Event {
    @Id Long id;
    String name;
    int availableSeats;

    @Version  // ← JPA manages version column automatically
    Long version;
}

@Service
public class BookingService {

    @Transactional
    public Booking createBooking(Long eventId, Long userId, int numSeats) {
        // JPA SELECT FOR UPDATE — row-level lock acquired
        Event event = eventRepository.findByIdForUpdate(eventId)
            .orElseThrow(() -> new EventNotFoundException(eventId));

        if (event.getAvailableSeats() < numSeats) {
            throw new InsufficientSeatsException(
                "Only " + event.getAvailableSeats() + " seats available"
            );
        }

        event.setAvailableSeats(event.getAvailableSeats() - numSeats);

        Booking booking = Booking.builder()
            .event(event)
            .userId(userId)
            .seats(numSeats)
            .status(BookingStatus.CONFIRMED)
            .build();

        return bookingRepository.save(booking);
        // Transaction commits here — lock released
        // If two transactions hit the same version: OptimisticLockException thrown
    }

    // Retry on conflict (Spring @Retryable or manual)
    @Transactional
    @Retryable(value = OptimisticLockingFailureException.class, maxAttempts = 3)
    public Booking createBookingWithRetry(Long eventId, Long userId, int numSeats) {
        return createBooking(eventId, userId, numSeats);
    }
}`,
  },
]

const RACE_STEPS_PROBLEM = [
  { who: 'Alice', action: 'GET /events/42 — sees 1 seat remaining', state: '1 seat available', color: 'text-blue-600 dark:text-blue-400' },
  { who: 'Bob', action: 'GET /events/42 — also sees 1 seat remaining', state: '1 seat available', color: 'text-rose-600 dark:text-rose-400' },
  { who: 'Alice', action: 'POST /bookings { eventId: 42, seats: 1 }', state: 'both booking…', color: 'text-blue-600 dark:text-blue-400' },
  { who: 'Bob', action: 'POST /bookings { eventId: 42, seats: 1 }', state: 'both booking…', color: 'text-rose-600 dark:text-rose-400' },
  { who: 'DB', action: 'UPDATE events SET available_seats = 0 (Alice writes first)', state: '0 seats', color: 'text-slate-500' },
  { who: 'DB', action: 'UPDATE events SET available_seats = 0 (Bob reads stale value — also writes 0!)', state: '−1 seats 💥', color: 'text-rose-600 dark:text-rose-400' },
  { who: '⚠️', action: 'Both bookings succeed — same seat sold twice. Double booking!', state: 'CORRUPTED', color: 'text-rose-600 dark:text-rose-400' },
]

const RACE_STEPS_SOLUTION = [
  { who: 'Alice', action: 'POST /bookings — server calls acquireLock("event:42")', state: 'Lock: Alice', color: 'text-blue-600 dark:text-blue-400' },
  { who: 'Bob', action: 'POST /bookings — server calls acquireLock("event:42") → null (locked)', state: 'Lock: Alice', color: 'text-rose-600 dark:text-rose-400' },
  { who: 'Bob', action: 'Returns 409 "Event busy — retry in a moment"', state: 'Lock: Alice', color: 'text-rose-600 dark:text-rose-400' },
  { who: 'Alice', action: 'Reads event: 1 seat. Books it. available_seats → 0', state: 'Lock: Alice', color: 'text-blue-600 dark:text-blue-400' },
  { who: 'Alice', action: 'releaseLock("event:42")', state: 'Lock: free', color: 'text-blue-600 dark:text-blue-400' },
  { who: 'Bob', action: 'Retries — acquires lock. Reads event: 0 seats available', state: 'Lock: Bob', color: 'text-rose-600 dark:text-rose-400' },
  { who: '✓', action: 'Bob gets 409 "Sold out". No double booking.', state: 'Correct', color: 'text-emerald-600 dark:text-emerald-400' },
]

const DOUBTS = [
  {
    q: 'Two users click the last seat at the same instant — what actually prevents double-booking?',
    a: 'The database layer prevents double-booking, not application code. Three mechanisms exist: `SELECT ... FOR UPDATE` (pessimistic row-level locking that blocks concurrent writers until the transaction commits), an optimistic version column (the second writer detects a version mismatch and retries), or a UNIQUE constraint on `(event_id, seat_number)` so the second insert simply fails with a constraint violation. Application-level "check then book" logic always loses the race — between your read of available seats and your insert, another transaction can slip in. Always defer the final seat reservation to the database with one of these patterns. **Rule of thumb:** single-server? SELECT FOR UPDATE. Multi-region? Optimistic locking with retries. Zero risk? UNIQUE constraint on natural keys.',
  },
  {
    q: 'Why hold seats with a TTL before payment?',
    a: 'Payment processing takes minutes, so without a hold, the entire checkout flow becomes one giant race window where another user can grab the seat. A short-term reservation — either a Redis key with an expiry TTL or a `held_until` timestamp column in the database — blocks rival users from booking the same seat while your transaction completes. If the user abandons the cart or fails to pay, the hold auto-expires (Redis TTL fires or a cleanup job rolls back `held_until` records), freeing the seat for others. Example: hold for 10 minutes. If payment confirms in 7 minutes, commit the booking and release the hold. If payment fails or times out, the hold expires automatically. **Common mistake:** forgetting to release holds on payment success.',
  },
  {
    q: 'Payment succeeded but the booking write failed — now what?',
    a: 'Payment succeeded, but the booking database write failed — now you have a payment record with no corresponding booking. This is the distributed transaction problem. Make booking confirmation idempotent by tagging each attempt with a unique idempotency key; if the same request arrives twice, return the old result instead of double-charging. Use an outbox pattern: record the booking intent locally before calling the payment API, then retry the payment-to-booking reconciliation loop until success. If reconciliation truly fails after retries, issue a refund as the compensating action. Example: Stripe webhook confirms a charge, but your booking table INSERT fails — log the intent, then have a background job repeatedly reconcile payments to bookings. **Rule of thumb:** assume every system step can fail and crash. Build recovery into your design, not as an afterthought.',
  },
  {
    q: 'How do you survive 100k people rushing 1,000 tickets?',
    a: 'Never allow all 100,000 concurrent users to hit your database simultaneously. Instead, implement three layers of protection: a virtual waiting room that admits users in controlled batches (Ticketmaster uses this for big sales), caching for browse and search pages so they don\'t hit the database, and aggressive rate limiting to block automated bots and scalpers. Behind these gates, your booking core only handles thousands of contenders, not millions. Example: release tickets at 10 AM; your queue admits 1,000 users at a time, each user gets 5 minutes to complete checkout, then the next batch flows in. Without this funnel, database connection pools overflow, query timeouts spike, and the entire platform goes down. **Rule of thumb:** load-shedding upstream saves your core from melting.',
  },
]

export default function EventBookingViz() {
  const [resource, setResource] = useState<Resource>('events')
  const [raceTab, setRaceTab] = useState<RaceTab>('problem')
  const [tab, setTab] = useState<'api' | 'race'>('api')
  const [selected, setSelected] = useState<number | null>(null)

  const eps = ENDPOINTS[resource]
  const raceSteps = raceTab === 'problem' ? RACE_STEPS_PROBLEM : RACE_STEPS_SOLUTION

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Event Booking API</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          REST API design for a ticket booking platform — resources, endpoints, and the double-booking race condition
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          One seat left for Saturday's concert, and two fans hit "Buy" at the exact same instant. Both requests
          check the database — "seats available: 1" — both are satisfied, both charge the card, both send a
          cheerful confirmation email. On Saturday, two strangers hold tickets for seat 14C. Nobody wrote buggy
          code; the timing itself was the bug. This case study designs the booking API, then fixes exactly that.
        </p>
      </div>

      <MemoryTip>Checking availability is a question; reserving atomically is the guarantee.</MemoryTip>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>The hard problem:</strong> Two users simultaneously book the last seat for a concert. Without proper locking, both succeed — you've just oversold. Ticketmaster, EventBrite, and BookMyShow all solve this with some form of optimistic or pessimistic locking.
        </p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2">
        {[{ id: 'api' as const, label: 'REST API Explorer' }, { id: 'race' as const, label: 'Double-Booking Problem' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-violet-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="viz-container p-6">
        {tab === 'api' && (
          <div className="space-y-4">
            {/* Resource selector */}
            <div className="flex gap-2">
              {(['events', 'bookings', 'users'] as Resource[]).map(r => (
                <button key={r} onClick={() => { setResource(r); setSelected(null) }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    resource === r ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>{r}</button>
              ))}
            </div>

            <div className="space-y-2">
              {eps.map((ep, i) => (
                <div key={i} onClick={() => setSelected(selected === i ? null : i)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 transition-all">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                    <code className="text-sm text-slate-700 dark:text-slate-300 flex-1">{ep.path}</code>
                    <span className="text-xs text-slate-400">{ep.description}</span>
                    <span className="text-slate-400 text-xs">{selected === i ? '▲' : '▼'}</span>
                  </div>
                  {selected === i && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
                      <div className="px-4 py-3">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Request</div>
                        <code className="text-xs text-slate-600 dark:text-slate-400 font-mono">{ep.request}</code>
                      </div>
                      <div className="px-4 py-3">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Response</div>
                        <code className="text-xs text-slate-600 dark:text-slate-400 font-mono">{ep.response}</code>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'race' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[{ id: 'problem' as RaceTab, label: '❌ Without locking' }, { id: 'solution' as RaceTab, label: '✓ With locking' }].map(t => (
                <button key={t.id} onClick={() => setRaceTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    raceTab === t.id
                      ? t.id === 'problem' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>{t.label}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              {raceSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5">
                  <span className={`text-xs font-bold w-12 flex-shrink-0 mt-0.5 ${step.color}`}>{step.who}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{step.action}</span>
                  <span className={`text-xs font-mono flex-shrink-0 ml-2 ${step.color}`}>{step.state}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
