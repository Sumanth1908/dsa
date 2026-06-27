import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step { array: number[]; left: number; right: number; windowSum: number; maxSum: number; bestLeft: number; bestRight: number; message: string }

// API latency readings (ms) over 12 seconds
const LATENCY = [8, 3, 12, 5, 2, 15, 7, 9, 14, 6, 11, 4]

function maxSubarraySteps(arr: number[], k: number): Step[] {
  const steps: Step[] = [{
    array: arr, left: 0, right: -1, windowSum: 0, maxSum: -Infinity, bestLeft: 0, bestRight: k - 1,
    message: `Monitor ${arr.length} seconds of latency data. Slide a ${k}-second window to find the peak load period.`
  }]
  let windowSum = 0, maxSum = -Infinity, bestLeft = 0, bestRight = k - 1

  for (let i = 0; i < k; i++) {
    windowSum += arr[i]
    steps.push({ array: arr, left: 0, right: i, windowSum, maxSum, bestLeft, bestRight, message: `Building initial window: include t=${i}s [${arr[i]}ms], running total = ${windowSum}ms` })
  }
  maxSum = windowSum
  steps.push({ array: arr, left: 0, right: k - 1, windowSum, maxSum, bestLeft: 0, bestRight: k - 1, message: `Initial window [t=0–${k - 1}s]: total latency = ${windowSum}ms. This is the baseline to beat.` })

  for (let i = k; i < arr.length; i++) {
    const removed = arr[i - k]
    windowSum += arr[i] - removed
    steps.push({ array: arr, left: i - k + 1, right: i, windowSum, maxSum, bestLeft, bestRight, message: `Slide: drop t=${i - k}s [${removed}ms], add t=${i}s [${arr[i]}ms] → window total = ${windowSum}ms` })
    if (windowSum > maxSum) {
      maxSum = windowSum; bestLeft = i - k + 1; bestRight = i
      steps.push({ array: arr, left: i - k + 1, right: i, windowSum, maxSum, bestLeft, bestRight, message: `New peak! [t=${i - k + 1}–${i}s] = ${windowSum}ms — investigate this interval.` })
    }
  }
  steps.push({ array: arr, left: bestLeft, right: bestRight, windowSum: maxSum, maxSum, bestLeft, bestRight, message: `Done! Highest latency window: t=${bestLeft}–${bestRight}s, total = ${maxSum}ms. That's where the bottleneck is.` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Sliding Window — O(n) time, O(1) space
// Add the new element, remove the leftmost — no recomputation

// Fixed-size window: max sum subarray of size k
function maxSumSubarray(arr, k) {
  let windowSum = 0, maxSum = -Infinity, bestLeft = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];
  maxSum = windowSum;

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k]; // slide: add new, drop old
    if (windowSum > maxSum) { maxSum = windowSum; bestLeft = i - k + 1; }
  }
  return { maxSum, from: bestLeft, to: bestLeft + k - 1 };
}

// Variable-size window: longest substring without repeat chars
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0, maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    if (lastSeen.has(s[right]))
      left = Math.max(left, lastSeen.get(s[right]) + 1); // shrink left
    lastSeen.set(s[right], right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

// Variable-size window: min subarray sum ≥ target
function minSubarrayLen(target, nums) {
  let left = 0, sum = 0, min = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      min = Math.min(min, right - left + 1);
      sum -= nums[left++]; // shrink window
    }
  }
  return min === Infinity ? 0 : min;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Sliding Window — O(n) time, O(1) space

# Fixed-size: max sum subarray of size k
def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])
    max_sum, best_left = window_sum, 0
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]  # slide
        if window_sum > max_sum:
            max_sum, best_left = window_sum, i - k + 1
    return max_sum, best_left, best_left + k - 1

# Variable-size: longest substring with at most k distinct chars
def longest_k_distinct(s, k):
    count = {}
    left = max_len = 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:          # shrink until valid
            count[s[left]] -= 1
            if count[s[left]] == 0: del count[s[left]]
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len

# Minimum window substring (contains all chars of t)
from collections import Counter
def min_window(s, t):
    need, missing = Counter(t), len(t)
    best, left = "", 0
    for right, ch in enumerate(s, 1):
        missing -= need[ch] > 0
        need[ch] -= 1
        if not missing:
            while need[s[left]] < 0: need[s[left]] += 1; left += 1
            if not best or right - left < len(best): best = s[left:right]
            need[s[left]] += 1; left += 1; missing = 1
    return best`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Sliding Window — O(n) time, O(1) space

// Fixed-size: max sum subarray of size k
public int maxSumSubarray(int[] arr, int k) {
    int windowSum = 0, maxSum = Integer.MIN_VALUE;
    for (int i = 0; i < k; i++) windowSum += arr[i];
    maxSum = windowSum;
    for (int i = k; i < arr.length; i++) {
        windowSum += arr[i] - arr[i - k]; // slide
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}

// Variable-size: min length subarray with sum ≥ target
public int minSubarrayLen(int target, int[] nums) {
    int left = 0, sum = 0, min = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            min = Math.min(min, right - left + 1);
            sum -= nums[left++]; // shrink
        }
    }
    return min == Integer.MAX_VALUE ? 0 : min;
}`,
  },
]

export default function SlidingWindowVisualizer() {
  const [k, setK] = useState(4)
  const steps = maxSubarraySteps(LATENCY, Math.min(k, LATENCY.length))
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sliding Window Pattern</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Slide a window across data — add the new element, drop the old one, never recompute the whole window</p>
        </div>
        <ComplexityBadge time="O(n)" space="O(1)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Your infrastructure team records API response latency (ms) every second for 12 seconds.
          An alert fires but you need to pinpoint which 4-second period caused the most total delay —
          the likely epicenter of the slowdown. Recomputing the full window sum from scratch every step would be O(k·n).
          The sliding window trick does it in O(n): just subtract the element that left and add the one that arrived.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Problem asks about a <strong>contiguous subarray or substring</strong>.
          Fixed window: size k is given (max/min sum over exactly k elements).
          Variable window: size adjusts to meet a condition (longest substring with at most k distinct chars, minimum window containing all target chars).
          Key signal: "longest/shortest/maximum/minimum contiguous…"
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Window size (seconds):</span>
        {[3, 4, 5].map(v => (
          <button key={v} onClick={() => { setK(v); ctrl.reset() }}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${k === v ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {v}
          </button>
        ))}
      </label>

      <div className="viz-container p-8">
        <div className="flex justify-center gap-2 flex-wrap relative">
          {cur.right >= cur.left && (
            <div
              className="absolute top-0 h-full rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-400 dark:border-emerald-600 transition-all duration-300 pointer-events-none"
              style={{
                left: `${cur.left * 56 + cur.left * 8}px`,
                width: `${(cur.right - cur.left + 1) * 56 + (cur.right - cur.left) * 8}px`,
              }}
            />
          )}

          {cur.array.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                cur.left <= i && i <= cur.right
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {val}
              </div>
              <span className="text-xs text-slate-400 font-mono">t={i}s</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          <div className="text-center bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Window Sum</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{cur.windowSum < 0 ? '—' : cur.windowSum + 'ms'}</div>
          </div>
          <div className="text-center bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-3">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Peak So Far</div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{cur.maxSum === -Infinity ? '—' : cur.maxSum + 'ms'}</div>
          </div>
          <div className="text-center bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3">
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Best Window</div>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300">t={cur.bestLeft}–{cur.bestRight}s</div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
