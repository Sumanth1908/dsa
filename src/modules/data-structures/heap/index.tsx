import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step { heap: number[]; highlight: number[]; swapping: [number, number] | null; message: string }

function insertSteps(initial: number[], val: number, isMin: boolean): Step[] {
  const heap = [...initial]
  const steps: Step[] = [{ heap: [...heap], highlight: [], swapping: null, message: `Insert ${val} at the end of the heap` }]
  heap.push(val)
  let i = heap.length - 1
  steps.push({ heap: [...heap], highlight: [i], swapping: null, message: `Added ${val} at index ${i}. Begin heapify-up` })

  while (i > 0) {
    const parent = Math.floor((i - 1) / 2)
    const shouldSwap = isMin ? heap[i] < heap[parent] : heap[i] > heap[parent]
    steps.push({ heap: [...heap], highlight: [i, parent], swapping: null, message: `Compare ${heap[i]} with parent ${heap[parent]} at [${parent}]: ${shouldSwap ? 'swap needed' : 'heap property satisfied'}` })
    if (!shouldSwap) break;
    [heap[i], heap[parent]] = [heap[parent], heap[i]]
    steps.push({ heap: [...heap], highlight: [i, parent], swapping: [i, parent], message: `Swap ${heap[parent]} ↔ ${heap[i]}` })
    i = parent
  }
  steps.push({ heap: [...heap], highlight: [], swapping: null, message: `Heapify-up complete. Heap property restored.` })
  return steps
}

function extractSteps(initial: number[], isMin: boolean): Step[] {
  if (initial.length === 0) return [{ heap: [], highlight: [], swapping: null, message: 'Heap is empty' }]
  const heap = [...initial]
  const steps: Step[] = [{ heap: [...heap], highlight: [0], swapping: null, message: `Extract ${isMin ? 'min' : 'max'}: ${heap[0]}` }]
  heap[0] = heap[heap.length - 1]
  heap.pop()
  steps.push({ heap: [...heap], highlight: [0], swapping: null, message: `Move last element to root. Begin heapify-down` })

  let i = 0
  while (true) {
    const l = 2 * i + 1, r = 2 * i + 2
    let target = i
    if (l < heap.length && (isMin ? heap[l] < heap[target] : heap[l] > heap[target])) target = l
    if (r < heap.length && (isMin ? heap[r] < heap[target] : heap[r] > heap[target])) target = r
    if (target === i) break;
    steps.push({ heap: [...heap], highlight: [i, l, r].filter(x => x < heap.length), swapping: null, message: `Compare ${heap[i]} with children. Swap with ${heap[target]}` });
    [heap[i], heap[target]] = [heap[target], heap[i]]
    steps.push({ heap: [...heap], highlight: [i, target], swapping: [i, target], message: `Swapped indices ${i} ↔ ${target}` })
    i = target
  }
  steps.push({ heap: [...heap], highlight: [], swapping: null, message: `Heapify-down complete. ${isMin ? 'Min' : 'Max'}-heap property restored.` })
  return steps
}

function getNodePos(i: number, total: number): { x: number; y: number } {
  const level = Math.floor(Math.log2(i + 1))
  const levelStart = (1 << level) - 1
  const posInLevel = i - levelStart
  const levelCount = 1 << level
  const levelWidth = 560
  const spacing = levelWidth / (levelCount + 1)
  return { x: spacing * (posInLevel + 1) + 20, y: 40 + level * 80 }
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class MinHeap {
  constructor() { this.heap = []; }

  insert(val) { // O(log n)
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() { // O(log n)
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.heap[p] <= this.heap[i]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2*i+1, r = 2*i+2;
      if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `import heapq

# Python's heapq is a min-heap
heap = []

# Insert - O(log n)
heapq.heappush(heap, 10)
heapq.heappush(heap, 5)
heapq.heappush(heap, 20)

# Extract min - O(log n)
minimum = heapq.heappop(heap)  # 5

# Peek min - O(1)
top = heap[0]

# Max heap: negate values
max_heap = []
heapq.heappush(max_heap, -10)
heapq.heappush(max_heap, -5)
maximum = -heapq.heappop(max_heap)  # 10

# Heapify in O(n)
arr = [3, 1, 4, 1, 5, 9]
heapq.heapify(arr)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.PriorityQueue;
import java.util.Collections;

// Min-Heap (default)
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.offer(10); // O(log n)
minHeap.offer(5);
int min = minHeap.poll(); // O(log n) → 5
int peek = minHeap.peek(); // O(1)

// Max-Heap
PriorityQueue<Integer> maxHeap =
    new PriorityQueue<>(Collections.reverseOrder());
maxHeap.offer(10);
maxHeap.offer(20);
int max = maxHeap.poll(); // → 20`,
  },
]

const INITIAL_HEAP = [1, 4, 3, 7, 8, 9, 10]

export default function HeapVisualizer() {
  const [mode, setMode] = useState<'insert' | 'extract'>('insert')
  const [isMin, setIsMin] = useState(true)
  const [insertVal, setInsertVal] = useState(2)

  const steps = mode === 'insert'
    ? insertSteps(INITIAL_HEAP, insertVal, isMin)
    : extractSteps(INITIAL_HEAP, isMin)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const total = cur.heap.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Heap</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Complete binary tree where each parent satisfies the heap property
          </p>
        </div>
        <ComplexityBadge time="O(log n) insert/extract" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>The <strong>heap property</strong>: in a min-heap, every parent is smaller than or equal to both its children — everywhere in the tree, not just one level. This guarantees the root is always the global minimum. A max-heap is the mirror: every parent is larger than both children, root is the global maximum.</p>
        <p>Heaps are stored as plain <strong>arrays</strong> — no pointers. For node at index <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">i</code>: left child = <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">2i+1</code>, right child = <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">2i+2</code>, parent = <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">⌊(i-1)/2⌋</code>. The tree visualizer is just a different way to draw the same flat array — the array IS the heap.</p>
        <p>Insert adds to the end then <strong>bubbles up</strong> (swapping with parent while heap property violated). Extract removes the root, moves the last element there, then <strong>sinks down</strong> (swapping with the smaller child while violated). Both are O(log n) because the tree's height is ⌊log₂ n⌋.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">When to use a heap</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• <strong>Top-K problems</strong> — keep a min-heap of size K while scanning; root is always the Kth largest seen so far</li>
          <li>• <strong>Dijkstra's shortest path</strong> — always process the unvisited node with smallest known distance; heap gives O(log V) per extraction</li>
          <li>• <strong>Merge K sorted lists</strong> — push one element from each list into a min-heap; always extract the global minimum</li>
          <li>• <strong>Task scheduling</strong> — priority queues where highest-priority task is always next (OS schedulers, event loops)</li>
          <li>• <strong>Median of a data stream</strong> — one max-heap for the lower half, one min-heap for the upper half; median is always at one of the roots</li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setIsMin(!isMin)}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-violet-400 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950">
          {isMin ? 'Min-Heap' : 'Max-Heap'}
        </button>
        {(['insert', 'extract'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              mode === m ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {m === 'extract' ? `Extract ${isMin ? 'Min' : 'Max'}` : 'Insert'}
          </button>
        ))}
        {mode === 'insert' && (
          <input type="number" value={insertVal} onChange={e => { setInsertVal(+e.target.value); ctrl.reset() }}
            className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        )}
      </div>

      <div className="viz-container overflow-x-auto">
        <svg width={600} height={Math.ceil(Math.log2(total + 1)) * 80 + 60 || 120} className="block w-full max-w-2xl mx-auto">
          {/* Edges */}
          {cur.heap.map((_, i) => {
            if (i === 0) return null
            const parent = Math.floor((i - 1) / 2)
            const p = getNodePos(parent, total)
            const c = getNodePos(i, total)
            return <line key={i} x1={p.x} y1={p.y} x2={c.x} y2={c.y}
              stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />
          })}
          {/* Nodes */}
          {cur.heap.map((val, i) => {
            const { x, y } = getNodePos(i, total)
            const isSwap = cur.swapping && (cur.swapping[0] === i || cur.swapping[1] === i)
            const isHL = cur.highlight.includes(i)
            return (
              <g key={i} transform={`translate(${x},${y})`}>
                <circle r={24} className={`transition-all duration-300 ${isSwap ? 'fill-rose-500' : isHL ? 'fill-violet-500' : 'fill-slate-200 dark:fill-slate-700'}`} />
                <text textAnchor="middle" dy="0.35em" fontSize={13} fontWeight="600"
                  className={isSwap || isHL ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                  {val}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Array view */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 mb-2">Array representation:</div>
          <div className="flex gap-1 flex-wrap">
            {cur.heap.map((v, i) => (
              <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                cur.highlight.includes(i) ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {v}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{cur.message}</p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
