import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

type Problem = 'top-k-largest' | 'k-closest' | 'k-frequent'

// ── Top K Largest — min-heap of size k ───────────────────────────────────────
interface HeapStep {
  heap: number[]
  processed: number[]
  current: number | null
  action: 'init' | 'push' | 'pop' | 'skip' | 'done'
  message: string
  k: number
  nums: number[]
}

function heapifyDown(arr: number[], i: number, size: number) {
  while (true) {
    let smallest = i
    const l = 2 * i + 1, r = 2 * i + 2
    if (l < size && arr[l] < arr[smallest]) smallest = l
    if (r < size && arr[r] < arr[smallest]) smallest = r
    if (smallest === i) break
    ;[arr[i], arr[smallest]] = [arr[smallest], arr[i]]
    i = smallest
  }
}

function heapifyUp(arr: number[], i: number) {
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2)
    if (arr[parent] <= arr[i]) break
    ;[arr[i], arr[parent]] = [arr[parent], arr[i]]
    i = parent
  }
}

function topKSteps(nums: number[], k: number): HeapStep[] {
  const steps: HeapStep[] = []
  const heap: number[] = []

  steps.push({ heap: [], processed: [], current: null, action: 'init', message: `Find top ${k} largest from [${nums}] using a min-heap of size ${k}.`, k, nums })

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i]
    if (heap.length < k) {
      heap.push(n)
      heapifyUp(heap, heap.length - 1)
      steps.push({ heap: [...heap], processed: nums.slice(0, i + 1), current: n, action: 'push', message: `Heap not full (${heap.length}/${k}): push ${n}. Min-heap root = ${heap[0]}.`, k, nums })
    } else if (n > heap[0]) {
      const evicted = heap[0]
      heap[0] = n
      heapifyDown(heap, 0, heap.length)
      steps.push({ heap: [...heap], processed: nums.slice(0, i + 1), current: n, action: 'pop', message: `${n} > heap root ${evicted}: replace root with ${n}, heapify down. New root = ${heap[0]}.`, k, nums })
    } else {
      steps.push({ heap: [...heap], processed: nums.slice(0, i + 1), current: n, action: 'skip', message: `${n} ≤ heap root ${heap[0]}: too small to be top-${k}. Skip.`, k, nums })
    }
  }
  steps.push({ heap: [...heap], processed: [...nums], current: null, action: 'done', message: `Done! Top ${k} largest elements: [${[...heap].sort((a, b) => b - a)}]`, k, nums })
  return steps
}

// ── K Most Frequent ───────────────────────────────────────────────────────────
interface FreqStep {
  freq: Record<number, number>
  heap: [number, number][]  // [count, num]
  phase: 'count' | 'heap' | 'done'
  current: number | null
  message: string
  k: number
  nums: number[]
}

function kFrequentSteps(nums: number[], k: number): FreqStep[] {
  const steps: FreqStep[] = []
  const freq: Record<number, number> = {}

  steps.push({ freq: {}, heap: [], phase: 'count', current: null, message: `K Most Frequent: count occurrences of each element.`, k, nums })

  for (const n of nums) {
    freq[n] = (freq[n] ?? 0) + 1
    steps.push({ freq: { ...freq }, heap: [], phase: 'count', current: n, message: `Count ${n}: freq[${n}] = ${freq[n]}`, k, nums })
  }

  const heap: [number, number][] = []
  const entries = Object.entries(freq).map(([n, c]) => [+n, c] as [number, number])

  steps.push({ freq: { ...freq }, heap: [], phase: 'heap', current: null, message: `Build min-heap by frequency. Keep only k=${k} most frequent.`, k, nums })

  for (const [num, count] of entries) {
    if (heap.length < k) {
      heap.push([count, num])
      heap.sort((a, b) => a[0] - b[0])
      steps.push({ freq: { ...freq }, heap: [...heap], phase: 'heap', current: num, message: `Push (freq=${count}, num=${num}). Heap has ${heap.length}/${k} entries.`, k, nums })
    } else if (count > heap[0][0]) {
      const evicted = heap[0]
      heap[0] = [count, num]
      heap.sort((a, b) => a[0] - b[0])
      steps.push({ freq: { ...freq }, heap: [...heap], phase: 'heap', current: num, message: `freq(${num})=${count} > min=${evicted[0]}: evict (${evicted[1]}, freq=${evicted[0]}), insert ${num}.`, k, nums })
    } else {
      steps.push({ freq: { ...freq }, heap: [...heap], phase: 'heap', current: num, message: `freq(${num})=${count} ≤ min=${heap[0][0]}: not frequent enough. Skip.`, k, nums })
    }
  }

  steps.push({ freq: { ...freq }, heap: [...heap], phase: 'done', current: null, message: `Top ${k} frequent: [${heap.map(h => h[1]).join(', ')}]`, k, nums })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Top K Largest — min-heap of size k
// Time: O(n log k)  Space: O(k)
// Use a min-heap — if element > min, swap it in

// MinHeap class (or use a library)
class MinHeap {
  constructor() { this.heap = []; }
  push(val) {
    this.heap.push(val);
    this._up(this.heap.length - 1);
  }
  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) { this.heap[0] = last; this._down(0); }
    return top;
  }
  peek() { return this.heap[0]; }
  size() { return this.heap.length; }
  _up(i) { while (i > 0 && this.heap[Math.floor((i-1)/2)] > this.heap[i]) { [this.heap[i], this.heap[Math.floor((i-1)/2)]] = [this.heap[Math.floor((i-1)/2)], this.heap[i]]; i = Math.floor((i-1)/2); } }
  _down(i) { let s = i, l = 2*i+1, r = 2*i+2; if (l < this.heap.length && this.heap[l] < this.heap[s]) s = l; if (r < this.heap.length && this.heap[r] < this.heap[s]) s = r; if (s !== i) { [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]]; this._down(s); } }
}

function topKLargest(nums, k) {
  const heap = new MinHeap();
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop(); // evict smallest
  }
  return heap.heap; // remaining k elements are largest
}

// K Most Frequent — O(n log k)
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // Min-heap by frequency
  const heap = new MinHeap(); // store [count, num]
  for (const [num, count] of freq) {
    heap.push([count, num]);
    if (heap.size() > k) heap.pop();
  }
  return heap.heap.map(([, num]) => num);
}

// K Closest Points to Origin — O(n log k)
function kClosest(points, k) {
  const dist = ([x, y]) => x*x + y*y;
  // Max-heap of size k — keep k smallest distances
  const heap = [];
  for (const p of points) {
    heap.push([dist(p), p]);
    heap.sort((a, b) => b[0] - a[0]); // max first
    if (heap.length > k) heap.shift();
  }
  return heap.map(([, p]) => p);
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `import heapq
from collections import Counter

# Top K Largest — O(n log k) using heapq (min-heap)
def top_k_largest(nums, k):
    heap = []
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)  # evict smallest
    return heap  # k largest remain

# Simpler — but O(n log n):
# return sorted(nums)[-k:]

# K Most Frequent — O(n log k)
def top_k_frequent(nums, k):
    count = Counter(nums)
    # heapq.nlargest uses a min-heap internally — O(n log k)
    return heapq.nlargest(k, count.keys(), key=count.get)

# Manual min-heap approach for top-k frequent:
def top_k_frequent_manual(nums, k):
    count = Counter(nums)
    heap = []  # min-heap by frequency
    for num, freq in count.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)  # remove least frequent
    return [num for freq, num in heap]

# K Closest to Origin
def k_closest(points, k):
    # negate distance to turn min-heap into max-heap
    return heapq.nsmallest(
        k, points, key=lambda p: p[0]**2 + p[1]**2
    )

# Kth Largest Element — O(n log k)
def find_kth_largest(nums, k):
    heap = nums[:k]
    heapq.heapify(heap)
    for n in nums[k:]:
        if n > heap[0]:
            heapq.heapreplace(heap, n)
    return heap[0]`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.*;

// Top K Largest — O(n log k) — PriorityQueue is a min-heap
public int[] topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);

    // min-heap by frequency
    PriorityQueue<int[]> heap = new PriorityQueue<>(
        (a, b) -> a[1] - b[1] // [num, count] — sort by count asc
    );
    for (var e : freq.entrySet()) {
        heap.offer(new int[]{e.getKey(), e.getValue()});
        if (heap.size() > k) heap.poll(); // evict min-freq
    }
    int[] result = new int[k];
    for (int i = 0; i < k; i++) result[i] = heap.poll()[0];
    return result;
}

// Kth Largest
public int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap
    for (int n : nums) {
        heap.offer(n);
        if (heap.size() > k) heap.poll();
    }
    return heap.peek(); // kth largest
}`,
  },
]

function getNodePos(i: number, heapSize: number) {
  if (heapSize === 0) return { x: 0, y: 0 }
  const depth = Math.floor(Math.log2(i + 1))
  const posInRow = i - (Math.pow(2, depth) - 1)
  const totalInRow = Math.pow(2, depth)
  const W = 340
  const x = (posInRow + 0.5) * (W / totalInRow)
  const y = depth * 52 + 24
  return { x, y }
}

export default function TopKElementsVisualizer() {
  const [problem, setProblem] = useState<Problem>('top-k-largest')
  const [k, setK] = useState(3)

  // Leaderboard scores for top-k largest
  const NUMS1 = [42, 7, 89, 23, 156, 31, 74, 12, 98, 51, 67, 18]
  // Play counts for k most frequent
  const NUMS2 = [1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6]

  const steps1 = topKSteps(NUMS1, k)
  const steps2 = kFrequentSteps(NUMS2, k)

  const steps = problem === 'top-k-largest' ? steps1 : steps2
  const ctrl  = useSteps(steps.length)
  const cur   = steps[ctrl.step] as any

  const ACTION_STYLE: Record<string, string> = {
    init: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    push: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    pop:  'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    skip: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
    done: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    count:'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
    heap: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Top K Elements</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">A heap of size k acts as a live "best k" tracker — O(n log k) instead of O(n log n) full sort</p>
        </div>
        <ComplexityBadge time="O(n log k)" space="O(k)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Top K Largest:</strong> A gaming leaderboard receives score updates continuously. You need the top 3 scores for the display banner — but sorting all 12 scores every time a score changes is wasteful.
          A min-heap of size k solves this: whenever a new score beats the current 3rd-place score (the heap root), swap it in and re-heapify. One heap, always up to date.
          <br /><strong>K Most Frequent:</strong> A music streaming platform's "Trending" section shows the k songs with the most plays. Same heap trick, keyed by play count.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">The key insight</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          To find <strong>k largest</strong>: use a <strong>min-heap of size k</strong>. The root is always the smallest of the "top k so far". A new element only enters if it beats the root — then heapify-down.
          Counter-intuitive but correct: a min-heap finds the k largest, a max-heap finds the k smallest.
          This avoids sorting entirely and streams naturally from any data source.
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setProblem('top-k-largest'); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${problem === 'top-k-largest' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          Top K Largest
        </button>
        <button onClick={() => { setProblem('k-frequent'); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${problem === 'k-frequent' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          K Most Frequent
        </button>
        <label className="flex items-center gap-2 text-sm ml-2">
          <span className="text-slate-500">k =</span>
          {[2, 3, 4].map(v => (
            <button key={v} onClick={() => { setK(v); ctrl.reset() }}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${k === v ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'}`}>
              {v}
            </button>
          ))}
        </label>
      </div>

      <div className="viz-container p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input array */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Input Array</h4>
            <div className="flex flex-wrap gap-2">
              {(problem === 'top-k-largest' ? NUMS1 : NUMS2).map((n, i) => {
                const isProcessed = cur.processed?.includes?.(n) || (cur.phase === 'heap' && cur.freq?.[n] !== undefined)
                const isCurrent = cur.current === n
                return (
                  <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                    isCurrent ? 'bg-violet-500 text-white scale-110' : isProcessed ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}>
                    {n}
                  </div>
                )
              })}
            </div>

            {/* Freq table for k-frequent */}
            {problem === 'k-frequent' && Object.keys(cur.freq ?? {}).length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Frequency Map</h4>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(cur.freq ?? {}).map(([num, cnt]) => (
                    <div key={num} className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${cur.current === +num ? 'bg-violet-100 dark:bg-violet-950 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300' : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300'}`}>
                      {num}: {cnt as number}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Min-heap tree */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Min-Heap (size k={k})
            </h4>
            {(() => {
              const heapArr: number[] = problem === 'top-k-largest'
                ? (cur.heap ?? [])
                : (cur.heap ?? []).map((h: [number, number]) => h[1])
              const labels: string[] = problem === 'top-k-largest'
                ? heapArr.map(String)
                : (cur.heap ?? []).map((h: [number, number]) => `${h[1]}(×${h[0]})`)

              const H = Math.max(Math.ceil(Math.log2(heapArr.length + 1)) * 52 + 24, 80)
              return (
                <svg width={340} height={H + 20} className="w-full max-w-xs">
                  {heapArr.map((_, i) => {
                    const p = Math.floor((i - 1) / 2)
                    if (i === 0) return null
                    const from = getNodePos(p, heapArr.length)
                    const to = getNodePos(i, heapArr.length)
                    return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />
                  })}
                  {heapArr.map((v, i) => {
                    const pos = getNodePos(i, heapArr.length)
                    const isRoot = i === 0
                    return (
                      <g key={i}>
                        <circle cx={pos.x} cy={pos.y} r={18} className={`transition-colors ${isRoot ? 'fill-amber-400 dark:fill-amber-600' : 'fill-violet-400 dark:fill-violet-600'}`} />
                        <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} className="fill-white font-bold">{labels[i]}</text>
                      </g>
                    )
                  })}
                  {heapArr.length === 0 && <text x={170} y={40} textAnchor="middle" className="fill-slate-400" fontSize={12}>empty</text>}
                </svg>
              )
            })()}
            {cur.heap?.length > 0 && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-mono">
                root (min) = {problem === 'top-k-largest' ? cur.heap[0] : `${cur.heap[0]?.[1]}(×${cur.heap[0]?.[0]})`}
              </div>
            )}
          </div>
        </div>

        {/* Action + message */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${ACTION_STYLE[cur.action ?? cur.phase] ?? ''}`}>
            {cur.action ?? cur.phase}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Root (min)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-400 inline-block"></span> Heap node</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current element</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
