import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

type Problem = 'next-greater' | 'daily-temperatures' | 'largest-rectangle'

// ── Next Greater Element ──────────────────────────────────────────────────────
interface NGEStep {
  arr: number[]
  stack: number[]       // indices
  result: (number | -1)[]
  i: number
  popping: number | null
  action: 'init' | 'push' | 'pop-found' | 'done'
  message: string
}

function ngeSteps(arr: number[]): NGEStep[] {
  const steps: NGEStep[] = []
  const stack: number[] = []   // monotone decreasing stack of indices
  const result: (number | -1)[] = Array(arr.length).fill(-1)

  steps.push({ arr, stack: [], result: [...result], i: -1, popping: null, action: 'init', message: `Next Greater Element for [${arr}]. Stack stores indices in decreasing order of their values.` })

  for (let i = 0; i < arr.length; i++) {
    steps.push({ arr, stack: [...stack], result: [...result], i, popping: null, action: 'init', message: `Process arr[${i}]=${arr[i]}. Stack top: ${stack.length ? arr[stack[stack.length - 1]] : 'empty'}` })

    while (stack.length && arr[stack[stack.length - 1]] < arr[i]) {
      const idx = stack.pop()!
      result[idx] = arr[i]
      steps.push({ arr, stack: [...stack], result: [...result], i, popping: idx, action: 'pop-found', message: `arr[${idx}]=${arr[idx]} < arr[${i}]=${arr[i]} → NGE(${arr[idx]}) = ${arr[i]}. Pop idx ${idx}.` })
    }

    stack.push(i)
    steps.push({ arr, stack: [...stack], result: [...result], i, popping: null, action: 'push', message: `Push index ${i} (value ${arr[i]}) onto stack. Stack values: [${stack.map(s => arr[s])}]` })
  }

  steps.push({ arr, stack: [], result: [...result], i: arr.length, popping: null, action: 'done', message: `Done! Elements with no greater element to the right → -1. Result: [${result}]` })
  return steps
}

// ── Daily Temperatures ────────────────────────────────────────────────────────
interface TempStep {
  temps: number[]
  stack: number[]
  result: number[]
  i: number
  action: 'init' | 'push' | 'pop' | 'done'
  message: string
}

function dailyTempSteps(temps: number[]): TempStep[] {
  const steps: TempStep[] = []
  const stack: number[] = []
  const result: number[] = Array(temps.length).fill(0)

  steps.push({ temps, stack: [], result: [...result], i: -1, action: 'init', message: `Daily Temperatures: how many days until warmer? Stack stores indices in decreasing order of temperature.` })

  for (let i = 0; i < temps.length; i++) {
    steps.push({ temps, stack: [...stack], result: [...result], i, action: 'init', message: `Day ${i}: temp=${temps[i]}°` })

    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const idx = stack.pop()!
      result[idx] = i - idx
      steps.push({ temps, stack: [...stack], result: [...result], i, action: 'pop', message: `temps[${idx}]=${temps[idx]}° < temps[${i}]=${temps[i]}°: wait ${i - idx} day(s). result[${idx}]=${i - idx}` })
    }
    stack.push(i)
    steps.push({ temps, stack: [...stack], result: [...result], i, action: 'push', message: `Push day ${i} (${temps[i]}°) onto stack.` })
  }

  steps.push({ temps, stack: [], result: [...result], i: temps.length, action: 'done', message: `Done! Days to wait: [${result}]. 0 means no warmer day found.` })
  return steps
}

// ── Largest Rectangle in Histogram ───────────────────────────────────────────
interface RectStep {
  bars: number[]
  stack: number[]
  maxArea: number
  currentArea: number | null
  i: number
  action: 'init' | 'push' | 'pop' | 'done'
  message: string
}

function largestRectSteps(bars: number[]): RectStep[] {
  const steps: RectStep[] = []
  const extended = [...bars, 0]  // sentinel
  const stack: number[] = []
  let maxArea = 0

  steps.push({ bars, stack: [], maxArea: 0, currentArea: null, i: -1, action: 'init', message: `Largest Rectangle in Histogram. Stack stores indices with non-decreasing heights.` })

  for (let i = 0; i <= bars.length; i++) {
    const h = i < bars.length ? bars[i] : 0
    steps.push({ bars, stack: [...stack], maxArea, currentArea: null, i, action: 'init', message: i < bars.length ? `Bar ${i}: height=${h}. Stack top height: ${stack.length ? bars[stack[stack.length - 1]] : 'none'}` : `Sentinel 0: drain the stack.` })

    while (stack.length && (i >= bars.length || bars[stack[stack.length - 1]] > h)) {
      const height = bars[stack.pop()!]
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1
      const area = height * width
      if (area > maxArea) maxArea = area
      steps.push({ bars, stack: [...stack], maxArea, currentArea: area, i, action: 'pop', message: `Pop: height=${height}, width=${width} → area=${area}. Max so far: ${maxArea}` })
    }

    if (i < bars.length) {
      stack.push(i)
      steps.push({ bars, stack: [...stack], maxArea, currentArea: null, i, action: 'push', message: `Push index ${i} (height ${h}).` })
    }
  }

  steps.push({ bars, stack: [], maxArea, currentArea: maxArea, i: bars.length, action: 'done', message: `Largest rectangle area = ${maxArea}` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Monotonic Stack — O(n) amortized (each element pushed/popped once)
// Pattern: maintain stack in monotone order, pop when invariant breaks

// Next Greater Element — O(n)
function nextGreater(nums) {
  const result = Array(nums.length).fill(-1);
  const stack = []; // indices, decreasing values
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i]) {
      result[stack.pop()] = nums[i]; // found NGE!
    }
    stack.push(i);
  }
  return result; // unpopped = no greater element → -1
}

// Daily Temperatures — O(n)
function dailyTemperatures(T) {
  const res = Array(T.length).fill(0);
  const stack = []; // indices, decreasing temperatures
  for (let i = 0; i < T.length; i++) {
    while (stack.length && T[stack.at(-1)] < T[i]) {
      const idx = stack.pop();
      res[idx] = i - idx; // days waited
    }
    stack.push(i);
  }
  return res;
}

// Largest Rectangle in Histogram — O(n)
function largestRectangleArea(heights) {
  const stack = []; // increasing height indices
  let max = 0;
  heights.push(0); // sentinel to flush stack
  for (let i = 0; i < heights.length; i++) {
    while (stack.length && heights[stack.at(-1)] > heights[i]) {
      const h = heights[stack.pop()];
      const w = stack.length ? i - stack.at(-1) - 1 : i;
      max = Math.max(max, h * w);
    }
    stack.push(i);
  }
  return max;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Monotonic Stack — O(n) each element pushed/popped at most once

# Next Greater Element
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # indices with decreasing values
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            result[stack.pop()] = n  # found NGE
        stack.append(i)
    return result

# Daily Temperatures
def daily_temperatures(T):
    res = [0] * len(T)
    stack = []
    for i, temp in enumerate(T):
        while stack and T[stack[-1]] < temp:
            idx = stack.pop()
            res[idx] = i - idx
        stack.append(i)
    return res

# Largest Rectangle in Histogram
def largest_rectangle_area(heights):
    heights.append(0)  # sentinel
    stack = []  # increasing height indices
    max_area = 0
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area

# When to use monotonic stack:
# - Next/Previous Greater/Smaller element
# - Stock Span problem
# - Trapping Rainwater
# - Largest Rectangle in Histogram
# - Remove K Digits`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.Deque;
import java.util.ArrayDeque;

// Next Greater Element — O(n)
public int[] nextGreaterElement(int[] nums) {
    int[] result = new int[nums.length];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // indices
    for (int i = 0; i < nums.length; i++) {
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i])
            result[stack.pop()] = nums[i];
        stack.push(i);
    }
    return result;
}

// Daily Temperatures — O(n)
public int[] dailyTemperatures(int[] T) {
    int[] res = new int[T.length];
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < T.length; i++) {
        while (!stack.isEmpty() && T[stack.peek()] < T[i])
            res[stack.peek()] = i - stack.pop();
        stack.push(i);
    }
    return res;
}

// Largest Rectangle — O(n)
public int largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    int max = 0;
    for (int i = 0; i <= heights.length; i++) {
        int h = i == heights.length ? 0 : heights[i];
        while (!stack.isEmpty() && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            max = Math.max(max, height * width);
        }
        stack.push(i);
    }
    return max;
}`,
  },
]

const ACTION_STYLE: Record<string, string> = {
  init:     'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  push:     'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  'pop-found': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  pop:      'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  done:     'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
}

// Stock prices for 10 days; temperatures over 10 days; building skyline
const BAR_PRESETS = {
  'next-greater':       [5, 8, 3, 11, 7, 2, 15, 9, 4, 6],
  'daily-temperatures': [65, 72, 68, 74, 61, 75, 81, 78, 70, 73],
  'largest-rectangle':  [2, 1, 5, 6, 3, 4, 7, 2],
}

export default function MonotonicStackVisualizer() {
  const [problem, setProblem] = useState<Problem>('next-greater')

  const bars = BAR_PRESETS[problem]
  const steps = problem === 'next-greater'
    ? ngeSteps(bars as number[])
    : problem === 'daily-temperatures'
      ? dailyTempSteps(bars as number[])
      : largestRectSteps(bars as number[])

  const ctrl = useSteps(steps.length)
  const cur  = steps[ctrl.step] as any

  const result: (number | -1)[] = cur.result ?? []
  const stackIndices: number[] = cur.stack ?? []
  const currentI: number = cur.i ?? -1
  const maxH = Math.max(...bars, 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monotonic Stack</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Keep the stack in sorted order — when the invariant breaks, you've just found the answer for the popped elements</p>
        </div>
        <ComplexityBadge time="O(n) amortized" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Next Greater Element:</strong> A stock trading alert system. For each day's closing price, how many days forward until the stock hits a new high? Traders use this to time "hold" decisions.
          <strong> Daily Temperatures:</strong> A weather app shows "you'll need to wait N days for a warmer day" for each day's forecast.
          <strong> Largest Rectangle:</strong> A city planner calculates the largest rectangular billboard that fits within a building skyline — a common coding interview classic.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How the trick works</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Maintain a stack that holds candidates in monotone order. When a new element breaks the order, the element you pop has just found its answer: the new element is its "next greater".
          Monotone <strong>decreasing</strong> stack: pop on larger (NGE, temperatures, stock span).
          Monotone <strong>increasing</strong> stack: pop on smaller (largest rectangle, trapping rain water).
          Every element is pushed and popped at most once → O(n) amortised despite the nested loop appearance.
        </p>
      </div>

      {/* Problem picker */}
      <div className="flex gap-2 flex-wrap">
        {([['next-greater', 'Next Greater Element'], ['daily-temperatures', 'Daily Temperatures'], ['largest-rectangle', 'Largest Rectangle']] as [Problem, string][]).map(([p, label]) => (
          <button key={p} onClick={() => { setProblem(p); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              problem === p ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="viz-container p-6 space-y-6">
        {/* Bar chart */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {problem === 'next-greater' ? 'Stock Prices (10 days)' : problem === 'daily-temperatures' ? 'Temperature Forecast (°F)' : 'Building Heights (skyline)'}
          </h4>
          <div className="flex items-end gap-2 h-32">
            {bars.map((v, i) => {
              const onStack = stackIndices.includes(i)
              const isCurrent = i === currentI
              const hasResult = result[i] !== undefined && result[i] !== -1 && result[i] !== 0
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  {/* Result label */}
                  <div className={`text-xs font-bold h-4 text-center ${hasResult ? 'text-emerald-600 dark:text-emerald-400' : result[i] === -1 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {result[i] !== undefined && result[i] !== 0 ? (result[i] === -1 ? '—' : result[i]) : ''}
                  </div>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 ${
                      isCurrent ? 'bg-violet-500 ring-2 ring-violet-400' :
                      onStack ? 'bg-amber-400 dark:bg-amber-600' :
                      hasResult ? 'bg-emerald-400 dark:bg-emerald-600 opacity-60' :
                      'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ height: `${(v / maxH) * 90}px` }}
                  />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{v}</span>
                  <span className="text-xs text-slate-400">{i}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stack state */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stack (indices)</h4>
            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl min-h-16 p-2 flex flex-col-reverse gap-1 overflow-y-auto max-h-32">
              {stackIndices.map(idx => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-mono">
                  <span>idx={idx}</span>
                  <span className="text-amber-500">val={bars[idx]}</span>
                </div>
              ))}
              {stackIndices.length === 0 && <div className="text-xs text-slate-400 text-center py-1">empty</div>}
            </div>
          </div>

          {/* Result array */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {problem === 'next-greater' ? 'Next Greater (−1 if none)' : problem === 'daily-temperatures' ? 'Days to Wait (0 = none)' : 'Max Area Progress'}
            </h4>
            <div className="flex flex-wrap gap-1">
              {problem !== 'largest-rectangle' ? result.map((v, i) => (
                <div key={i} className={`w-10 h-10 rounded-xl text-xs font-mono flex items-center justify-center font-bold ${
                  v === -1 || v === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {v === -1 ? '—' : v}
                </div>
              )) : (
                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {cur.maxArea ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-2">max area</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action + message */}
        <div className="flex flex-col items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${ACTION_STYLE[cur.action] ?? ''}`}>
            {cur.action}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block"></span> Current element</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> On stack</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"></span> Result found</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
