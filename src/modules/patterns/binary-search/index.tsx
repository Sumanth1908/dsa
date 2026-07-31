import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeTabs from '@/components/shared/CodeTabs'

interface Step { left: number; right: number; mid: number; answer: number; message: string }

function findFirstBadSteps(n: number, bad: number): Step[] {
  const steps: Step[] = [{ left: 1, right: n, mid: -1, answer: -1, message: `${n} commits in the pipeline. Tests pass up to commit ${bad - 1}, fail from commit ${bad} onward. Find the culprit in O(log ${n}) = ${Math.ceil(Math.log2(n))} checks max.` }]
  let left = 1, right = n, answer = -1
  let checks = 0

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const isBad = mid >= bad
    checks++
    steps.push({ left, right, mid, answer, message: `Check #${checks}: run tests on commit ${mid}${isBad ? ' — FAIL (bad commit)' : ' — PASS (good commit)'}` })
    if (isBad) {
      answer = mid
      right = mid - 1
      steps.push({ left, right, mid, answer, message: `Commit ${mid} is bad — record it as the earliest known culprit. Narrow search to commits ${left}–${right} (could be even earlier).` })
    } else {
      left = mid + 1
      steps.push({ left, right, mid, answer, message: `Commit ${mid} is clean — the bug was introduced after this. Narrow search to commits ${left}–${right}.` })
    }
  }
  steps.push({ left, right, mid: -1, answer, message: `Found in ${checks} test run${checks !== 1 ? 's' : ''} (vs ${n} for linear scan). Commit ${answer} is the first bad commit — roll it back!` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Binary Search Pattern — Find First Bad Version
// O(log n) — classic "search on condition" template
function firstBadVersion(n) {
  let left = 1, right = n;
  let answer = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (isBadVersion(mid)) {
      answer = mid;     // could be first bad
      right = mid - 1;  // search left for earlier bad
    } else {
      left = mid + 1;   // mid is good, search right
    }
  }
  return answer;
}

// Template for "find leftmost that satisfies condition"
function binarySearchTemplate(arr, condition) {
  let left = 0, right = arr.length - 1;
  let answer = -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (condition(arr[mid])) {
      answer = mid;     // record this candidate
      right = mid - 1;  // try to find earlier
    } else {
      left = mid + 1;
    }
  }
  return answer;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Binary Search Pattern — First Bad Version
# O(log n)
def first_bad_version(n):
    left, right = 1, n
    answer = -1
    while left <= right:
        mid = (left + right) // 2
        if is_bad_version(mid):
            answer = mid      # candidate
            right = mid - 1   # search left
        else:
            left = mid + 1    # search right
    return answer

# bisect module for sorted arrays
import bisect
# bisect_left: first index where arr[i] >= x
# bisect_right: first index where arr[i] > x
arr = [1, 3, 5, 7, 9]
idx = bisect.bisect_left(arr, 5)  # 2`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Binary Search Pattern — First Bad Version
public int firstBadVersion(int n) {
    int left = 1, right = n, answer = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (isBadVersion(mid)) {
            answer = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    return answer;
}

// Java built-in
int[] arr = {1, 3, 5, 7, 9};
int idx = Arrays.binarySearch(arr, 5); // returns index`,
  },
]

const N = 20

const DOUBTS = [
  {
    q: 'How can I binary search without a sorted array?',
    a: 'You don\'t need a sorted array — you need a **monotonic predicate**: a boolean test that flips exactly once from false to true across your search space. The predicate doesn\'t care about the data structure; it cares about the problem boundary. Examples: "is this commit bad?", "can we finish all tasks within d days?", "can we cut the wood with k saws?". Binary search works by finding that flip point efficiently. The key insight is that once you can evaluate the predicate at a midpoint and definitively discard half the space, binary search applies. You repeatedly halve the search range until the boundary is found. This transforms problems that look array-independent (like finding the square root of 2 or the minimized value for a constraint) into efficient O(log n) or O(log range) solutions.\n**Rule of thumb:** if you can answer yes/no to a midpoint and the answer is monotonic, binary search applies.',
  },
  {
    q: 'What is "binary search on the answer" concretely?',
    a: 'In the Koko eating bananas problem, you can\'t sort the piles or rearrange them — but the answer space (eating speeds from 1 to max pile size) IS implicitly monotonic. If Koko finishes within the time limit eating at speed k, she also finishes at k+1 (faster is always feasible). This monotonicity lets you binary search the answer directly. Instead of trying every speed 1 to max, you guess the midpoint and run an O(n) feasibility check: "can Koko finish these n piles in time at speed mid?" Based on the result, narrow the range and repeat. The complexity is O(n log range), far better than O(n × max) for brute force. This pattern—searching for the minimum/maximum value that satisfies a constraint—appears in many problems: minimum speed, minimum days to finish, maximum allocated budget, etc.\n**Common mistake:** trying to binary search without verifying the predicate is monotonic in the answer space.',
  },
  {
    q: 'How do I find the FIRST valid answer rather than any valid one?',
    a: 'When binary searching for the first/leftmost element, the critical difference from a standard binary search is this: on success, do NOT return immediately. Instead, record the candidate (`answer = mid`) and keep searching left (`high = mid - 1`) to see if there\'s an earlier match. The invariant is: after each step, the boundary still lies in `[low, high]`, and you never discard a candidate answer prematurely. This guarantees the loop converges onto the first valid answer. Example: finding the first index where `arr[i] >= target`. When you find a match at index mid, you don\'t know if index mid-1 also matches — you must search left. Conversely, when mid doesn\'t match, you immediately search right because no index before mid will match (the array is sorted). This technique applies to finding leftmost positions, first occurrence of a value, or the minimum that satisfies a constraint.\n**Rule of thumb:** record success and search left; discard immediately only when impossible.',
  },
]

export default function BinarySearchPatternVisualizer() {
  const [bad, setBad] = useState(14)
  const steps = findFirstBadSteps(N, bad)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const versions = Array.from({ length: N }, (_, i) => i + 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Binary Search Pattern</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Halve the search space on every check — find the boundary of a monotonic condition in O(log n)</p>
        </div>
        <ComplexityBadge time="O(log n)" space="O(1)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A deploy pipeline has 20 sequential commits. One commit introduced a critical bug — everything from that point on is broken.
          Running the full test suite on a commit is expensive. Binary search finds the first bad commit in at most <strong>{Math.ceil(Math.log2(N))} test runs</strong> instead of 20 — the exact same logic as <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">git bisect</code>.
        </p>
      </div>

      <MemoryTip>Find a yes/no boundary — ask the middle and keep the half containing the first change.</MemoryTip>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          You can define a <strong>monotone predicate</strong> over the search space (e.g., "commit is good/bad", "value is too small/large").
          Once you can evaluate a midpoint and definitively discard half the space, binary search applies.
          The space doesn't have to be an explicit array — it can be a range of integers, answer values, or states.
          Classic variants: first/last position of x, minimum in rotated array, square root, minimum time to complete tasks.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-slate-500">First bad commit:</span>
        <input type="number" value={bad} min={1} max={N} onChange={e => { setBad(+e.target.value); ctrl.reset() }}
          className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
        <span className="text-xs text-slate-400">Try any commit 1–{N}</span>
      </label>

      <div className="viz-container p-8">
        <div className="flex justify-center gap-1 flex-wrap">
          {versions.map(v => (
            <div key={v} className="flex flex-col items-center gap-1">
              <div className="h-5 text-xs font-mono">
                {cur.left === v && <span className="text-blue-500 dark:text-blue-400 font-bold">L</span>}
                {cur.mid === v && <span className="text-violet-500 font-bold">M</span>}
                {cur.right === v && <span className="text-rose-500 font-bold">R</span>}
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                cur.answer === v
                  ? 'bg-amber-400 dark:bg-amber-500 text-slate-900 ring-2 ring-amber-300'
                  : cur.mid === v
                  ? 'bg-violet-500 text-white scale-110'
                  : v >= bad
                  ? 'bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                  : cur.left <= v && v <= cur.right
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600'
              }`}>
                {v}
              </div>
              <span className="text-xs">{v >= bad ? '❌' : '✓'}</span>
            </div>
          ))}
        </div>

        {cur.answer !== -1 && (
          <div className="mt-4 flex justify-center">
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-sm font-medium">
              Earliest known bad commit: #{cur.answer}
            </span>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
