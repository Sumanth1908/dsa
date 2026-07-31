import React, { useState, useMemo } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeTabs from '@/components/shared/CodeTabs'

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
        [a[j], a[j + 1]] = [a[j + 1], a[j]]
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
          [a[i], a[j]] = [a[j], a[i]]
          steps.push({ array: [...a], comparing: [], swapping: [i, j], sorted: [...sorted], pivot: high, message: `Swap a[${i}]=${a[i]} ↔ a[${j}]=${a[j]}` })
        }
      }
    }
    [a[i + 1], a[high]] = [a[high], a[i + 1]]
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
      [a[i], a[largest]] = [a[largest], a[i]]
      steps.push({ array: [...a], comparing: [], swapping: [i, largest], sorted: [...sorted], message: `Swap ${a[largest]} ↔ ${a[i]}` })
      heapify(n, largest)
    }
  }

  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) heapify(a.length, i)
  steps.push({ array: [...a], comparing: [], swapping: [], sorted: [...sorted], message: 'Max-heap built. Now extract elements.' })

  for (let i = a.length - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]]
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

const ALGO_DESCRIPTIONS: Record<SortAlgo, { when: string; why: string; tradeoff: string }> = {
  bubble: {
    when: 'Almost never in production. Good for teaching comparison sorts.',
    why: 'Each pass "bubbles" the largest unsorted element to its final position by comparing adjacent pairs. After k passes, the last k elements are sorted.',
    tradeoff: 'O(n²) even for nearly-sorted data (unless you add an "early exit" flag). No real advantage over Insertion Sort, which has the same complexity but fewer writes.',
  },
  merge: {
    when: 'When you need a stable sort, or when sorting linked lists, or when data doesn\'t fit in memory (external sort).',
    why: 'Divide the array in half recursively until each piece has 1 element (trivially sorted), then merge adjacent sorted pieces. The merge step picks the smaller of the two front elements repeatedly.',
    tradeoff: 'Always O(n log n) — no worst case. The downside is O(n) extra space for the temporary merge buffer. Python\'s built-in sort (Timsort) is merge sort + insertion sort hybrid. Java uses it for object arrays.',
  },
  quick: {
    when: 'Default general-purpose sort. Fastest in practice for in-memory sorting when data isn\'t adversarially ordered.',
    why: 'Pick a pivot, partition the array so all elements ≤ pivot are left, all ≥ pivot are right, then recurse on both halves. The pivot ends up in its final sorted position after each partition.',
    tradeoff: 'O(n²) worst case if pivot is always the min or max (e.g., sorted input with last-element pivot). Fix: randomise the pivot. Average case O(n log n), O(log n) stack space (in-place). Cache-friendly — excellent real-world constants.',
  },
  heap: {
    when: 'When guaranteed O(n log n) in-place sort is required — especially embedded systems or when memory is constrained.',
    why: 'Phase 1: build a max-heap from the array in O(n). Phase 2: repeatedly extract the max (swap root with last element, shrink heap, heapify down) to place elements in sorted order.',
    tradeoff: 'Guaranteed O(n log n) worst case with O(1) space (no recursion stack). In practice slower than quicksort due to poor cache behaviour — heap operations jump around memory non-sequentially.',
  },
}

const INITIAL = [64, 34, 25, 12, 22, 11, 90]

interface SortingVisualizerProps { algo?: SortAlgo }

const DOUBTS: Record<string, { q: string; a: string }[]> = {
  bubble: [
    {
      q: 'Where does O(n^2) come from?',
      a: 'Two nested loops over the same array: the outer loop runs one pass per element, and each pass costs up to n-1 comparisons. n passes x n comparisons = O(n^2).\nMore precisely, the passes shrink — pass 1 makes n-1 comparisons, pass 2 makes n-2, and so on, summing to n(n-1)/2, which is still quadratic. The scaling is what kills it: sorting 1,000 items costs ~500,000 comparisons, but 100,000 items costs ~5 billion. Multiply n by 100 and the work grows 10,000x.\nThe optimized version keeps a `swapped` flag: if a full pass makes zero swaps, the array is already sorted and it exits early. That is why sorted input costs a single O(n) pass.\n- Worst case: O(n^2) — reverse-sorted input, every comparison swaps.\n- Best case: O(n) — already sorted, one clean pass and out.\n**Rule of thumb:** any sort that only swaps adjacent elements is stuck at O(n^2) on average — a random array has ~n^2/4 inversions and each adjacent swap fixes exactly one.',
    },
    {
      q: 'Is bubble sort ever the right choice?',
      a: 'Almost never in production — any library sort will beat it. But it is not useless: it\'s stable (equal elements keep their order), in-place (O(1) extra memory), adaptive with the early-exit flag (O(n) on sorted data), and simple enough to write bug-free on a whiteboard.\nIn the rare cases where a simple quadratic sort really is the right tool — tiny arrays, nearly-sorted data — real libraries reach for insertion sort instead, because it does the same job with fewer comparisons and far fewer writes. CPython\'s Timsort and V8\'s array sort both switch to insertion sort for small runs (roughly under 32 elements); nobody ships bubble sort.\n- Learning and teaching: it is the clearest illustration of comparison sorting and the baseline everything else gets measured against.\n- Detecting sortedness: one early-exit pass is a valid O(n) \'is it already sorted?\' check.\n- Everything else: use insertion sort or your language\'s built-in.\n**Interview tip:** if asked to defend bubble sort, say \'stable, in-place, and O(n) on already-sorted input\' — answering in properties beats answering in big-O alone.',
    },
    {
      q: 'What does "the largest element bubbles up" actually mean?',
      a: 'It means one pass drags the largest unsorted value all the way to the right edge — like a bubble rising to the surface — so the sorted zone grows from the back of the array.\nWatch one pass over `[5, 1, 4, 2]`. Compare 5 and 1: swap, giving `[1, 5, 4, 2]`. Compare 5 and 4: swap, `[1, 4, 5, 2]`. Compare 5 and 2: swap, `[1, 4, 2, 5]`. The 5 was picked up at index 0 and carried the whole way, because the largest unsorted element wins every comparison it takes part in — so it always ends the pass at the boundary of the sorted region.\nThat gives the loop invariant: after pass k, the last k positions hold the k largest values, already in final position. It is exactly why the inner loop shrinks — `for (let j = 0; j < n - i - 1; j++)` skips the settled tail.\n**Common mistake:** re-scanning the full array on every pass. Still correct, but you are comparing against elements that are provably already in place.',
    },
  ],
  merge: [
    {
      q: 'Where does O(n log n) come from?',
      a: 'The array halves recursively until each piece is a single element — that\'s log n levels (or "depths") of the recursion tree. At each level, you merge all n elements exactly once: the first level merges n single items into n/2 pairs, the next merges those pairs into 4-sized chunks, and so on, all the way back up. So every level costs O(n) work, and with log n levels, the total is O(n log n). Unlike quicksort, the tree is always balanced: you always split at the midpoint, so depth is guaranteed log n even on worst-case inputs like reversed arrays. For example, sorting `[64, 34, 25, 12]` splits into `[64, 34]` and `[25, 12]`, each splits to singletons (log 4 = 2 levels), then merges climb back up with n=4 comparisons per level. **Guarantee:** no bad case — O(n log n) time, always.',
    },
    {
      q: 'Why does merge sort need O(n) extra space?',
      a: 'Merging two sorted halves requires a temporary buffer because you cannot zip them in place — if you try to write merged results back into the source array, you overwrite values you still need to read from. For example, merging `[1, 5]` and `[2, 4]` into `[1, 2, 4, 5]` needs space to hold the result before you can copy it back. In-place merge algorithms exist (like Sedgewick\'s or symmerge) but they are significantly more complex and often slower in practice due to extra pointer arithmetic and cache misses. That is why production merge sort implementations — like Python\'s Timsort, Java\'s Arrays.sort for objects, or the C++ standard library — allocate a temporary buffer once and reuse it throughout the sort. The O(n) space cost is the classic merge-sort trade-off: guaranteed O(n log n) time in exchange for linear extra memory. **When to skip it:** if your memory budget is under 1 MB or you have a linked list (no pre-allocated buffer needed).',
    },
    {
      q: 'Why is merge sort the go-to for linked lists and giant files?',
      a: 'Merge sort only requires sequential access through the data — no random indexing — which is a perfect fit for linked lists and external sorts. Linked lists have O(n) index operations: there is no arr[i] in a linked list, so any sorting algorithm relying on that (quicksort, heapsort, even insertion sort) becomes O(n^2). Merge sort just walks both halves forward, comparing and picking the smaller, and that works over linked nodes as smoothly as arrays. For giant files too large to fit in RAM, merge sort shines: load one chunk from disk, sort it in memory, write it to a temporary file, repeat for all chunks, then stream-merge the sorted files. For example, sorting a 100 GB CSV with 256 MB RAM: generate 400 sorted chunks on disk, then maintain 400 file pointers and merge one row at a time. External merge sort is how production systems handle data warehousing queries on massive datasets. **The payoff:** your algorithm does not care whether the data lives in an array, linked list, or across disk files.',
    },
  ],
  quick: [
    {
      q: 'When does quicksort actually hit O(n^2)?',
      a: 'Quicksort hits O(n^2) when the pivot is consistently the minimum or maximum element, creating a lopsided partition tree instead of a balanced one. The classic case is selecting the first element as the pivot on a sorted array: if you are sorting `[1, 2, 3, 4, 5]` and pick 1 as the pivot, the partition puts 1 in place and leaves `[2, 3, 4, 5]` to sort. The next pivot is 2, giving `[3, 4, 5]`, and so on — creating a chain n levels deep instead of a balanced log n tree. Each level still costs O(n) partitioning work (worst case), so the total is n * n = O(n^2). Real quicksort implementations prevent this with randomized pivot selection (shuffle the array before sorting, or pick a random element) or median-of-three (choose the median of the first, middle, and last elements). These tactics make hitting O(n^2) vanishingly unlikely — you would need an adversarial distribution, not a simple sorted input. **Practical note:** most languages randomize implicitly via fast pivot strategies, so you rarely see O(n^2) in practice.',
    },
    {
      q: 'If both are O(n log n), why is quicksort usually faster than merge sort?',
      a: 'Quicksort sorts in place with no temporary buffer allocation, which gives it better cache locality and a tighter memory footprint. The partition loop is extremely tight — just scanning left and right pointers across the array — with no copying overhead. Merge sort, by contrast, must allocate temporary buffers, copy data between the source array and the buffer, and merge back. For a 1-million-element array, merge sort might do 3–4 full passes over all data just copying; quicksort does zero copies. On modern CPUs, this matters enormously: quicksort keeps working set and pivot indices in the L1/L2 cache, while merge sort jumps between source and buffer, evicting cache. Big-O complexity masks the real performance: both are O(n log n) on average, but quicksort\'s constant factor is often 2–3x smaller. This is why every language defaults to quicksort for general-purpose sorting (C++ std::sort, Java\'s Arrays.sort for primitives, Go\'s sort.Ints). **Trade-off:** you lose the guaranteed worst-case bound for a faster average.',
    },
    {
      q: 'Is quicksort stable?',
      a: 'No, quicksort is not stable. Partitioning swaps elements across long distances, so equal elements can change relative order. For example, if you sort `[{id: 2, name: "Alice"}, {id: 1, name: "Bob"}, {id: 2, name: "Charlie"}]` by id only, a stable sort keeps the two id:2 objects in their original order (Alice before Charlie). Quicksort might swap Alice and Charlie during partitioning around pivot 1, breaking that order. In-place partition-based sorts (quicksort, heapsort, insertion sort with swaps) naturally destroy order because they move elements far from their source. Stable sorts like merge sort, counting sort, or radix sort preserve the original order of equal elements. When does stability matter? Multi-key sorts (sort by age, then by name within each age), and any scenario where the original sequence encodes information (transaction timestamps, insertion order in logs). Python\'s built-in `sorted()` and `list.sort()` use Timsort (merge-sort based, stable). Java\'s `Arrays.sort()` uses Timsort for objects (stable) and quicksort for primitives (not stable). **Rule of thumb:** if you need stable, reach for your language\'s default sort or explicitly choose merge sort.',
    },
  ],
  heap: [
    {
      q: 'Why build a MAX-heap to sort ascending?',
      a: 'The max-heap lets you extract the largest element in O(1) time by reading the root. The two-phase strategy is: Phase 1, build a max-heap from the array (O(n)). Phase 2, repeatedly swap the root (max) to the end of the array, shrink the heap by one element, sift the new root down to maintain the heap property, and repeat. After the first swap, the largest element sits at position n-1; after the second, the largest two are at positions n-2 and n-1; and so on. The sorted region grows from the back while the heap shrinks, all in place with O(1) extra space. For example, turning `[5, 3, 8, 1]` into a max-heap gives `[8, 3, 5, 1]`. Then swap 8 to the end: `[1, 3, 5, 8]`, sift 1 down to get `[5, 3, 1, 8]`, swap 5 to position 2: `[1, 3, 5, 8]`. Min-heap would give a descending sort; max-heap gives ascending. **Insight:** the heap\'s job is to efficiently find the next sorted element.',
    },
    {
      q: 'Same O(n log n) — why is heapsort usually slower than quicksort?',
      a: 'Heapsort accesses memory in a non-sequential pattern. Sift-down moves from index i to 2*i+1 (left child) or 2*i+2 (right child), then recursively down — the array indices jump all over, accessing memory locations far apart. This thrashes CPU caches: a typical cache line is 64 bytes (8 integers), so when you fetch arr[i], nearby elements arr[i+1], arr[i+2] come along for free; sift-down skips them entirely. Quicksort, by contrast, scans the array with two pointers moving sequentially left-to-right and right-to-left, maintaining cache locality. Both algorithms are O(n log n) on average, but their memory-access patterns are vastly different. Modern benchmarks show quicksort is 2–5x faster than heapsort on real hardware, despite identical asymptotic complexity. This is why heapsort is rarely used for general sorting — it only shines when you absolutely need a guaranteed O(n log n) worst case and in-place sorting with no recursion stack (embedded systems, hard real-time). **The lesson:** big-O hides the constant factors that dominate performance on real CPUs.',
    },
    {
      q: 'Why is building the heap O(n) and not O(n log n)?',
      a: 'Bottom-up heapify exploits the structure of a complete binary tree: half of all nodes are leaves (no children) requiring zero work, a quarter are parents of leaves (one sift-down each), and so on. Only the few nodes near the root pay the full log n sift-down cost. The total cost sums as: (n/2) * 1 + (n/4) * 2 + (n/8) * 3 + ... which is a geometric series that converges to 2n = O(n). For example, building a heap from `[3, 1, 4, 1, 5, 9, 2, 6]` (8 elements): leaves at indices 4–7 (4 leaves, zero cost); index 3 sifts once; index 2 sifts once or twice; index 1 sifts up to 2 times; index 0 sifts up to 3 times — total roughly 8 operations instead of 8 * log(8) = 24. If you naively inserted all n elements one by one (each insertion costs log n), the total would be O(n log n). The bottom-up method is why heapsort starts with O(n) build and O(n log n) extraction phase, not O(n log n) total. **Key insight:** positioning matters — work is distributed across the tree structure.',
    },
  ],
}

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

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You're dealt a messy hand of playing cards and instinctively start arranging it — pick a card, slide
          it where it belongs. Every sorting algorithm is a different strategy for that same chore: some compare
          neighbours and swap (bubble), some grow a sorted section one card at a time (insertion), some split
          the pile, sort the halves, and merge (merge sort). The differences barely matter for 10 cards — and
          matter enormously for 10 million.
        </p>
      </div>

      <MemoryTip>Bubble swaps neighbours, insertion grows a hand, merge splits then zips, and quick partitions around a pivot.</MemoryTip>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="font-semibold text-xs uppercase tracking-wide mb-1">Use when</div>
            <p>{ALGO_DESCRIPTIONS[algo].when}</p>
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-wide mb-1">How it works</div>
            <p>{ALGO_DESCRIPTIONS[algo].why}</p>
          </div>
          <div>
            <div className="font-semibold text-xs uppercase tracking-wide mb-1">Trade-off</div>
            <p>{ALGO_DESCRIPTIONS[algo].tradeoff}</p>
          </div>
        </div>
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
      <CodeTabs doubts={DOUBTS[algo]} examples={CODE[algo] as any} />
    </div>
  )
}
