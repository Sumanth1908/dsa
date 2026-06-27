import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'

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
    </div>
  )
}
