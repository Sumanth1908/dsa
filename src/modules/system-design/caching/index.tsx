import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import DoubtsBlock from '@/components/shared/DoubtsBlock'

interface CacheNode { key: string; value: string; freq: number }
interface Step { cache: CacheNode[]; highlight: string | null; evicted: string | null; hit: boolean | null; message: string; dbHit: boolean }

function lruSteps(capacity: number, ops: { type: 'get' | 'put'; key: string; val?: string }[]): Step[] {
  const steps: Step[] = [{ cache: [], highlight: null, evicted: null, hit: null, message: `LRU Cache (capacity=${capacity}). Operations will be simulated.`, dbHit: false }]
  const cache: CacheNode[] = []

  for (const op of ops) {
    if (op.type === 'get') {
      const idx = cache.findIndex(n => n.key === op.key)
      if (idx !== -1) {
        const node = cache.splice(idx, 1)[0]
        node.freq++
        cache.push(node)
        steps.push({ cache: [...cache], highlight: op.key, evicted: null, hit: true, message: `GET "${op.key}" → Cache HIT! Value="${node.value}". Move to MRU position.`, dbHit: false })
      } else {
        steps.push({ cache: [...cache], highlight: op.key, evicted: null, hit: false, message: `GET "${op.key}" → Cache MISS. Fetching from database...`, dbHit: true })
        const val = `val_${op.key}`
        if (cache.length >= capacity) {
          const evicted = cache.shift()!
          steps.push({ cache: [...cache], highlight: null, evicted: evicted.key, hit: false, message: `Cache full! Evict LRU entry "${evicted.key}". Add "${op.key}" to cache.`, dbHit: false })
        }
        cache.push({ key: op.key, value: val, freq: 1 })
        steps.push({ cache: [...cache], highlight: op.key, evicted: null, hit: false, message: `Stored "${op.key}"="${val}" in cache. Now ${cache.length}/${capacity} slots used.`, dbHit: false })
      }
    } else if (op.type === 'put') {
      const idx = cache.findIndex(n => n.key === op.key)
      if (idx !== -1) {
        const node = cache.splice(idx, 1)[0]
        node.value = op.val!
        node.freq++
        cache.push(node)
        steps.push({ cache: [...cache], highlight: op.key, evicted: null, hit: true, message: `PUT "${op.key}"="${op.val}" → Update existing. Move to MRU.`, dbHit: false })
      } else {
        if (cache.length >= capacity) {
          const evicted = cache.shift()!
          steps.push({ cache: [...cache], highlight: null, evicted: evicted.key, hit: null, message: `PUT "${op.key}" — Cache full. Evict LRU: "${evicted.key}"`, dbHit: false })
        }
        cache.push({ key: op.key, value: op.val!, freq: 1 })
        steps.push({ cache: [...cache], highlight: op.key, evicted: null, hit: null, message: `PUT "${op.key}"="${op.val}" inserted. ${cache.length}/${capacity} slots used.`, dbHit: false })
      }
    }
  }
  return steps
}

const OPS: { type: 'get' | 'put'; key: string; val?: string }[] = [
  { type: 'put', key: 'A', val: 'Apple' },
  { type: 'put', key: 'B', val: 'Banana' },
  { type: 'put', key: 'C', val: 'Cherry' },
  { type: 'get', key: 'A' },
  { type: 'put', key: 'D', val: 'Date' },
  { type: 'get', key: 'B' },
  { type: 'get', key: 'E' },
  { type: 'put', key: 'E', val: 'Elderberry' },
  { type: 'get', key: 'C' },
]

const DOUBTS = [
  {
    q: 'Cache-aside vs write-through vs write-back?',
    a: 'Cache-aside: the application reads the cache first; on a miss, it fetches from the database and manually populates the cache — this is the simplest and most common pattern. Write-through: every write passes through the cache into the backing database synchronously, keeping reads always fresh but incurring extra latency from waiting for both the cache and database operations. Write-back (or write-behind): the cache absorbs writes immediately and returns to the caller, then asynchronously flushes to the database, delivering the fastest write response times, but a process crash before flushing causes loss of unflushed changes. Each pattern trades latency against durability and consistency. **Rule of thumb:** cache-aside dominates read-heavy workloads, write-through suits consistency-critical systems, write-back powers high-throughput scenarios that tolerate temporary loss.',
  },
  {
    q: 'Why is cache invalidation famously hard?',
    a: 'The cache and backing store inevitably drift apart whenever either one changes — a property called the "consistency problem." Every strategy — TTL expiration, invalidate-on-write signals, event-driven purges — trades staleness (stale reads) against complexity and operational cost. In practice, edge cases always remain: a forgotten write path that bypasses the invalidation logic, a race condition where a cache entry is invalidated but immediately repopulated before new data arrives, or a distributed system where invalidation messages fail to reach all replicas. There is no free correct answer — only chosen trade-offs between staleness tolerance, latency, and system complexity. **Common mistake:** teams believe they can engineer away the problem entirely; the truth is you manage stale data, never eliminate it.',
  },
  {
    q: 'What is a cache stampede, and the standard defenses?',
    a: 'A cache stampede (also called "thundering herd") occurs when a hot cache key expires and thousands of concurrent requests simultaneously detect the miss and hammer the backend database together, overwhelming it. Classic example: a frequently-accessed user session key expires; suddenly 10,000 web requests all fetch the same missing session from the database at once. Standard defenses include: acquiring a per-key write lock so exactly ONE request recomputes the value while others wait or serve stale data; using jittered TTLs so hot keys expire at different times rather than in lockstep; and early probabilistic refresh, where a background worker refreshes hot keys before they expire. Redis and Memcached deployments commonly combine these: lock contention is serialized but brief, jitter spreads load, and refresh maintains availability. **Rule of thumb:** whenever a key is accessed 100+ times per second, apply at least two defenses.',
  },
  {
    q: 'Why is LRU the default eviction policy?',
    a: 'LRU (Least Recently Used) became the default because it rests on the assumption that recent access predicts future access — an assumption borne out across most real-world workloads (web caches, CDNs, CPUs all validate this empirically). Operationally, LRU achieves O(1) get and put operations using a hashmap paired with a doubly-linked list: the map does O(1) lookups; the linked list maintains recency order. LFU (Least Frequently Used) resists one-off sequential scans better — a single full-table scan won\'t evict your hot keys — but is costlier to maintain and slow to forget keys that were once hot but are now cold. Redis offers both via configuration: LRU is the default and typically sufficient, while LFU suits read patterns where frequency matters more than recency. **Common mistake:** assuming LRU is universally optimal; some workloads (time-series, batch analytics) need different policies.',
  },
]

export default function CachingVisualizer() {
  const [capacity, setCapacity] = useState(3)
  const steps = lruSteps(capacity, OPS)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LRU Cache</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Least Recently Used eviction — implemented with a doubly-linked list + hashmap
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You keep the snacks you reach for most in your desk drawer instead of walking to the shop every time.
          But the drawer is small — so when it's full and you bring something new, out goes whatever you
          haven't touched in the longest time. That's an LRU cache: small, fast, and ruthless about evicting
          the least-recently-used. The clever part below is doing "which snack is oldest?" instantly, without
          rummaging.
        </p>
      </div>

      <MemoryTip>Hashmap finds it, linked list ranks its freshness.</MemoryTip>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">How LRU works</h3>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-xs">
            <li>• Cache hit → move entry to MRU position</li>
            <li>• Cache miss → fetch from DB, insert at MRU</li>
            <li>• Cache full → evict the LRU (leftmost) entry</li>
            <li>• O(1) get/put using HashMap + DLinkedList</li>
          </ul>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Operations to replay</h3>
          <div className="flex flex-wrap gap-1">
            {OPS.map((op, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded font-mono ${
                op.type === 'get' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
              }`}>
                {op.type}({op.key}{op.val ? `, "${op.val}"` : ''})
              </span>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Capacity:</span>
        <input type="number" value={capacity} min={2} max={5} onChange={e => { setCapacity(+e.target.value); ctrl.reset() }}
          className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
      </label>

      <div className="viz-container p-6">
        <div className="flex items-center justify-center gap-4">
          {/* LRU end */}
          <div className="text-xs text-rose-500 font-medium rotate-[-90deg] whitespace-nowrap">LRU (evict)</div>

          {/* Cache slots */}
          <div className="flex gap-2 items-center">
            {Array.from({ length: capacity }).map((_, slot) => {
              const node = cur.cache[slot]
              const isHighlight = node && node.key === cur.highlight
              const isEmpty = !node

              return (
                <div key={slot} className={`w-24 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                  isEmpty
                    ? 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                    : isHighlight
                    ? cur.hit ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}>
                  {node ? (
                    <>
                      <span className={`text-sm font-bold ${isHighlight && cur.hit ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {node.key}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-full px-1">{node.value}</span>
                      <span className="text-xs text-slate-400 mt-1">#{node.freq} use</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">empty</span>
                  )}
                </div>
              )
            })}

            {/* Evicted indicator */}
            {cur.evicted && (
              <div className="flex items-center gap-1 text-xs text-rose-500">
                <span>← evict</span>
                <div className="w-16 h-16 rounded-xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                  <span className="font-bold text-rose-600 dark:text-rose-400">{cur.evicted}</span>
                </div>
              </div>
            )}
          </div>

          {/* MRU end */}
          <div className="text-xs text-emerald-500 font-medium rotate-[90deg] whitespace-nowrap">MRU (recent)</div>
        </div>

        {/* DB indicator */}
        {cur.dbHit && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              🗄️ Database query — cache miss penalty
            </div>
          </div>
        )}

        {/* Hit/Miss indicator */}
        {cur.hit !== null && (
          <div className="mt-2 flex justify-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              cur.hit ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
            }`}>
              {cur.hit ? '✓ Cache HIT' : '✗ Cache MISS'}
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />

      <DoubtsBlock doubts={DOUBTS} />
    </div>
  )
}
