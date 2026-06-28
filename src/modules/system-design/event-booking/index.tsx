import React, { useState } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

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

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
