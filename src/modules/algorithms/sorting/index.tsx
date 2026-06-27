import React, { useState, useMemo } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

export type SortAlgo = 'bubble' | 'merge' | 'quick' | 'heap'

export interface SortStep {
  array: number[]
  comparing: number[]
  swapping: number[]
  sorted: number[]
  pivot?: number
  message: string
}

// --- Bubble Sort ---
function bubbleSteps(arr: number[]): SortStep[] {
  const a = [...arr]
  const steps: SortStep[] = [{ array: [...a], comparing: [], swapping: [], sorted: [], message: 'Start Bubble Sort' }]
  const sorted: number[] = []
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      steps.push({ array: [...a], comparing: [j, j + 1], swapping: [], sorted: [...sorted], message: `Compare a[${j}]=${a[j]} with a[${j + 1}]=${a[j + 1]}` })
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        steps.push({ array: [...a], comparing: [], swapping: [j, j + 1], sorted: [...sorted], message: `Swap: ${a[j + 1]} > ${a[j]} → swap` })
      }
    }
    sorted.unshift(a.length - 1 - i)
  }
  sorted.unshift(0)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, i) => i), message: 'Bubble Sort complete!' })
  return steps
}

// --- Merge Sort ---
function mergeSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...arr]
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [], message: 'Start Merge Sort — Divide & Conquer' })

  function mergeSort(arr: number[], left: number, right: number) {
    if (left >= right) return
    const mid = Math.floor((left + right) / 2)
    mergeSort(arr, left, mid)
    mergeSort(arr, mid + 1, right)
    merge(arr, left, mid, right)
  }

  function merge(arr: number[], left: number, mid: number, right: number) {
    const L = arr.slice(left, mid + 1)
    const R = arr.slice(mid + 1, right + 1)
    let i = 0, j = 0, k = left

    steps.push({ array: [...arr], comparing: [left, right], swapping: [], sorted: [], message: `Merging subarrays [${left}..${mid}] and [${mid + 1}..${right}]` })

    while (i < L.length && j < R.length) {
      steps.push({ array: [...arr], comparing: [left + i, mid + 1 + j], swapping: [], sorted: [], message: `Compare ${L[i]} vs ${R[j]}: pick ${L[i] <= R[j] ? L[i] : R[j]}` })
      if (L[i] <= R[j]) arr[k++] = L[i++]
      else arr[k++] = R[j++]
      steps.push({ array: [...arr], comparing: [], swapping: [k - 1], sorted: [], message: `Placed ${arr[k - 1]} at index ${k - 1}` })
    }
    while (i < L.length) { arr[k++] = L[i++] }
    while (j < R.length) { arr[k++] = R[j++] }
  }

  mergeSort(a, 0, a.length - 1)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, i) => i), message: 'Merge Sort complete!' })
  return steps
}

// --- Quick Sort ---
function quickSteps(arr: number[]): SortStep[] {
  const steps: SortStep[] = []
  const a = [...arr]
  const sorted: number[] = []
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], message: 'Start Quick Sort — partition around pivot' })

  function quickSort(low: number, high: number) {
    if (low >= high) { if (low === high) sorted.push(low); return }
    const pivotIdx = partition(low, high)
    sorted.push(pivotIdx)
    quickSort(low, pivotIdx - 1)
    quickSort(pivotIdx + 1, high)
  }

  function partition(low: number, high: number): number {
    const pivot = a[high]
    steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], pivot: high, message: `Pivot = ${pivot} (index ${high})` })
    let i = low - 1
    for (let j = low; j < high; j++) {
      steps.push({ array: [...a], comparing: [j, high], swapping: [], sorted: [...sorted], pivot: high, message: `a[${j}]=${a[j]} ${a[j] <= pivot ? '≤' : '>'} pivot=${pivot}` })
      if (a[j] <= pivot) {
        i++
        if (i !== j) {
          ;[a[i], a[j]] = [a[j], a[i]]
          steps.push({ array: [...a], comparing: [], swapping: [i, j], sorted: [...sorted], pivot: high, message: `Swap a[${i}]=${a[i]} ↔ a[${j}]=${a[j]}` })
        }
      }
    }
    ;[a[i + 1], a[high]] = [a[high], a[i + 1]]
    steps.push({ array: [...a], comparing: [], swapping: [i + 1, high], sorted: [...sorted], pivot: i + 1, message: `Place pivot ${pivot} at correct position ${i + 1}` })
    return i + 1
  }

  quickSort(0, a.length - 1)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, i) => i), message: 'Quick Sort complete!' })
  return steps
}

// --- Heap Sort ---
function heapSteps(arr: number[]): SortStep[] {
  const a = [...arr]
  const steps: SortStep[] = [{ array: [...a], comparing: [], swapping: [], sorted: [], message: 'Start Heap Sort — build max-heap, then sort' }]
  const sorted: number[] = []

  function heapify(n: number, i: number) {
    let largest = i
    const l = 2 * i + 1, r = 2 * i + 2
    steps.push({ array: [...a], comparing: [i, l, r].filter(x => x < n), swapping: [], sorted: [...sorted], message: `Heapify at index ${i}` })
    if (l < n && a[l] > a[largest]) largest = l
    if (r < n && a[r] > a[largest]) largest = r
    if (largest !== i) {
      ;[a[i], a[largest]] = [a[largest], a[i]]
      steps.push({ array: [...a], comparing: [], swapping: [i, largest], sorted: [...sorted], message: `Swap ${a[largest]} ↔ ${a[i]}` })
      heapify(n, largest)
    }
  }

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) heapify(a.length, i)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], message: 'Max-heap built. Now extract elements.' })

  for (let i = a.length - 1; i > 0; i--) {
    ;[a[0], a[i]] = [a[i], a[0]]
    sorted.push(i)
    steps.push({ array: [...a], comparing: [], swapping: [0, i], sorted: [...sorted], message: `Swap root ${a[i]} to position ${i}` })
    heapify(i, 0)
  }
  sorted.push(0)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: Array.from({ length: a.length }, (_, i) => i), message: 'Heap Sort complete!' })
  return steps
}

interface CodeExample { lang: 'javascript' | 'python' | 'java'; label: string; code: string }
const CODE: Record<SortAlgo, CodeExample[]> = {
  bubble: [
    { lang: 'javascript', label: 'JavaScript', code: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
      }
    }
  }
  return arr;
}` },
    { lang: 'python', label: 'Python', code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr` },
    { lang: 'java', label: 'Java', code: `public void bubbleSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int tmp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = tmp;
            }
        }
    }
}` },
  ],
  merge: [
    { lang: 'javascript', label: 'JavaScript', code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}` },
    { lang: 'python', label: 'Python', code: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]` },
    { lang: 'java', label: 'Java', code: `void mergeSort(int[] arr, int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    merge(arr, l, mid, r);
}

void merge(int[] arr, int l, int mid, int r) {
    int[] tmp = Arrays.copyOfRange(arr, l, r + 1);
    int i = 0, j = mid - l + 1, k = l;
    while (i <= mid - l && j <= r - l)
        arr[k++] = tmp[i] <= tmp[j] ? tmp[i++] : tmp[j++];
    while (i <= mid - l) arr[k++] = tmp[i++];
}` },
  ],
  quick: [
    { lang: 'javascript', label: 'JavaScript', code: `function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low >= high) return arr;
  const pivotIdx = partition(arr, low, high);
  quickSort(arr, low, pivotIdx - 1);
  quickSort(arr, pivotIdx + 1, high);
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i+1], arr[high]] = [arr[high], arr[i+1]];
  return i + 1;
}` },
    { lang: 'python', label: 'Python', code: `def quick_sort(arr, low=0, high=None):
    if high is None: high = len(arr) - 1
    if low >= high: return
    pivot_idx = partition(arr, low, high)
    quick_sort(arr, low, pivot_idx - 1)
    quick_sort(arr, pivot_idx + 1, high)

def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1` },
    { lang: 'java', label: 'Java', code: `void quickSort(int[] arr, int low, int high) {
    if (low >= high) return;
    int pivot = partition(arr, low, high);
    quickSort(arr, low, pivot - 1);
    quickSort(arr, pivot + 1, high);
}

int partition(int[] arr, int low, int high) {
    int pivot = arr[high], i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            int tmp = arr[++i]; arr[i] = arr[j]; arr[j] = tmp;
        }
    }
    int tmp = arr[i+1]; arr[i+1] = arr[high]; arr[high] = tmp;
    return i + 1;
}` },
  ],
  heap: [
    { lang: 'javascript', label: 'JavaScript', code: `function heapSort(arr) {
  const n = arr.length;
  // Build max-heap
  for (let i = Math.floor(n/2)-1; i >= 0; i--)
    heapify(arr, n, i);
  // Extract elements
  for (let i = n-1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
  return arr;
}

function heapify(arr, n, i) {
  let largest = i;
  const l = 2*i+1, r = 2*i+2;
  if (l < n && arr[l] > arr[largest]) largest = l;
  if (r < n && arr[r] > arr[largest]) largest = r;
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest);
  }
}` },
    { lang: 'python', label: 'Python', code: `def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    return arr

def heapify(arr, n, i):
    largest = i
    l, r = 2*i+1, 2*i+2
    if l < n and arr[l] > arr[largest]: largest = l
    if r < n and arr[r] > arr[largest]: largest = r
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)` },
    { lang: 'java', label: 'Java', code: `void heapSort(int[] arr) {
    int n = arr.length;
    for (int i = n/2-1; i >= 0; i--)
        heapify(arr, n, i);
    for (int i = n-1; i > 0; i--) {
        int tmp = arr[0]; arr[0] = arr[i]; arr[i] = tmp;
        heapify(arr, i, 0);
    }
}

void heapify(int[] arr, int n, int i) {
    int largest = i, l = 2*i+1, r = 2*i+2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest != i) {
        int tmp = arr[i]; arr[i] = arr[largest]; arr[largest] = tmp;
        heapify(arr, n, largest);
    }
}` },
  ],
}

const COMPLEXITY: Record<SortAlgo, { time: string; space: string }> = {
  bubble: { time: 'O(n²)', space: 'O(1)' },
  merge:  { time: 'O(n log n)', space: 'O(n)' },
  quick:  { time: 'O(n log n) avg', space: 'O(log n)' },
  heap:   { time: 'O(n log n)', space: 'O(1)' },
}

const INITIAL = [64, 34, 25, 12, 22, 11, 90]

interface SortingVisualizerProps { algo?: SortAlgo }

export default function SortingVisualizer({ algo: propAlgo }: SortingVisualizerProps) {
  const [algo, setAlgo] = useState<SortAlgo>(propAlgo ?? 'bubble')

  const steps = useMemo(() => {
    if (algo === 'bubble') return bubbleSteps(INITIAL)
    if (algo === 'merge') return mergeSteps(INITIAL)
    if (algo === 'quick') return quickSteps(INITIAL)
    return heapSteps(INITIAL)
  }, [algo])

  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]
  const maxVal = Math.max(...INITIAL)

  const getBarColor = (i: number) => {
    if (cur.sorted.includes(i)) return 'bg-emerald-400 dark:bg-emerald-500'
    if (cur.swapping.includes(i)) return 'bg-rose-500'
    if (cur.comparing.includes(i)) return 'bg-amber-400'
    if (cur.pivot === i) return 'bg-violet-500'
    return 'bg-slate-300 dark:bg-slate-600'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
            {algo.replace('-', ' ')} Sort
          </h1>
        </div>
        <ComplexityBadge time={COMPLEXITY[algo].time} space={COMPLEXITY[algo].space} />
      </div>

      {!propAlgo && (
        <div className="flex gap-2 flex-wrap">
          {(['bubble', 'merge', 'quick', 'heap'] as SortAlgo[]).map(a => (
            <button key={a} onClick={() => { setAlgo(a); ctrl.reset() }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                algo === a ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}>
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="viz-container p-6">
        {/* Bar chart */}
        <div className="flex items-end justify-center gap-2 h-48">
          {cur.array.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs font-mono text-slate-500">{val}</span>
              <div
                className={`w-10 rounded-t-lg transition-all duration-300 ${getBarColor(i)}`}
                style={{ height: `${(val / maxVal) * 160}px` }}
              />
              <span className="text-xs text-slate-400 font-mono">{i}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-slate-500 mt-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400"></span> Comparing</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500"></span> Swapping</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500"></span> Pivot</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400"></span> Sorted</span>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE[algo] as any} />
    </div>
  )
}
