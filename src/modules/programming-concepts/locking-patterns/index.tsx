import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface BaseStep {
  message: string
  log: string[]
  danger?: boolean
}

// ─── Shared visual atoms ─────────────────────────────────────────────────
function ActorBox({ id, active, waiting, subtitle }: { id: string; active?: boolean; waiting?: boolean; subtitle?: string }) {
  return (
    <div
      className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
        active
          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
          : waiting
          ? 'border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 animate-pulse'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
      }`}
    >
      <span className="text-sm font-bold">{id}</span>
      {subtitle && <span className="text-[9px] text-center px-1 leading-tight">{subtitle}</span>}
    </div>
  )
}

// ─── Mutex ───────────────────────────────────────────────────────────────
interface MutexStep extends BaseStep {
  holder: 'none' | 'A' | 'B'
  waiting: string[]
}

const mutexSteps: MutexStep[] = [
  { holder: 'none', waiting: [], log: [], message: 'Mutex: only ONE worker may hold the lock at a time. A and B both want to update the same bank balance ($100).' },
  { holder: 'A', waiting: [], log: ['A: acquired lock'], message: 'A requests and acquires the lock, then starts updating the balance.' },
  { holder: 'A', waiting: ['B'], log: ['A: acquired lock', 'A: balance 100 → 150'], message: 'B also wants the lock but must wait — the mutex serializes access to the balance.' },
  { holder: 'B', waiting: [], log: ['A: acquired lock', 'A: balance 100 → 150', 'A: released lock', 'B: acquired lock'], message: 'A finishes and releases. B immediately acquires the now-free lock.' },
  { holder: 'none', waiting: [], log: ['A: acquired lock', 'A: balance 100 → 150', 'A: released lock', 'B: acquired lock', 'B: balance 150 → 200', 'B: released lock'], message: 'Both updates applied safely, one at a time. No lost update, no corruption.' },
]

function renderMutex(s: MutexStep) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ActorBox id="A" active={s.holder === 'A'} waiting={s.waiting.includes('A')} />
      <div
        className={`flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 transition-all ${
          s.holder === 'none'
            ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
            : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
        }`}
      >
        <span className="text-2xl">🔑</span>
        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">{s.holder === 'none' ? 'on hook' : `held by ${s.holder}`}</span>
      </div>
      <ActorBox id="B" active={s.holder === 'B'} waiting={s.waiting.includes('B')} />
    </div>
  )
}

// ─── Semaphore ───────────────────────────────────────────────────────────
interface SemaphoreStep extends BaseStep {
  holders: (string | null)[]
  waiting: string[]
}

const semaphoreSteps: SemaphoreStep[] = [
  { holders: [null, null], waiting: [], log: [], message: 'Semaphore(2): up to 2 workers may hold a permit simultaneously — a mutex is just a semaphore(1). Think: a DB connection pool with 2 slots.' },
  { holders: ['A', null], waiting: [], log: ['A: acquired permit'], message: 'A acquires a permit — 1 of 2 slots now in use.' },
  { holders: ['A', 'B'], waiting: [], log: ['A: acquired permit', 'B: acquired permit'], message: 'B also acquires a permit — both slots are now full, and both run concurrently.' },
  { holders: ['A', 'B'], waiting: ['C'], log: ['A: acquired permit', 'B: acquired permit'], message: 'C wants a permit too, but none are free — C blocks until someone releases.' },
  { holders: ['C', 'B'], waiting: [], log: ['A: acquired permit', 'B: acquired permit', 'A: released permit', 'C: acquired permit'], message: 'A releases — C immediately grabs the freed permit. B never had to stop.' },
  { holders: [null, null], waiting: [], log: ['A: acquired permit', 'B: acquired permit', 'A: released permit', 'C: acquired permit', 'B: released permit', 'C: released permit'], message: 'All done. Semaphores cap concurrency at N instead of forcing full serialization — higher throughput than a mutex when N > 1 is safe.' },
]

function renderSemaphore(s: SemaphoreStep) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        {s.holders.map((h, i) => (
          <div
            key={i}
            className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
              h
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600'
            }`}
          >
            <span className="text-lg">🎫</span>
            <span className="text-[10px] font-semibold">{h ?? 'free'}</span>
          </div>
        ))}
      </div>
      {s.waiting.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">waiting</span>
          {s.waiting.map(id => (
            <ActorBox key={id} id={id} waiting />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Read-Write Lock ─────────────────────────────────────────────────────
interface RwLockStep extends BaseStep {
  readers: string[]
  writer: string | null
  waitingWriter: string | null
}

const rwlockSteps: RwLockStep[] = [
  { readers: [], writer: null, waitingWriter: null, log: [], message: 'Read-Write Lock: many readers may hold the lock together, but a writer needs fully exclusive access.' },
  { readers: ['R1'], writer: null, waitingWriter: null, log: ['R1: acquired read lock'], message: 'R1 starts reading the shared config.' },
  { readers: ['R1', 'R2'], writer: null, waitingWriter: null, log: ['R1: acquired read lock', 'R2: acquired read lock'], message: 'R2 reads concurrently too — reads never conflict with other reads, so both proceed in parallel.' },
  { readers: ['R1', 'R2'], writer: null, waitingWriter: 'W', log: ['R1: acquired read lock', 'R2: acquired read lock'], message: 'W wants to write, but must wait until every active reader finishes — a writer can never interleave with reads.' },
  { readers: [], writer: 'W', waitingWriter: null, log: ['R1: acquired read lock', 'R2: acquired read lock', 'R1: released', 'R2: released', 'W: acquired write lock'], message: 'Once both readers release, W gets exclusive access — no reader can see a half-written value.' },
  { readers: [], writer: null, waitingWriter: null, log: ['R1: acquired read lock', 'R2: acquired read lock', 'R1: released', 'R2: released', 'W: acquired write lock', 'W: released write lock'], message: 'Great for read-heavy workloads (e.g. config caches) where reads vastly outnumber writes.' },
]

function renderRwLock(s: RwLockStep) {
  const exclusive = !!s.writer
  return (
    <div className="flex items-center justify-center gap-4">
      <div
        className={`w-48 h-28 rounded-xl border-4 flex items-center justify-center gap-2 flex-wrap p-2 transition-all ${
          exclusive
            ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20'
            : s.readers.length > 0
            ? 'border-sky-300 bg-sky-50 dark:bg-sky-950/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}
      >
        {exclusive && (
          <div className="flex flex-col items-center text-rose-700 dark:text-rose-300">
            <span className="text-xl">✍️</span>
            <span className="text-[10px] font-semibold">{s.writer} (exclusive)</span>
          </div>
        )}
        {!exclusive && s.readers.length === 0 && <span className="text-[10px] text-slate-300 dark:text-slate-600">empty room</span>}
        {!exclusive &&
          s.readers.map(r => (
            <div key={r} className="flex flex-col items-center text-sky-700 dark:text-sky-300">
              <span className="text-lg">👁</span>
              <span className="text-[9px] font-semibold">{r}</span>
            </div>
          ))}
      </div>
      {s.waitingWriter && <ActorBox id={s.waitingWriter} waiting subtitle="door locked" />}
    </div>
  )
}

// ─── Reentrant Lock ──────────────────────────────────────────────────────
interface ReentrantStep extends BaseStep {
  frames: string[]
  holdCount: number
}

const reentrantSteps: ReentrantStep[] = [
  { frames: [], holdCount: 0, log: [], message: 'Reentrant Lock: the SAME thread can re-acquire a lock it already holds — essential for recursive functions.' },
  { frames: ['outer()'], holdCount: 1, log: ['A: outer() acquires lock'], message: 'A calls outer(), which acquires the lock to update shared state.' },
  { frames: ['outer()', 'inner()'], holdCount: 2, log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock'], message: 'outer() calls inner(), which acquires the SAME lock again. Because A already owns it, this succeeds instantly — a non-reentrant lock would deadlock here (A waiting on itself)!' },
  { frames: ['outer()'], holdCount: 1, log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock', 'A: inner() releases'], message: 'inner() returns and releases once — but the lock is still held (count dropped from 2 to 1), because outer() still needs it.' },
  { frames: [], holdCount: 0, log: ['A: outer() acquires lock', 'A: inner() re-acquires SAME lock', 'A: inner() releases', 'A: outer() releases'], message: 'outer() returns and does the final release. The lock is only truly free once the hold count reaches 0.' },
]

function renderReentrant(s: ReentrantStep) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col-reverse gap-1 min-h-[110px] justify-start">
        {s.frames.length === 0 && <div className="text-xs text-slate-300 dark:text-slate-600 self-center">no active call frames</div>}
        {s.frames.map((f, i) => (
          <div
            key={i}
            className="w-40 rounded-lg border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 text-xs font-medium text-center py-2"
          >
            {f}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">hold count: {s.holdCount}</div>
    </div>
  )
}

// ─── Spinlock ────────────────────────────────────────────────────────────
interface SpinlockStep extends BaseStep {
  holder: string | null
  spinning: string | null
  spins: number
}

const spinlockSteps: SpinlockStep[] = [
  { holder: null, spinning: null, spins: 0, log: [], message: 'Spinlock: instead of sleeping, a waiting thread "spins" in a tight loop, repeatedly re-checking the lock.' },
  { holder: 'A', spinning: null, spins: 0, log: ['A: acquired (CAS succeeded)'], message: 'A grabs the lock via an atomic compare-and-swap and enters a very short critical section.' },
  { holder: 'A', spinning: 'B', spins: 3, log: ['A: acquired (CAS succeeded)', 'B: CAS failed, retry', 'B: CAS failed, retry', 'B: CAS failed, retry'], message: "B doesn't sleep — it keeps retrying the CAS in a hot loop. Wastes CPU cycles, but avoids the cost of an OS context switch." },
  { holder: 'B', spinning: null, spins: 3, log: ['A: acquired (CAS succeeded)', 'B: CAS failed, retry ×3', 'A: released', 'B: CAS succeeded'], message: "The instant A releases, B's very next spin succeeds — near-zero hand-off latency, no scheduler involved." },
  { holder: null, spinning: null, spins: 3, log: ['A: acquired', 'B: spun ×3', 'A: released', 'B: acquired', 'B: released'], message: 'Rule of thumb: spin only if the critical section is shorter than a context switch (~1-10µs). Otherwise use a blocking lock that sleeps the waiter and frees the CPU for real work.' },
]

function renderSpinlock(s: SpinlockStep) {
  return (
    <div className="flex items-center justify-center gap-6">
      <ActorBox id="A" active={s.holder === 'A'} waiting={s.spinning === 'A'} />
      <div className="flex flex-col items-center gap-1 w-20">
        <span className={`text-3xl ${s.spinning ? 'animate-spin' : ''}`}>🌀</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">{s.spinning ? `spins: ${s.spins}` : s.holder ? 'settled' : 'idle'}</span>
      </div>
      <ActorBox id="B" active={s.holder === 'B'} waiting={s.spinning === 'B'} />
    </div>
  )
}

// ─── Optimistic vs Pessimistic Locking ──────────────────────────────────
type StrategyState = 'idle' | 'holding' | 'waiting' | 'reading' | 'writing' | 'done' | 'conflict'

interface StrategyStep extends BaseStep {
  strategy: 'pessimistic' | 'optimistic'
  version: number
  a: { state: StrategyState; note?: string }
  b: { state: StrategyState; note?: string }
}

const STRATEGY_STATE_CLASS: Record<StrategyState, string> = {
  idle: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400',
  holding: 'border-rose-400 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
  waiting: 'border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 animate-pulse',
  reading: 'border-sky-300 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300',
  writing: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
  done: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400',
  conflict: 'border-rose-500 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
}

const optimisticSteps: StrategyStep[] = [
  { strategy: 'pessimistic', version: 1, a: { state: 'idle' }, b: { state: 'idle' }, log: [], message: "Two strategies for a shared DB row. Pessimistic: lock BEFORE touching data. Optimistic: don't lock — check the version at commit time instead." },
  { strategy: 'pessimistic', version: 1, a: { state: 'holding', note: 'SELECT...FOR UPDATE' }, b: { state: 'waiting', note: 'waiting for row lock' }, log: ['A: SELECT ... FOR UPDATE'], message: "PESSIMISTIC: A locks the row immediately. B can't even read-for-update until A commits — safe, but serializes everyone, even when conflicts would be rare." },
  { strategy: 'pessimistic', version: 1, a: { state: 'done' }, b: { state: 'holding', note: 'row lock granted' }, log: ['A: SELECT ... FOR UPDATE', 'A: UPDATE + COMMIT', 'B: row lock granted'], message: 'Only after A commits and releases does B get its turn. Zero wasted work, but throughput is capped by lock contention.' },
  { strategy: 'optimistic', version: 1, a: { state: 'reading', note: 'reads version=1' }, b: { state: 'reading', note: 'reads version=1' }, log: [], message: 'OPTIMISTIC: A and B both read the row (version=1) with no lock at all — maximum concurrency.' },
  { strategy: 'optimistic', version: 2, a: { state: 'writing', note: 'UPDATE WHERE version=1' }, b: { state: 'reading' }, log: ['A: UPDATE WHERE version=1 → 1 row affected', 'A: version 1 → 2'], message: 'A commits first: "update WHERE version=1" matches, so it succeeds and bumps the version to 2.' },
  { strategy: 'optimistic', version: 2, a: { state: 'done' }, b: { state: 'conflict', note: '0 rows affected' }, danger: true, log: ['A: UPDATE WHERE version=1 → 1 row affected', 'A: version 1 → 2', 'B: UPDATE WHERE version=1 → 0 rows affected (stale!)'], message: "B's \"WHERE version=1\" now matches nothing (it's 2) — 0 rows affected. B detects the conflict and must re-read + retry. Cheap when conflicts are rare, wasteful when they're not." },
]

function renderStrategy(s: StrategyStep) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
            s.strategy === 'pessimistic'
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              : 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
          }`}
        >
          {s.strategy === 'pessimistic' ? '🔒 Pessimistic — lock upfront' : '📄 Optimistic — check at commit'}
        </span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <div className={`w-20 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${STRATEGY_STATE_CLASS[s.a.state]}`}>
          <span className="text-xs font-bold">A</span>
          <span className="text-[9px] text-center px-1 leading-tight">{s.a.note ?? s.a.state}</span>
        </div>
        <div className="w-24 h-16 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center">
          <span className="text-[9px] text-slate-400">row: balance</span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">version: {s.version}</span>
        </div>
        <div className={`w-20 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${STRATEGY_STATE_CLASS[s.b.state]}`}>
          <span className="text-xs font-bold">B</span>
          <span className="text-[9px] text-center px-1 leading-tight">{s.b.note ?? s.b.state}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Deadlock ────────────────────────────────────────────────────────────
interface DeadlockStep extends BaseStep {
  edges: { from: string; to: string; kind: 'holds' | 'wants' }[]
  cyclic?: boolean
}

const deadlockSteps: DeadlockStep[] = [
  { edges: [], cyclic: false, log: [], message: 'Deadlock: two threads each hold a lock the other one needs — a circular wait with no way out.' },
  { edges: [{ from: 'Lock1', to: 'A', kind: 'holds' }, { from: 'Lock2', to: 'B', kind: 'holds' }], cyclic: false, log: ['A: acquired Lock1', 'B: acquired Lock2'], message: 'A acquires Lock1. Simultaneously, B acquires Lock2 — different threads, different order.' },
  { edges: [{ from: 'Lock1', to: 'A', kind: 'holds' }, { from: 'Lock2', to: 'B', kind: 'holds' }, { from: 'A', to: 'Lock2', kind: 'wants' }, { from: 'B', to: 'Lock1', kind: 'wants' }], cyclic: true, danger: true, log: ['A: acquired Lock1', 'B: acquired Lock2', 'A: requests Lock2 → BLOCKED', 'B: requests Lock1 → BLOCKED'], message: 'A now wants Lock2 (held by B) and B wants Lock1 (held by A). Neither will ever release — the program hangs forever.' },
  { edges: [], cyclic: false, log: [], message: 'THE FIX — lock ordering: every thread must acquire locks in the same global order (e.g., always Lock1 before Lock2). This makes the circular wait structurally impossible.' },
  { edges: [{ from: 'Lock1', to: 'A', kind: 'holds' }, { from: 'Lock2', to: 'A', kind: 'holds' }, { from: 'B', to: 'Lock1', kind: 'wants' }], cyclic: false, log: ['A: acquired Lock1', 'A: acquired Lock2 (same order)', 'B: requests Lock1 → waits (not a deadlock, just a queue)'], message: 'B also wants Lock1-then-Lock2, so it simply queues behind A instead of forming a cycle. No deadlock — just a normal wait.' },
]

const DEADLOCK_NODE_POS: Record<string, { x: number; y: number }> = {
  A: { x: 10, y: 20 },
  Lock1: { x: 220, y: 20 },
  B: { x: 10, y: 168 },
  Lock2: { x: 220, y: 168 },
}
const deadlockNodeCenter = (id: string) => ({ x: DEADLOCK_NODE_POS[id].x + 32, y: DEADLOCK_NODE_POS[id].y + 18 })

function renderDeadlock(s: DeadlockStep) {
  return (
    <svg viewBox="0 0 300 224" className="w-full max-w-sm mx-auto">
      <defs>
        <marker id="dl-holds" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-emerald-400" />
        </marker>
        <marker id="dl-wants" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className={s.cyclic ? 'fill-rose-500' : 'fill-amber-400'} />
        </marker>
      </defs>
      {s.edges.map((e, i) => {
        const from = deadlockNodeCenter(e.from)
        const to = deadlockNodeCenter(e.to)
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className={e.kind === 'holds' ? 'stroke-emerald-400' : s.cyclic ? 'stroke-rose-500' : 'stroke-amber-400'}
            strokeWidth={2}
            strokeDasharray={e.kind === 'wants' ? '5,4' : undefined}
            markerEnd={`url(#dl-${e.kind})`}
          />
        )
      })}
      {Object.entries(DEADLOCK_NODE_POS).map(([id, pos]) => (
        <g key={id}>
          <rect
            x={pos.x}
            y={pos.y}
            width={64}
            height={36}
            rx={8}
            className={
              id.startsWith('Lock')
                ? 'fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600'
                : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-500'
            }
            strokeWidth={2}
          />
          <text x={pos.x + 32} y={pos.y + 22} textAnchor="middle" className="text-[10px] font-semibold fill-slate-700 dark:fill-slate-200">
            {id}
          </text>
        </g>
      ))}
      {s.cyclic && (
        <text x="150" y="212" textAnchor="middle" className="text-xs font-bold fill-rose-600 dark:fill-rose-400">
          💀 circular wait
        </text>
      )}
    </svg>
  )
}

// ─── Distributed Lock ────────────────────────────────────────────────────
type ServerState = 'idle' | 'trying' | 'holding' | 'blocked' | 'crashed'

interface DistributedStep extends BaseStep {
  servers: { id: string; state: ServerState; note?: string }[]
  store: { present: boolean; owner?: string; ttl?: string; token?: number }
}

const distributedSteps: DistributedStep[] = [
  { servers: [{ id: 'Server A', state: 'idle' }, { id: 'Server B', state: 'idle' }], store: { present: false }, log: [], message: 'Distributed Lock: when the contenders are separate processes/servers, an in-process mutex is useless — the lock must live in a shared store (Redis, ZooKeeper, etcd) with a TTL.' },
  { servers: [{ id: 'Server A', state: 'holding', note: 'SET NX PX 30000 → OK' }, { id: 'Server B', state: 'idle' }], store: { present: true, owner: 'A', ttl: '30s' }, log: ['A: SET NX PX 30000 → OK'], message: "Server A sets the key only if it doesn't exist (NX), with a 30s auto-expiry (PX) — this is the distributed lock." },
  { servers: [{ id: 'Server A', state: 'holding' }, { id: 'Server B', state: 'blocked', note: 'SET NX failed, retrying' }], store: { present: true, owner: 'A', ttl: '30s' }, log: ['A: SET NX PX 30000 → OK', 'B: SET NX PX 30000 → FAIL (key exists)'], message: 'Server B tries the same SET NX — it fails because the key already exists, so B backs off and retries later.' },
  { servers: [{ id: 'Server A', state: 'crashed', note: 'crashed mid-task' }, { id: 'Server B', state: 'blocked' }], store: { present: true, owner: 'A (stale)', ttl: 'expiring…' }, danger: true, log: ['A: SET NX PX 30000 → OK', 'B: SET NX PX 30000 → FAIL', 'A: 💀 process crashed'], message: 'Server A crashes without releasing the lock. Without a TTL, this would lock everyone out forever — the TTL is what saves us.' },
  { servers: [{ id: 'Server A', state: 'idle', note: 'crashed, gone' }, { id: 'Server B', state: 'holding', note: 'SET NX PX 30000 → OK' }], store: { present: true, owner: 'B', ttl: '30s', token: 2 }, log: ['A: 💀 crashed', '(30s later) TTL expires, key auto-deleted', 'B: SET NX PX 30000 → OK (token=2)'], message: "After the TTL expires, the key vanishes and B acquires it with an incrementing fencing token. If A's zombie write arrives late (token=1), downstream storage rejects it as stale — the fencing token is what protects correctness even when the lock itself is imperfect." },
]

function distributedServerClass(state: ServerState) {
  switch (state) {
    case 'holding':
      return 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
    case 'crashed':
      return 'border-rose-500 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
    case 'blocked':
      return 'border-amber-300 border-dashed bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 animate-pulse'
    default:
      return 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
  }
}

function renderDistributed(s: DistributedStep) {
  const [s1, s2] = s.servers
  const box = (srv: DistributedStep['servers'][number]) => (
    <div className={`w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${distributedServerClass(srv.state)}`}>
      <span className="text-[10px] font-bold">{srv.id}</span>
      <span className="text-[9px] text-center px-1 leading-tight">{srv.note ?? srv.state}</span>
    </div>
  )
  return (
    <div className="flex items-center justify-center gap-3">
      {box(s1)}
      <span className="text-slate-300 dark:text-slate-600 text-lg">⇄</span>
      <div
        className={`w-28 h-24 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
          s.store.present
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
        }`}
      >
        <span className="text-[9px] uppercase tracking-wider">Redis key</span>
        <span className="text-[10px] font-semibold text-center px-1">{s.store.present ? `owner: ${s.store.owner}` : 'absent'}</span>
        {s.store.ttl && <span className="text-[9px]">TTL {s.store.ttl}</span>}
        {s.store.token != null && <span className="text-[9px]">token: {s.store.token}</span>}
      </div>
      <span className="text-slate-300 dark:text-slate-600 text-lg">⇄</span>
      {box(s2)}
    </div>
  )
}

// ─── Pattern registry ────────────────────────────────────────────────────
interface Pattern {
  id: string
  label: string
  tagline: string
  activeClass: string
  story: string
  icon: string
  steps: BaseStep[]
  render: (step: any) => React.ReactNode
}

const PATTERNS: Pattern[] = [
  {
    id: 'mutex', label: 'Mutex', tagline: 'Exclusive access, one at a time', activeClass: 'bg-rose-600 text-white shadow', icon: '🔒',
    story: 'A petrol station has one bathroom and one key hanging at the counter. Take the key, use the bathroom, hang it back — whoever finds the hook empty simply waits. Below, A and B are two cashiers who both need to update the same $100 cash-drawer count. The key guarantees they take turns, so no count ever goes missing.',
    steps: mutexSteps, render: renderMutex,
  },
  {
    id: 'semaphore', label: 'Semaphore', tagline: 'N permits, capped concurrency', activeClass: 'bg-amber-600 text-white shadow', icon: '🎟️',
    story: 'A tiny car park has 2 spaces and a barrier that counts: it lifts while spaces remain and stays down once both are taken — the third car waits until somebody drives out. Below, three workers share 2 permits. It\'s the bathroom key again, except there are two keys on the hook.',
    steps: semaphoreSteps, render: renderSemaphore,
  },
  {
    id: 'rwlock', label: 'Read-Write Lock', tagline: 'Many readers OR one writer', activeClass: 'bg-sky-600 text-white shadow', icon: '📖',
    story: 'A museum lets any number of visitors admire a painting at the same time — looking never hurts. But when the restorer arrives with her brushes, the room is emptied and the door locked until she\'s done: nobody should see a painting half-repainted. Below, R1 and R2 are visitors, W is the restorer.',
    steps: rwlockSteps, render: renderRwLock,
  },
  {
    id: 'reentrant', label: 'Reentrant Lock', tagline: 'Same thread can re-acquire', activeClass: 'bg-violet-600 text-white shadow', icon: '🔁',
    story: 'You lock your bedroom door from the inside. Opening your own wardrobe inside that room shouldn\'t lock you out — it\'s YOUR lock, you\'re already in. A reentrant lock keeps a tally instead of a yes/no: you locked twice (room, then wardrobe), so you must unlock twice on the way out before anyone else may enter.',
    steps: reentrantSteps, render: renderReentrant,
  },
  {
    id: 'spinlock', label: 'Spinlock', tagline: 'Busy-wait instead of sleeping', activeClass: 'bg-orange-600 text-white shadow', icon: '🌀',
    story: 'The office bathroom is occupied. Do you walk back to your desk and ask a colleague to call you when it\'s free (a normal lock — the waiter sleeps)? Or stand at the door trying the handle every second (a spinlock)? Standing there wastes your time, but if the occupant is quick, you\'re in the moment they leave — faster than the walk back.',
    steps: spinlockSteps, render: renderSpinlock,
  },
  {
    id: 'optimistic', label: 'Optimistic vs Pessimistic', tagline: 'Lock upfront vs check-at-commit', activeClass: 'bg-teal-600 text-white shadow', icon: '💾',
    story: 'Two colleagues must edit the same paper report. Pessimistic plan: take the only folder off the shelf so the other has to wait — safe, slow. Optimistic plan: both photocopy it and edit freely; whoever returns second notices the original changed since their copy, throws away their edits, and redoes them. Below, both plans play out on the same bank row.',
    steps: optimisticSteps, render: renderStrategy,
  },
  {
    id: 'deadlock', label: 'Deadlock', tagline: 'Circular wait — and the fix', activeClass: 'bg-red-700 text-white shadow', icon: '🔗',
    story: 'Two chefs, one salt shaker, one pepper grinder. Chef A grabs the salt and reaches for the pepper; chef B grabbed the pepper and is reaching for the salt. Both stand frozen, politely waiting forever — dinner never gets cooked. The fix is a house rule: everyone always picks up the salt FIRST. Then nobody can ever be holding what the other needs.',
    steps: deadlockSteps, render: renderDeadlock,
  },
  {
    id: 'distributed', label: 'Distributed Lock', tagline: 'Locking across separate servers', activeClass: 'bg-indigo-600 text-white shadow', icon: '🌐',
    story: 'Two hotel receptionists in different buildings must not both sell the last penthouse night. No door key can help — they never touch the same door. Instead they share a booking board both can see: "penthouse: taken until 3pm". And the note must expire on its own, because if a receptionist goes home sick without erasing it, the room would stay blocked forever.',
    steps: distributedSteps, render: renderDistributed,
  },
]

interface CodeExample {
  lang: 'javascript' | 'python' | 'java'
  label: string
  code: string
}

const CODE_EXAMPLES: Record<string, CodeExample[]> = {
  mutex: [
    {
      lang: 'javascript', label: 'JavaScript',
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

const mutex = new Mutex()
async function updateBalance(amount) {
  const release = await mutex.acquire()
  try {
    balance += amount   // only one caller in here at a time
  } finally {
    release()
  }
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import threading

lock = threading.Lock()

def update_balance(amount):
    global balance
    with lock:
        balance += amount   # only one thread inside this block at a time`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import java.util.concurrent.locks.ReentrantLock;

// ReentrantLock is Java's standard mutex (and is reentrant by default)
ReentrantLock lock = new ReentrantLock();

void updateBalance(int amount) {
    lock.lock();
    try {
        balance += amount;
    } finally {
        lock.unlock();
    }
}`,
    },
  ],
  semaphore: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// SEMAPHORE — cap concurrency at N (e.g. N=2 DB connections)
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

const pool = new Semaphore(2)
async function queryDatabase() {
  await pool.acquire()
  try {
    return await db.query('...')
  } finally {
    pool.release()
  }
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import threading

sem = threading.Semaphore(2)   # e.g. 2 concurrent DB connections

def query_database():
    with sem:
        return db.query('...')`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import java.util.concurrent.Semaphore;

Semaphore sem = new Semaphore(2);   // 2 permits

void queryDatabase() throws InterruptedException {
    sem.acquire();
    try {
        db.query("...");
    } finally {
        sem.release();
    }
}`,
    },
  ],
  rwlock: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// READ-WRITE LOCK — many readers OR one writer (simple recipe; no stdlib RWLock in JS)
class ReadWriteLock {
  #readers = 0
  #writing = false
  #waiters = []
  async acquireRead() {
    while (this.#writing) await new Promise(res => this.#waiters.push(res))
    this.#readers++
  }
  releaseRead() {
    this.#readers--
    if (this.#readers === 0) this.#waiters.shift()?.()
  }
  async acquireWrite() {
    while (this.#writing || this.#readers > 0) await new Promise(res => this.#waiters.push(res))
    this.#writing = true
  }
  releaseWrite() {
    this.#writing = false
    this.#waiters.splice(0).forEach(w => w())
  }
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import threading

# no stdlib RWLock — this is the common recipe
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

    def acquire_write(self):
        self._write_lock.acquire()

    def release_write(self):
        self._write_lock.release()`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import java.util.concurrent.locks.ReentrantReadWriteLock;

ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

void readConfig() {
    rw.readLock().lock();
    try {
        // many readers run here together
    } finally {
        rw.readLock().unlock();
    }
}

void writeConfig() {
    rw.writeLock().lock();               // blocks until all readers release
    try {
        // exclusive access
    } finally {
        rw.writeLock().unlock();
    }
}`,
    },
  ],
  reentrant: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// REENTRANT LOCK — same "owner" can re-acquire without deadlocking itself
class ReentrantLock {
  #owner = null
  #count = 0
  acquire(owner) {
    if (this.#owner === owner) { this.#count++; return }   // same owner: just bump count
    this.#owner = owner
    this.#count = 1
  }
  release(owner) {
    if (this.#owner !== owner) throw new Error('not the owner')
    if (--this.#count === 0) this.#owner = null
  }
}

const lock = new ReentrantLock()
function outer() {
  lock.acquire('A')
  inner()              // same owner re-enters — no deadlock
  lock.release('A')
}
function inner() {
  lock.acquire('A')
  lock.release('A')
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import threading

rlock = threading.RLock()

def outer():
    with rlock:
        inner()          # same thread re-enters — no deadlock

def inner():
    with rlock:
        pass`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import java.util.concurrent.locks.ReentrantLock;

ReentrantLock rl = new ReentrantLock();

void outer() {
    rl.lock();
    try {
        inner();               // same thread, succeeds instantly
    } finally {
        rl.unlock();           // hold count 1 -> 2 -> 1 -> 0
    }
}
void inner() {
    rl.lock();
    try { /* ... */ } finally { rl.unlock(); }
}`,
    },
  ],
  spinlock: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// SPINLOCK — real threads via SharedArrayBuffer + Atomics (Web Workers)
const sab = new SharedArrayBuffer(4)
const flag = new Int32Array(sab)   // 0 = unlocked, 1 = locked

function spinLock() {
  while (Atomics.compareExchange(flag, 0, 0, 1) !== 0) { /* spin */ }
}
function spinUnlock() {
  Atomics.store(flag, 0, 0)
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import time

# busy-wait instead of blocking (rare in Python; illustrative)
class SpinLock:
    def __init__(self):
        self._locked = False

    def acquire(self):
        while self._locked:      # busy loop — burns CPU
            time.sleep(0)
        self._locked = True

    def release(self):
        self._locked = False`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import java.util.concurrent.atomic.AtomicBoolean;

// compare-and-swap busy loop
AtomicBoolean locked = new AtomicBoolean(false);

void spinLock() {
    while (!locked.compareAndSet(false, true)) { /* spin */ }
}
void spinUnlock() {
    locked.set(false);
}`,
    },
  ],
  optimistic: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// PESSIMISTIC — lock the row before touching it
async function transferPessimistic(id, delta) {
  await db.query('SELECT * FROM accounts WHERE id=$1 FOR UPDATE', [id])
  await db.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [delta, id])
}

// OPTIMISTIC — no lock; check the version at commit time
async function transferOptimistic(id, expectedVersion, newBalance) {
  const { rowCount } = await db.query(
    'UPDATE accounts SET balance=$1, version=version+1 WHERE id=$2 AND version=$3',
    [newBalance, id, expectedVersion]
  )
  if (rowCount === 0) throw new Error('Conflict — reload and retry')
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `# PESSIMISTIC — lock the row before touching it
def transfer_pessimistic(conn, id, delta):
    conn.execute("SELECT * FROM accounts WHERE id=%s FOR UPDATE", [id])
    conn.execute("UPDATE accounts SET balance = balance + %s WHERE id=%s", [delta, id])

# OPTIMISTIC — no lock; check the version at commit time
def transfer_optimistic(conn, id, expected_version, new_balance):
    cur = conn.execute(
        "UPDATE accounts SET balance=%s, version=version+1 WHERE id=%s AND version=%s",
        [new_balance, id, expected_version],
    )
    if cur.rowcount == 0:
        raise RuntimeError("Conflict — reload and retry")`,
    },
    {
      lang: 'java', label: 'Java',
      code: `// PESSIMISTIC — SELECT ... FOR UPDATE locks the row
@Transactional
Account loadForUpdate(long id) {
    return em.find(Account.class, id, LockModeType.PESSIMISTIC_WRITE);
}

// OPTIMISTIC — JPA @Version column checked automatically on save
@Entity
class Account {
    @Version private long version;   // UPDATE ... WHERE version=? auto-generated
    private long balance;
}   // save() throws OptimisticLockException on version mismatch — caller retries`,
    },
  ],
  deadlock: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// DEADLOCK-PRONE — order depends on argument order (BAD)
async function transferBad(lockA, lockB, move) {
  const relA = await lockA.acquire()
  const relB = await lockB.acquire()   // if another call acquires B then A, this hangs
  try { move() } finally { relB(); relA() }
}

// FIX — always acquire locks in the same global order (e.g. by id)
async function transferSafe(accA, accB, move) {
  const [first, second] = accA.id < accB.id ? [accA, accB] : [accB, accA]
  const relFirst = await first.lock.acquire()
  const relSecond = await second.lock.acquire()
  try { move() } finally { relSecond(); relFirst() }
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import threading

# DEADLOCK-PRONE — order depends on argument order (BAD)
def transfer_bad(lock_a, lock_b, move):
    with lock_a:
        with lock_b:      # if another call locks b then a, this hangs
            move()

# FIX — always acquire locks in the same global order
lock1, lock2 = threading.Lock(), threading.Lock()

def transfer_safe(move):
    with lock1, lock2:    # every caller uses this exact order
        move()`,
    },
    {
      lang: 'java', label: 'Java',
      code: `// FIX — consistent lock ordering by resource ID prevents circular wait
void transfer(Account a, Account b, long amount) {
    Account first  = a.getId() < b.getId() ? a : b;   // always lock lower ID first
    Account second = a.getId() < b.getId() ? b : a;
    synchronized (first) {
        synchronized (second) {
            move(a, b, amount);
        }
    }
}`,
    },
  ],
  distributed: [
    {
      lang: 'javascript', label: 'JavaScript',
      code: `// DISTRIBUTED LOCK — Redis SET NX PX + fencing token
async function withDistributedLock(redis, key, ttlMs, fn) {
  const token = await redis.incr(\`\${key}:fencing\`)
  const ok = await redis.set(key, token, 'NX', 'PX', ttlMs)
  if (!ok) throw new Error('Lock held elsewhere')
  try {
    return await fn(token)
  } finally {
    await redis.del(key)
  }
}`,
    },
    {
      lang: 'python', label: 'Python',
      code: `import redis
r = redis.Redis()

def with_distributed_lock(key, ttl_ms, fn):
    token = r.incr(f"{key}:fencing")
    got = r.set(key, token, nx=True, px=ttl_ms)
    if not got:
        raise RuntimeError("lock held elsewhere")
    try:
        return fn(token)
    finally:
        r.delete(key)`,
    },
    {
      lang: 'java', label: 'Java',
      code: `import redis.clients.jedis.Jedis;
import redis.clients.jedis.params.SetParams;

Jedis jedis = new Jedis("localhost");

<T> T withDistributedLock(String key, long ttlMs, Function<Long, T> fn) {
    long token = jedis.incr(key + ":fencing");
    String ok = jedis.set(key, String.valueOf(token), SetParams.setParams().nx().px(ttlMs));
    if (ok == null) throw new IllegalStateException("lock held elsewhere");
    try {
        return fn.apply(token);
    } finally {
        jedis.del(key);
    }
}`,
    },
  ],
}

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
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You share a flat with three roommates and there's one bathroom. The unspoken rule — "if the door's
          locked, wait your turn" — is the entire idea of locking. Whenever several people (threads, servers)
          share one thing (a variable, a database row, a file), you need rules for who gets it, who waits, and
          what happens if someone forgets to unlock. Every pattern below is that same bathroom rule, tuned for a
          different situation.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Why so many kinds of lock?</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          A plain mutex is always correct but always serializes. Every other pattern here trades some of that
          safety margin for throughput in a specific situation: N-way concurrency (semaphore), read-heavy access
          (read-write lock), recursive callers (reentrant), sub-microsecond critical sections (spinlock), rare
          conflicts (optimistic), or contenders that aren't even on the same machine (distributed). Each one below
          has its own diagram — a mutex hands a single key around, a semaphore fills numbered slots, a deadlock
          draws itself as a cycle of arrows — because the mechanics genuinely differ, not just the label.
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
            <div className="font-semibold">{p.icon} {p.label}</div>
            <div className="opacity-80 text-[10px] mt-0.5">{p.tagline}</div>
          </button>
        ))}
      </div>

      {/* Story for the selected pattern */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">📖 {pattern.label} — The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">{pattern.story}</p>
      </div>

      <div className={`viz-container p-6 space-y-4 border-2 transition-all duration-300 ${cur.danger ? 'border-rose-400 dark:border-rose-700' : 'border-transparent'}`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{pattern.icon} {pattern.label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Step {ctrl.step + 1} of {pattern.steps.length}
          </div>
        </div>

        {/* Pattern-specific visualization */}
        <div className="py-2">{pattern.render(cur)}</div>

        {/* Log */}
        {cur.log.length > 0 && (
          <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-3 space-y-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">event log</div>
            {cur.log.map((line: string, i: number) => (
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
      <CodeBlock examples={CODE_EXAMPLES[pattern.id]} />
    </div>
  )
}
