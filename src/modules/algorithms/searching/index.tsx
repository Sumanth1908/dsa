import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeTabs from '@/components/shared/CodeTabs'

interface Step {
  array: number[]
  left: number; right: number; mid: number
  highlight: number[]
  found: boolean
  message: string
}

function binarySearchSteps(arr: number[], target: number): Step[] {
  const sorted = [...arr].sort((a, b) => a - b)
  const steps: Step[] = [{ array: sorted, left: 0, right: sorted.length - 1, mid: -1, highlight: [], found: false, message: `Binary search for ${target} in sorted array` }]
  let left = 0, right = sorted.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    steps.push({ array: sorted, left, right, mid, highlight: [left, mid, right], found: false, message: `left=${left}, right=${right} → mid=${mid}, arr[${mid}]=${sorted[mid]}` })
    if (sorted[mid] === target) {
      steps.push({ array: sorted, left, right, mid, highlight: [mid], found: true, message: `Found ${target} at index ${mid}!` })
      return steps
    } else if (sorted[mid] < target) {
      steps.push({ array: sorted, left, right, mid, highlight: [mid], found: false, message: `${sorted[mid]} < ${target} → search right half` })
      left = mid + 1
    } else {
      steps.push({ array: sorted, left, right, mid, highlight: [mid], found: false, message: `${sorted[mid]} > ${target} → search left half` })
      right = mid - 1
    }
  }
  steps.push({ array: sorted, left, right, mid: -1, highlight: [], found: false, message: `${target} not found in the array` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `function binarySearch(arr, target) {
  // Array must be sorted
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1; // not found
}

// Recursive variant
function binarySearchRec(arr, target, l = 0, r = arr.length - 1) {
  if (l > r) return -1;
  const mid = Math.floor((l + r) / 2);
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) return binarySearchRec(arr, target, mid+1, r);
  return binarySearchRec(arr, target, l, mid-1);
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `def binary_search(arr, target):
    # Array must be sorted
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1  # not found

# Using bisect module
import bisect
idx = bisect.bisect_left(arr, target)
found = idx < len(arr) and arr[idx] == target`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `public int binarySearch(int[] arr, int target) {
    // Array must be sorted
    int left = 0, right = arr.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1; // not found
}

// Built-in
int idx = Arrays.binarySearch(arr, target);`,
  },
]

const ARRAY = [11, 22, 33, 44, 55, 66, 77, 88, 99]

const DOUBTS = [
  {
    q: 'Why must the array be sorted?',
    a: "Because the inference that powers binary search — `target > arr[mid]`, therefore the target must live in the right half — is only valid when order is guaranteed. Sorting is what turns one comparison into a proof about the n/2 elements you never looked at; on unsorted data the discarded half might contain the target.\nWatch it fail concretely. Search for `1` in the unsorted array `[9, 3, 7, 1, 5]`. The middle element is `7`, and since `1 < 7` the algorithm throws away the right half — but `1` actually lives at index 3, inside the half just discarded. The search silently returns not-found for an element that is present.\nWhat this means in practice:\n- Searching once in unsorted data? A plain linear scan is O(n), cheaper than the O(n log n) sort you would need first.\n- Searching many times? Sort once, then every lookup is O(log n) — about 30 comparisons finds anything among a billion sorted items.\n- Data changing constantly? Use a structure that stays sorted for you: a B-tree index in Postgres, or Java's `TreeMap`.\n**Rule of thumb:** sorting is the price of admission — pay it once, and every lookup afterwards is nearly free.",
  },
  {
    q: 'Why write `mid = low + (high - low) / 2`?',
    a: "Purely to dodge integer overflow. In fixed-width integer languages (Java, C++, C#), `low + high` can exceed the maximum int when both are large, producing a garbage negative number; `low + (high - low) / 2` computes the same midpoint but never builds a sum bigger than `high` itself.\nSee it with real numbers. Java's int maxes out at 2,147,483,647. Searching an array of ~1.5 billion elements, you can legitimately reach `low = 1_200_000_000` and `high = 1_600_000_000`. Their sum is 2.8 billion — past the max — so it wraps negative, and `(low + high) / 2` yields a negative index: instant `ArrayIndexOutOfBoundsException`. This exact bug sat in the JDK's own `Arrays.binarySearch` for about nine years until Joshua Bloch fixed it in 2006 and wrote the famous post 'Nearly All Binary Searches and Mergesorts are Broken'.\nLanguage by language:\n- Java / C++ / C#: use the subtraction form, or Java's `(low + high) >>> 1` — the unsigned shift reinterprets the wrapped bits as a large positive number.\n- Python: ints grow without bound, so `(low + high) // 2` is always safe; the subtraction form is pure habit.\n- JavaScript: numbers are 64-bit floats, exact up to 2^53, so real array indices never get close — but `(low + high) >> 1` coerces to 32 bits and reintroduces the bug for huge virtual ranges.\n**Interview tip:** writing the subtraction form unprompted quietly signals you know the classic overflow bug — be ready to tell the JDK story if asked why.",
  },
  {
    q: 'My binary search loops forever or misses by one — the usual cause?',
    a: "Almost always mixed inclusive/exclusive conventions: the loop condition assumes one definition of the search range while the `mid` updates assume another, and the disagreement shows up as an infinite loop or an off-by-one miss.\nThe classic infinite loop: `while (low < high)` combined with `low = mid`. Once `low` and `high` are adjacent, `mid = (low + high) / 2` rounds down to `low`, so `low = mid` makes no progress — the loop spins forever on the same two indices. Every update must shrink the range: exclude `mid` after testing it (`low = mid + 1` / `high = mid - 1`), or round toward the half you keep.\nThe fix is discipline, not cleverness — pick ONE invariant and make every line agree with it:\n- Closed range `[low, high]`: loop `while (low <= high)`, update `low = mid + 1` and `high = mid - 1`. The range provably shrinks every iteration.\n- Half-open range `[low, high)`: loop `while (low < high)`, update `low = mid + 1` and `high = mid`. Common in C++/STL-style code.\n- Never mix the two styles in one function — that is where the bugs live.\nThen trace a 2-element array by hand, and for first/last-occurrence variants test on duplicates like `[2, 2, 2]` — nearly every off-by-one reveals itself at n = 2.\n**Rule of thumb:** if you cannot state the loop invariant in one sentence, your `+1`s are guesses.",
  },
]

export default function BinarySearchVisualizer() {
  const [target, setTarget] = useState(55)
  const steps = binarySearchSteps(ARRAY, target)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const getColor = (i: number) => {
    if (cur.found && cur.mid === i) return 'bg-emerald-400 dark:bg-emerald-500 text-white scale-110'
    if (cur.mid === i) return 'bg-violet-500 text-white scale-110'
    if (i === cur.left || i === cur.right) return 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white'
    if (cur.left <= i && i <= cur.right) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
    return 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Binary Search</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Halve the search space each step — requires a sorted array</p>
        </div>
        <ComplexityBadge time="O(log n)" space="O(1)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          How do you find "meridian" in a paper dictionary? Not from page 1 — you open the middle, see "L"
          words, and instantly ignore the entire first half. Open the middle of what's left, repeat, and in a
          handful of flips you're there. That's binary search: each peek eliminates half of everything
          remaining. The only requirement — and it's non-negotiable — is that the book is sorted.
        </p>
      </div>

      <MemoryTip>Middle, compare, discard half — but sort before you start.</MemoryTip>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Binary search isn't just for finding values in sorted arrays — the underlying pattern is <strong>"eliminate half the search space at each step"</strong>, and it appears in many disguised forms. Git's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">git bisect</code> finds which commit introduced a bug by testing the midpoint commit. Database B-tree indexes use binary search to find rows in O(log n) from billions of records. LeetCode problems like "minimum speed to deliver packages in D days" are binary search on the answer space — the function is monotonic, so binary search applies.</p>
        <p><strong>The key invariant:</strong> always maintain <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">[left, right]</code> as the range that still might contain the answer. When <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">left &gt; right</code>, the range is empty — target doesn't exist. Never skip elements: moving <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">left = mid + 1</code> is a guarantee that "mid is definitely not the answer and everything before mid is too small". Get this wrong by one and you get infinite loops or missed answers.</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Search for:</span>
        <input type="number" value={target} onChange={e => { setTarget(+e.target.value); ctrl.reset() }}
          className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
        <span className="text-xs text-slate-400">Available: {ARRAY.join(', ')}</span>
      </label>

      <div className="viz-container p-8">
        <div className="flex justify-center gap-2 flex-wrap">
          {cur.array.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {/* Pointer labels */}
              <div className="text-xs font-mono h-5 flex flex-col items-center">
                {cur.left === i && <span className="text-amber-600 dark:text-amber-400">L</span>}
                {cur.mid === i && <span className="text-violet-600 dark:text-violet-400">M</span>}
                {cur.right === i && <span className="text-amber-600 dark:text-amber-400">R</span>}
              </div>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-300 ${getColor(i)}`}>
                {val}
              </div>
              <span className="text-xs text-slate-400 font-mono">{i}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-600"></span> Search range boundary</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500"></span> Mid point</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400"></span> Found</span>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
