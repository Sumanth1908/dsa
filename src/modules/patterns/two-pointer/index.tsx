import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step { array: number[]; left: number; right: number; sum: number; target: number; found: boolean; message: string }

// Prices in a bookshop, already sorted on the display shelf
const PRICES = [4, 9, 13, 18, 22, 27, 33, 38, 44, 51]

function twoSumSteps(arr: number[], target: number): Step[] {
  const sorted = [...arr].sort((a, b) => a - b)
  const steps: Step[] = [{
    array: sorted, left: 0, right: sorted.length - 1, sum: 0, target, found: false,
    message: `Gift card value: $${target}. Books on shelf: [${sorted.map(p => '$' + p).join(', ')}]. Start with cheapest (L) and most expensive (R).`
  }]
  let left = 0, right = sorted.length - 1

  while (left < right) {
    const sum = sorted[left] + sorted[right]
    const msg =
      sum === target
        ? `"$${sorted[left]}" + "$${sorted[right]}" = $${sum} — exact match! Perfect pair found.`
        : sum < target
          ? `$${sorted[left]} + $${sorted[right]} = $${sum} — under budget by $${target - sum}. Left book too cheap, try the next one up.`
          : `$${sorted[left]} + $${sorted[right]} = $${sum} — over budget by $${sum - target}. Right book too expensive, try a cheaper one.`
    steps.push({ array: sorted, left, right, sum, target, found: sum === target, message: msg })
    if (sum === target) return steps
    if (sum < target) left++
    else right--
  }
  steps.push({ array: sorted, left, right, sum: 0, target, found: false, message: `No two books total exactly $${target}. Customer needs a different budget.` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Two Pointer — O(n) time, O(1) space
// Requires sorted array. Eliminates O(n²) brute force.
function twoSum(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right]; // found!
    if (sum < target) left++;   // too small — increase left
    else              right--;  // too large — decrease right
  }
  return [-1, -1];
}

// Three Sum — O(n²) — sort then two-pointer for each element
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip dups
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) { result.push([nums[i], nums[left++], nums[right--]]); }
      else if (sum < 0) left++;
      else right--;
    }
  }
  return result;
}

// Container With Most Water — O(n)
function maxWater(height) {
  let left = 0, right = height.length - 1, max = 0;
  while (left < right) {
    max = Math.max(max, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return max;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Two Pointer — O(n) time, O(1) space
# Array must be sorted first.
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target: return [left, right]
        elif s < target: left += 1   # too small
        else:            right -= 1  # too large
    return [-1, -1]

# Remove duplicates in-place — O(n), two "same direction" pointers
def remove_duplicates(arr):
    if not arr: return 0
    slow = 0
    for fast in range(1, len(arr)):
        if arr[fast] != arr[slow]:
            slow += 1
            arr[slow] = arr[fast]
    return slow + 1  # new length

# Reverse array in-place
def reverse(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1; right -= 1`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Two Pointer — O(n) time, O(1) space
public int[] twoSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return new int[]{left, right};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{-1, -1};
}

// Palindrome check — classic two-pointer
public boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++; right--;
    }
    return true;
}`,
  },
]

export default function TwoPointerVisualizer() {
  const [target, setTarget] = useState(60)
  const steps = twoSumSteps(PRICES, target)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Two Pointer Pattern</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">One pointer at each end of a sorted array, converging inward — turns O(n²) pair search into O(n)</p>
        </div>
        <ComplexityBadge time="O(n)" space="O(1)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A bookshop displays 10 titles sorted by price on a shelf. A customer hands over a $60 gift card and wants to spend exactly that amount on two books.
          Checking every pair would be O(n²). Two pointers let you do it in one pass — if the current pair is too cheap, advance the left pointer for a pricier book; too expensive, retreat the right pointer.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          <strong>Sorted array</strong> + find a <strong>pair or triplet</strong> satisfying a constraint (sum, product, difference).
          The trick: because the array is sorted, a too-small sum tells you definitively to increase the left pointer, and a too-large sum tells you to decrease the right — no backtracking needed.
          Also works for: removing duplicates in-place, container with most water, trapping rainwater, palindrome check.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Gift card ($):</span>
        <input type="number" value={target} onChange={e => { setTarget(+e.target.value); ctrl.reset() }}
          className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
        <span className="text-slate-400 text-xs">Try: 42, 60, 71, 88</span>
      </label>

      <div className="viz-container p-8">
        <div className="flex justify-center gap-3 flex-wrap">
          {cur.array.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-6 flex items-center justify-center gap-0.5">
                {i === cur.left  && <span className="text-blue-500 dark:text-blue-400 font-bold text-xs">L</span>}
                {i === cur.right && <span className="text-rose-500 dark:text-rose-400 font-bold text-xs">R</span>}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                cur.found && (i === cur.left || i === cur.right)
                  ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 scale-110'
                  : i === cur.left
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 scale-105'
                  : i === cur.right
                  ? 'border-rose-500 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 scale-105'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                ${val}
              </div>
              <span className="text-xs text-slate-400 font-mono">{i}</span>
            </div>
          ))}
        </div>

        {cur.sum !== 0 && (
          <div className="mt-6 flex justify-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              cur.found ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              ${cur.sum} {cur.found ? `= budget $${cur.target} ✓` : `vs budget $${cur.target}`}
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="text-blue-500 font-bold">L</span> Left pointer (cheaper)</span>
        <span className="flex items-center gap-1"><span className="text-rose-500 font-bold">R</span> Right pointer (pricier)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"></span> Match found</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
