import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

type WorkerState = 'idle' | 'requesting' | 'blocked' | 'holding' | 'reading' | 'writing' | 'done' | 'crashed'

interface Worker {
  id: string
  state: WorkerState
  note?: string
}

interface Step {
  workers: Worker[]
  resourceLabel: string
  resourceState: string
  danger?: boolean
  log: string[]
  message: string
}

const w = (id: string, state: WorkerState, note?: string): Worker => ({ id, state, note })

// ─── Mutex ───────────────────────────────────────────────────────────────
const mutexSteps: Step[] = [
  { workers: [w('A', 'idle'), w('B', 'idle')], resourceLabel: '🔒 Mutex', resourceState: 'Unlocked', log: [], message: 'Mutex: only ONE worker may hold the lock at a time. A and B both want to update the same bank balance ($100).' },
  { workers: [w('A', 'requesting'), w('B', 'idle')], resourceLabel: '🔒 Mutex', resourceState: 'Unlocked', log: [], message: 'A requests the lock before touching the shared balance.' },
  { workers: [w('A', 'holding'), w('B', 'idle')], resourceLabel: '🔒 Mutex', resourceState: 'Locked by A', log: ['A: acquired lock'], message: 'A acquires the lock and starts updating the balance.' },
  { workers: [w('A', 'holding'), w('B', 'blocked', 'waiting for lock')], resourceLabel: '🔒 Mutex', resourceState: 'Locked by A', log: ['A: acquired lock', 'A: balance 100 → 150'], message: 'B also wants the lock but must wait — the mutex serializes access to the balance.' },
  { workers: [w('A', 'done'), w('B', 'holding')], resourceLabel: '🔒 Mutex', resourceState: 'Locked by B', log: ['A: acquired lock', 'A: balance 100 → 150', 'A: released lock'], message: 'A finishes and releases. B immediately acquires the now-free lock.' },
  { workers: [w('A', 'done'), w('B', 'done')], resourceLabel: '🔒 Mutex', resourceState: 'Unlocked', log: ['A: acquired lock', 'A: balance 100 → 150', 'A: released lock', 'B: balance 150 → 200', 'B: released lock'], message: 'Both updates applied safely, one at a time. No lost update, no corruption.' },
]

// ─── Semaphore ───────────────────────────────────────────────────────────
const semaphoreSteps: Step[] = [
  { workers: [w('A', 'idle'), w('B', 'idle'), w('C', 'idle')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 2/2 free', log: [], message: 'Semaphore(2): up to 2 workers may hold a permit simultaneously — a mutex is just a semaphore(1). Think: a DB connection pool with 2 slots.' },
  { workers: [w('A', 'holding'), w('B', 'idle'), w('C', 'idle')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 1/2 free', log: ['A: acquired permit'], message: 'A acquires a permit — 1 of 2 slots now in use.' },
  { workers: [w('A', 'holding'), w('B', 'holding'), w('C', 'idle')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 0/2 free', log: ['A: acquired permit', 'B: acquired permit'], message: 'B also acquires a permit — both slots are now full, and both run concurrently.' },
  { workers: [w('A', 'holding'), w('B', 'holding'), w('C', 'blocked', 'no permits left')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 0/2 free — C waiting', log: ['A: acquired permit', 'B: acquired permit'], message: 'C wants a permit too, but none are free — C blocks until someone releases.' },
  { workers: [w('A', 'done'), w('B', 'holding'), w('C', 'holding')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 0/2 free', log: ['A: acquired permit', 'B: acquired permit', 'A: released permit', 'C: acquired permit'], message: 'A releases — C immediately grabs the freed permit. B never had to stop.' },
  { workers: [w('A', 'done'), w('B', 'done'), w('C', 'done')], resourceLabel: '🎟️ Semaphore(2)', resourceState: 'Permits: 2/2 free', log: ['A: acquired permit', 'B: acquired permit', 'A: released permit', 'C: acquired permit', 'B: released permit', 'C: released permit'], message: 'All done. Semaphores cap concurrency at N instead of forcing full serialization — higher throughput than a mutex when N > 1 is safe.' },
]

// ─── Read-Write Lock ─────────────────────────────────────────────────────
const rwlockSteps: Step[] = [
  { workers: [w('R1', 'idle'), w('R2', 'idle'), w('W', 'idle')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 0, Writer: none', log: [], message: 'Read-Write Lock: many readers may hold the lock together, but a writer needs fully exclusive access.' },
  { workers: [w('R1', 'reading'), w('R2', 'idle'), w('W', 'idle')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 1, Writer: none', log: ['R1: acquired read lock'], message: 'R1 starts reading the shared config.' },
  { workers: [w('R1', 'reading'), w('R2', 'reading'), w('W', 'idle')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 2, Writer: none', log: ['R1: acquired read lock', 'R2: acquired read lock'], message: 'R2 reads concurrently too — reads never conflict with other reads, so both proceed in parallel.' },
  { workers: [w('R1', 'reading'), w('R2', 'reading'), w('W', 'blocked', 'waiting for readers')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 2, Writer: W waiting', log: ['R1: acquired read lock', 'R2: acquired read lock'], message: 'W wants to write, but must wait until every active reader finishes — a writer can never interleave with reads.' },
  { workers: [w('R1', 'done'), w('R2', 'done'), w('W', 'writing')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 0, Writer: W (EXCLUSIVE)', log: ['R1: acquired read lock', 'R2: acquired read lock', 'R1: released', 'R2: released', 'W: acquired write lock'], message: 'Once both readers release, W gets exclusive access — no reader can see a half-written value.' },
  { workers: [w('R1', 'done'), w('R2', 'done'), w('W', 'done')], resourceLabel: '📖 Read-Write Lock', resourceState: 'Readers: 0, Writer: none', log: ['R1: acquired read lock', 'R2: acquired read lock', 'R1: released', 'R2: released', 'W: acquired write lock', 'W: released write lock'], message: 'Great for read-heavy workloads (e.g. config caches) where reads vastly outnumber writes.' },
]

// ─── Reentrant Lock ──────────────────────────────────────────────────────
const reentrantSteps: Step[] = [
  { workers: [w('A', 'idle')], resourceLabel: '🔁 Reentrant Lock', resourceState: 'Unlocked (hold count: 0)', log: [], message: 'Reentrant Lock: the SAME thread can re-acquire a lock it already holds — essential for recursive functions.' },
  { workers: [w('A', 'holding', 'in outer()')], resourceLabel: '🔁 Reentrant Lock', resourceState: 'Locked by A (hold count: 1)', log: ['A: outer() acquires lock'], message: 'A calls outer(), which acquires the lock to update shared state.' },
  { workers: [w('A', 'holding', 'in inner(), called from outer()')], resourceLabel: '🔁 Reentrant Lock', resourceState: 'Locked by A (hold count: 2)', log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock'], danger: false, message: 'outer() calls inner(), which acquires the SAME lock again. Because A already owns it, this succeeds instantly — a non-reentrant lock would deadlock here (A waiting on itself)!' },
  { workers: [w('A', 'holding', 'back in outer()')], resourceLabel: '🔁 Reentrant Lock', resourceState: 'Locked by A (hold count: 1)', log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock', 'A: inner() releases'], message: 'inner() returns and releases once — but the lock is still held (count dropped from 2 to 1), because outer() still needs it.' },
  { workers: [w('A', 'done')], resourceLabel: '🔁 Reentrant Lock', resourceState: 'Unlocked (hold count: 0)', log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock', 'A: inner() releases', 'A: outer() releases'], message: 'outer() returns and does the final release. The lock is only truly free once the hold count reaches 0.' },
]

// ─── Spinlock ────────────────────────────────────────────────────────────
const spinlockSteps: Step[] = [
  { workers: [w('A', 'idle'), w('B', 'idle')], resourceLabel: '🌀 Spinlock', resourceState: 'Unlocked', log: [], message: 'Spinlock: instead of sleeping, a waiting thread "spins" in a tight loop, repeatedly re-checking the lock.' },
  { workers: [w('A', 'holding', 'critical section (tiny, ~50ns)'), w('B', 'idle')], resourceLabel: '🌀 Spinlock', resourceState: 'Locked by A', log: ['A: acquired (CAS succeeded)'], message: 'A grabs the lock via an atomic compare-and-swap and enters a very short critical section.' },
  { workers: [w('A', 'holding'), w('B', 'blocked', 'spinning: check…check…check… (burning CPU)')], resourceLabel: '🌀 Spinlock', resourceState: 'Locked by A', log: ['A: acquired (CAS succeeded)', 'B: CAS failed, retry', 'B: CAS failed, retry', 'B: CAS failed, retry'], message: 'B doesn\'t sleep — it keeps retrying the CAS in a hot loop. Wastes CPU cycles, but avoids the cost of an OS context switch.' },
  { workers: [w('A', 'done'), w('B', 'holding', 'CAS succeeded on next spin')], resourceLabel: '🌀 Spinlock', resourceState: 'Locked by B', log: ['A: acquired (CAS succeeded)', 'B: CAS failed, retry ×3', 'A: released', 'B: CAS succeeded'], message: 'The instant A releases, B\'s very next spin succeeds — near-zero hand-off latency, no scheduler involved.' },
  { workers: [w('A', 'done'), w('B', 'done')], resourceLabel: '🌀 Spinlock', resourceState: 'Unlocked', log: ['A: acquired', 'B: spun ×3', 'A: released', 'B: acquired', 'B: released'], message: 'Rule of thumb: spin only if the critical section is shorter than a context switch (~1-10µs). Otherwise use a blocking lock that sleeps the waiter and frees the CPU for real work.' },
]

// ─── Optimistic vs Pessimistic Locking ──────────────────────────────────
const optimisticSteps: Step[] = [
  { workers: [w('A', 'idle'), w('B', 'idle')], resourceLabel: '💾 Row: balance', resourceState: 'version: 1', log: [], message: 'Two strategies for a shared DB row. Pessimistic: lock BEFORE touching data. Optimistic: don\'t lock — check the version at commit time instead.' },
  { workers: [w('A', 'holding', 'SELECT ... FOR UPDATE'), w('B', 'blocked', 'waiting for row lock')], resourceLabel: '💾 Row: balance (pessimistic)', resourceState: 'Row-locked by A', log: ['A: SELECT ... FOR UPDATE'], message: 'PESSIMISTIC: A locks the row immediately. B can\'t even read-for-update until A commits — safe, but serializes everyone, even when conflicts would be rare.' },
  { workers: [w('A', 'done'), w('B', 'holding', 'row lock granted, proceeds')], resourceLabel: '💾 Row: balance (pessimistic)', resourceState: 'Unlocked', log: ['A: SELECT ... FOR UPDATE', 'A: UPDATE + COMMIT', 'B: row lock granted'], message: 'Only after A commits and releases does B get its turn. Zero wasted work, but throughput is capped by lock contention.' },
  { workers: [w('A', 'reading', 'reads version=1'), w('B', 'reading', 'reads version=1')], resourceLabel: '💾 Row: balance (optimistic)', resourceState: 'version: 1 (no lock taken)', log: [], message: 'OPTIMISTIC: A and B both read the row (version=1) with no lock at all — maximum concurrency.' },
  { workers: [w('A', 'writing', 'UPDATE ... WHERE version=1'), w('B', 'reading')], resourceLabel: '💾 Row: balance (optimistic)', resourceState: 'version: 2 — A\'s write committed', log: ['A: UPDATE WHERE version=1 → 1 row affected', 'A: version 1 → 2'], message: 'A commits first: "update WHERE version=1" matches, so it succeeds and bumps the version to 2.' },
  { workers: [w('A', 'done'), w('B', 'crashed', 'UPDATE ... WHERE version=1 → 0 rows')], resourceLabel: '💾 Row: balance (optimistic)', resourceState: 'version: 2 — B REJECTED, must retry', danger: true, log: ['A: UPDATE WHERE version=1 → 1 row affected', 'A: version 1 → 2', 'B: UPDATE WHERE version=1 → 0 rows affected (stale!)'], message: 'B\'s "WHERE version=1" now matches nothing (it\'s 2) — 0 rows affected. B detects the conflict and must re-read + retry. Cheap when conflicts are rare, wasteful when they\'re not.' },
]

// ─── Deadlock ────────────────────────────────────────────────────────────
const deadlockSteps: Step[] = [
  { workers: [w('A', 'idle'), w('B', 'idle')], resourceLabel: '🔗 Lock1 & Lock2', resourceState: 'Both unlocked', log: [], message: 'Deadlock: two threads each hold a lock the other one needs — a circular wait with no way out.' },
  { workers: [w('A', 'holding', 'holds Lock1, wants Lock2'), w('B', 'holding', 'holds Lock2, wants Lock1')], resourceLabel: '🔗 Lock1 & Lock2', resourceState: 'Lock1→A, Lock2→B', log: ['A: acquired Lock1', 'B: acquired Lock2'], message: 'A acquires Lock1. Simultaneously, B acquires Lock2 — different threads, different order.' },
  { workers: [w('A', 'blocked', 'waiting on Lock2 (held by B)'), w('B', 'blocked', 'waiting on Lock1 (held by A)')], resourceLabel: '🔗 Lock1 & Lock2', resourceState: '💀 DEADLOCK', danger: true, log: ['A: acquired Lock1', 'B: acquired Lock2', 'A: requests Lock2 → BLOCKED', 'B: requests Lock1 → BLOCKED'], message: 'A now wants Lock2 (held by B) and B wants Lock1 (held by A). Neither will ever release — the program hangs forever.' },
  { workers: [w('A', 'idle'), w('B', 'idle')], resourceLabel: '🔗 Lock1 & Lock2', resourceState: 'Both unlocked', log: [], message: 'THE FIX — lock ordering: every thread must acquire locks in the same global order (e.g., always Lock1 before Lock2). This makes the circular wait structurally impossible.' },
  { workers: [w('A', 'holding', 'Lock1 then Lock2, in order'), w('B', 'blocked', 'wants Lock1 — waits its turn')], resourceLabel: '🔗 Lock1 & Lock2', resourceState: 'Lock1→A, Lock2→A', log: ['A: acquired Lock1', 'A: acquired Lock2 (same order)', 'B: requests Lock1 → waits (not a deadlock, just a queue)'], message: 'B also wants Lock1-then-Lock2, so it simply queues behind A instead of forming a cycle. No deadlock — just a normal wait.' },
]

// ─── Distributed Lock ────────────────────────────────────────────────────
const distributedSteps: Step[] = [
  { workers: [w('Server A', 'idle'), w('Server B', 'idle')], resourceLabel: '🌐 Redis: lock:invoice-42', resourceState: 'key absent', log: [], message: 'Distributed Lock: when the contenders are separate processes/servers, an in-process mutex is useless — the lock must live in a shared store (Redis, ZooKeeper, etcd) with a TTL.' },
  { workers: [w('Server A', 'holding', 'SET key=A NX PX 30000'), w('Server B', 'idle')], resourceLabel: '🌐 Redis: lock:invoice-42', resourceState: 'Held by Server A, TTL 30s', log: ['A: SET NX PX 30000 → OK'], message: 'Server A sets the key only if it doesn\'t exist (NX), with a 30s auto-expiry (PX) — this is the distributed lock.' },
  { workers: [w('Server A', 'holding'), w('Server B', 'blocked', 'SET NX failed — retries with backoff')], resourceLabel: '🌐 Redis: lock:invoice-42', resourceState: 'Held by Server A, TTL 30s', log: ['A: SET NX PX 30000 → OK', 'B: SET NX PX 30000 → FAIL (key exists)'], message: 'Server B tries the same SET NX — it fails because the key already exists, so B backs off and retries later.' },
  { workers: [w('Server A', 'crashed', 'crashed mid-task, never unlocked'), w('Server B', 'blocked')], resourceLabel: '🌐 Redis: lock:invoice-42', resourceState: 'Held by Server A (stale)', danger: true, log: ['A: SET NX PX 30000 → OK', 'B: SET NX PX 30000 → FAIL', 'A: 💀 process crashed'], message: 'Server A crashes without releasing the lock. Without a TTL, this would lock everyone out forever — the TTL is what saves us.' },
  { workers: [w('Server A', 'done'), w('Server B', 'holding', 'SET NX PX 30000 → OK')], resourceLabel: '🌐 Redis: lock:invoice-42', resourceState: 'Held by Server B, TTL 30s, fencing token: 2', log: ['A: 💀 crashed', '(30s later) TTL expires, key auto-deleted', 'B: SET NX PX 30000 → OK (token=2)'], message: 'After the TTL expires, the key vanishes and B acquires it with an incrementing fencing token. If A\'s zombie write arrives late (token=1), downstream storage rejects it as stale — the fencing token is what protects correctness even when the lock itself is imperfect.' },
]

interface Pattern {
  id: string
  label: string
  tagline: string
  activeClass: string
  steps: Step[]
}

const PATTERNS: Pattern[] = [
  { id: 'mutex', label: 'Mutex', tagline: 'Exclusive access, one at a time', activeClass: 'bg-rose-600 text-white shadow', steps: mutexSteps },
  { id: 'semaphore', label: 'Semaphore', tagline: 'N permits, capped concurrency', activeClass: 'bg-amber-600 text-white shadow', steps: semaphoreSteps },
  { id: 'rwlock', label: 'Read-Write Lock', tagline: 'Many readers OR one writer', activeClass: 'bg-sky-600 text-white shadow', steps: rwlockSteps },
  { id: 'reentrant', label: 'Reentrant Lock', tagline: 'Same thread can re-acquire', activeClass: 'bg-violet-600 text-white shadow', steps: reentrantSteps },
  { id: 'spinlock', label: 'Spinlock', tagline: 'Busy-wait instead of sleeping', activeClass: 'bg-orange-600 text-white shadow', steps: spinlockSteps },
  { id: 'optimistic', label: 'Optimistic vs Pessimistic', tagline: 'Lock upfront vs check-at-commit', activeClass: 'bg-teal-600 text-white shadow', steps: optimisticSteps },
  { id: 'deadlock', label: 'Deadlock', tagline: 'Circular wait — and the fix', activeClass: 'bg-red-700 text-white shadow', steps: deadlockSteps },
  { id: 'distributed', label: 'Distributed Lock', tagline: 'Locking across separate servers', activeClass: 'bg-indigo-600 text-white shadow', steps: distributedSteps },
]

const STATE_STYLES: Record<WorkerState, string> = {
  idle: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400',
  requesting: 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300',
  blocked: 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300',
  holding: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
  writing: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
  reading: 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300',
  done: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400',
  crashed: 'bg-rose-100 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 text-rose-800 dark:text-rose-300',
}

const STATE_ICON: Record<WorkerState, string> = {
  idle: '·',
  requesting: '❓',
  blocked: '⏸',
  holding: '🔒',
  writing: '✍️',
  reading: '👁',
  done: '✓',
  crashed: '💀',
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// MUTEX — a simple promise-chain lock (single-process JS)
class Mutex {
  #queue = Promise.resolve()
  async acquire() {
    let release
    const ready = new Promise(res => (release = res))
    const prev = this.#queue
    this.#queue = this.#queue.then(() => ready)
    await prev
    return release   // caller invokes this to unlock
  }
}

// SEMAPHORE — cap concurrency at N (e.g. N=2 DB connections)
class Semaphore {
  #permits
  #waiters = []
  constructor(n) { this.#permits = n }
  async acquire() {
    if (this.#permits > 0) { this.#permits--; return }
    await new Promise(res => this.#waiters.push(res))
    this.#permits--
  }
  release() {
    this.#permits++
    this.#waiters.shift()?.()
  }
}

// SPINLOCK — real threads via SharedArrayBuffer + Atomics (Web Workers)
const sab = new SharedArrayBuffer(4)
const flag = new Int32Array(sab)   // 0 = unlocked, 1 = locked
function spinLock() {
  while (Atomics.compareExchange(flag, 0, 0, 1) !== 0) { /* spin */ }
}
function spinUnlock() { Atomics.store(flag, 0, 0) }

// OPTIMISTIC LOCKING — version check on write
async function updateBalance(id, expectedVersion, newBalance) {
  const { rowCount } = await db.query(
    'UPDATE accounts SET balance=$1, version=version+1 WHERE id=$2 AND version=$3',
    [newBalance, id, expectedVersion]
  )
  if (rowCount === 0) throw new Error('Conflict — reload and retry')
}

// DISTRIBUTED LOCK — Redis SET NX PX + fencing token
async function withDistributedLock(redis, key, ttlMs, fn) {
  const token = await redis.incr(\`\${key}:fencing\`)
  const ok = await redis.set(key, token, 'NX', 'PX', ttlMs)
  if (!ok) throw new Error('Lock held elsewhere')
  try { return await fn(token) } finally { await redis.del(key) }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `import threading

# MUTEX
lock = threading.Lock()
with lock:
    balance += 50   # only one thread inside this block at a time

# SEMAPHORE — cap concurrency at N
sem = threading.Semaphore(2)   # e.g. 2 concurrent DB connections
with sem:
    query_database()

# READ-WRITE LOCK — many readers OR one writer (no stdlib RWLock; common recipe)
class ReadWriteLock:
    def __init__(self):
        self._readers = 0
        self._read_lock = threading.Lock()
        self._write_lock = threading.Lock()
    def acquire_read(self):
        with self._read_lock:
            self._readers += 1
            if self._readers == 1:
                self._write_lock.acquire()   # first reader blocks writers
    def release_read(self):
        with self._read_lock:
            self._readers -= 1
            if self._readers == 0:
                self._write_lock.release()   # last reader frees writers

# REENTRANT LOCK — same thread can re-acquire (recursion-safe)
rlock = threading.RLock()
def outer():
    with rlock:
        inner()          # same thread re-enters — no deadlock
def inner():
    with rlock:
        pass

# SPINLOCK — busy-wait instead of blocking (rare in Python; illustrative)
import time
class SpinLock:
    def __init__(self): self._locked = False
    def acquire(self):
        while self._locked:      # busy loop — burns CPU
            time.sleep(0)
        self._locked = True
    def release(self): self._locked = False

# DEADLOCK AVOIDANCE — always acquire locks in the same global order
lock1, lock2 = threading.Lock(), threading.Lock()
def transfer(a_first=True):
    first, second = (lock1, lock2) if a_first else (lock1, lock2)  # consistent order
    with first, second:
        move_funds()

# DISTRIBUTED LOCK — Redis SET NX PX
import redis
r = redis.Redis()
def with_distributed_lock(key, ttl_ms, fn):
    got = r.set(key, "owner-1", nx=True, px=ttl_ms)
    if not got:
        raise RuntimeError("lock held elsewhere")
    try:
        return fn()
    finally:
        r.delete(key)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.concurrent.locks.*;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;

// MUTEX (ReentrantLock is Java's standard mutex — also reentrant by default)
ReentrantLock lock = new ReentrantLock();
lock.lock();
try { balance += 50; } finally { lock.unlock(); }

// SEMAPHORE — cap concurrency at N
Semaphore sem = new Semaphore(2);   // 2 permits
sem.acquire();
try { queryDatabase(); } finally { sem.release(); }

// READ-WRITE LOCK — many readers OR one writer
ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
rw.readLock().lock();
try { readConfig(); } finally { rw.readLock().unlock(); }

rw.writeLock().lock();               // blocks until all readers release
try { writeConfig(); } finally { rw.writeLock().unlock(); }

// REENTRANT LOCK — same thread re-acquiring is safe (hold count tracked)
ReentrantLock rl = new ReentrantLock();
void outer() {
    rl.lock();
    try { inner(); } finally { rl.unlock(); }   // hold count 1 -> 2 -> 1 -> 0
}
void inner() {
    rl.lock();                                   // same thread, succeeds instantly
    try { /* ... */ } finally { rl.unlock(); }
}

// SPINLOCK — compare-and-swap busy loop (AtomicBoolean)
AtomicBoolean locked = new AtomicBoolean(false);
void spinLock() { while (!locked.compareAndSet(false, true)) { /* spin */ } }
void spinUnlock() { locked.set(false); }

// OPTIMISTIC LOCKING — JPA @Version column
@Entity
class Account {
    @Version private long version;   // UPDATE ... WHERE version=? auto-generated
    private long balance;
}   // save() throws OptimisticLockException on version mismatch — caller retries

// DEADLOCK AVOIDANCE — consistent lock ordering by resource ID
void transfer(Account a, Account b, long amount) {
    Account first  = a.getId() < b.getId() ? a : b;   // always lock lower ID first
    Account second = a.getId() < b.getId() ? b : a;
    synchronized (first) {
        synchronized (second) { /* move funds */ }
    }
}`,
  },
]

export default function LockingPatternsVisualizer() {
  const [patternId, setPatternId] = useState(PATTERNS[0].id)
  const pattern = PATTERNS.find(p => p.id === patternId)!
  const ctrl = useSteps(pattern.steps.length)
  const cur = pattern.steps[ctrl.step]

  const selectPattern = (id: string) => {
    setPatternId(id)
    ctrl.reset()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Locking Patterns</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Eight ways to protect shared state — pick a pattern and step through what actually happens</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Why so many kinds of lock?</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A plain mutex is always correct but always serializes. Every other pattern here trades some of that
          safety margin for throughput in a specific situation: N-way concurrency (semaphore), read-heavy access
          (read-write lock), recursive callers (reentrant), sub-microsecond critical sections (spinlock), rare
          conflicts (optimistic), or contenders that aren't even on the same machine (distributed).
        </p>
      </div>

      {/* Pattern picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PATTERNS.map(p => (
          <button
            key={p.id}
            onClick={() => selectPattern(p.id)}
            className={`text-left py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              patternId === p.id
                ? p.activeClass
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="font-semibold">{p.label}</div>
            <div className="opacity-80 text-[10px] mt-0.5">{p.tagline}</div>
          </button>
        ))}
      </div>

      <div className={`viz-container p-6 space-y-4 border-2 transition-all duration-300 ${cur.danger ? 'border-rose-400 dark:border-rose-700' : 'border-transparent'}`}>
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Step {ctrl.step + 1} of {pattern.steps.length}
          </div>
        </div>

        {/* Worker cards */}
        <div className={`grid gap-3 ${cur.workers.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {cur.workers.map(worker => (
            <div key={worker.id} className={`rounded-lg border p-3 min-h-16 transition-all ${STATE_STYLES[worker.state]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{worker.id}</span>
                <span className="text-sm">{STATE_ICON[worker.state]}</span>
              </div>
              <div className="text-xs font-medium">{worker.note ?? worker.state}</div>
            </div>
          ))}
        </div>

        {/* Resource panel */}
        <div className={`rounded-lg border p-3 ${cur.danger ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{cur.resourceLabel}</div>
          <div className={`text-xs font-medium ${cur.danger ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>{cur.resourceState}</div>
        </div>

        {/* Log */}
        {cur.log.length > 0 && (
          <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-3 space-y-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">event log</div>
            {cur.log.map((line, i) => (
              <div key={i} className="text-xs font-mono text-emerald-400">{line}</div>
            ))}
          </div>
        )}

        {/* Message */}
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {cur.message}
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
