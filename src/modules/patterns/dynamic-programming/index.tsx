import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeTabs from '@/components/shared/CodeTabs'

type Problem = 'knapsack' | 'lcs' | 'lis'

// ── 0/1 Knapsack ──────────────────────────────────────────────────────────────
interface KnapsackStep {
  table: number[][]
  highlightCell: [number, number] | null
  i: number; w: number
  message: string
}

function knapsackSteps(weights: number[], values: number[], capacity: number): KnapsackStep[] {
  const n = weights.length
  const table: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0))
  const steps: KnapsackStep[] = []

  steps.push({ table: table.map(r => [...r]), highlightCell: null, i: 0, w: 0, message: `0/1 Knapsack: ${n} items, capacity ${capacity}. Fill DP table bottom-up.` })

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] > w) {
        table[i][w] = table[i - 1][w]
        steps.push({ table: table.map(r => [...r]), highlightCell: [i, w], i, w, message: `Item ${i} (w=${weights[i-1]}, v=${values[i-1]}) doesn't fit in bag of cap ${w}. dp[${i}][${w}] = dp[${i-1}][${w}] = ${table[i][w]}` })
      } else {
        const noTake = table[i - 1][w]
        const take = table[i - 1][w - weights[i - 1]] + values[i - 1]
        table[i][w] = Math.max(noTake, take)
        steps.push({ table: table.map(r => [...r]), highlightCell: [i, w], i, w, message: `Item ${i}: skip=${noTake}, take=${take} (v=${values[i-1]}+dp[${i-1}][${w-weights[i-1]}]). Pick max=${table[i][w]}` })
      }
    }
  }
  steps.push({ table: table.map(r => [...r]), highlightCell: [n, capacity], i: n, w: capacity, message: `Answer: dp[${n}][${capacity}] = ${table[n][capacity]} max value` })
  return steps
}

// ── LCS ───────────────────────────────────────────────────────────────────────
interface LCSStep {
  table: number[][]
  highlightCell: [number, number] | null
  match: boolean
  message: string
}

function lcsSteps(s1: string, s2: string): LCSStep[] {
  const m = s1.length, n = s2.length
  const table: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const steps: LCSStep[] = []

  steps.push({ table: table.map(r => [...r]), highlightCell: null, match: false, message: `LCS of "${s1}" and "${s2}". Build DP table where dp[i][j] = LCS length of s1[0..i-1] and s2[0..j-1].` })

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = s1[i - 1] === s2[j - 1]
      if (match) {
        table[i][j] = table[i - 1][j - 1] + 1
        steps.push({ table: table.map(r => [...r]), highlightCell: [i, j], match: true, message: `s1[${i-1}]='${s1[i-1]}' = s2[${j-1}]='${s2[j-1]}' ✓ Match! dp[${i}][${j}] = dp[${i-1}][${j-1}]+1 = ${table[i][j]}` })
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
        steps.push({ table: table.map(r => [...r]), highlightCell: [i, j], match: false, message: `s1[${i-1}]='${s1[i-1]}' ≠ s2[${j-1}]='${s2[j-1]}'. dp[${i}][${j}] = max(${table[i-1][j]}, ${table[i][j-1]}) = ${table[i][j]}` })
      }
    }
  }
  steps.push({ table: table.map(r => [...r]), highlightCell: [m, n], match: false, message: `LCS length = ${table[m][n]}` })
  return steps
}

// ── LIS ───────────────────────────────────────────────────────────────────────
interface LISStep { dp: number[]; highlight: number; best: number; message: string }

function lisSteps(arr: number[]): LISStep[] {
  const dp = Array(arr.length).fill(1)
  const steps: LISStep[] = [{ dp: [...dp], highlight: -1, best: 1, message: `LIS of [${arr}]. dp[i] = length of longest increasing subsequence ending at i.` }]

  for (let i = 1; i < arr.length; i++) {
    steps.push({ dp: [...dp], highlight: i, best: Math.max(...dp), message: `Compute dp[${i}] for arr[${i}]=${arr[i]}` })
    for (let j = 0; j < i; j++) {
      if (arr[j] < arr[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1)
        steps.push({ dp: [...dp], highlight: i, best: Math.max(...dp), message: `arr[${j}]=${arr[j]} < arr[${i}]=${arr[i]}: dp[${i}] = max(dp[${i}], dp[${j}]+1) = ${dp[i]}` })
      }
    }
  }
  const lis = Math.max(...dp)
  steps.push({ dp: [...dp], highlight: dp.indexOf(lis), best: lis, message: `LIS length = ${lis}` })
  return steps
}

// Space mission: pack experiments within a 12kg cargo limit
const WEIGHTS = [2, 3, 4, 5, 6, 7]
const VALUES  = [3, 5, 8, 6, 10, 9]
const CAP = 12

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Bottom-up DP (Tabulation)
// Solve sub-problems iteratively, store in table

// 0/1 Knapsack — O(n × capacity) time & space
function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({length: n+1}, () => Array(capacity+1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i-1][w]; // don't take item i
      if (weights[i-1] <= w) {
        dp[i][w] = Math.max(
          dp[i][w],
          dp[i-1][w-weights[i-1]] + values[i-1] // take item i
        );
      }
    }
  }
  return dp[n][capacity];
}

// LCS — O(m × n) time & space
function lcs(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i-1] === s2[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// LIS — O(n²) — binary search gives O(n log n)
function lis(arr) {
  const dp = Array(arr.length).fill(1);
  for (let i = 1; i < arr.length; i++)
    for (let j = 0; j < i; j++)
      if (arr[j] < arr[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return Math.max(...dp);
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Bottom-up DP (Tabulation)

# 0/1 Knapsack — O(n × capacity)
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i-1][w]  # skip item i
            if weights[i-1] <= w:
                dp[i][w] = max(
                    dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1]
                )
    return dp[n][capacity]

# LCS — O(m × n)
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

# LIS — O(n²), binary search variant is O(n log n)
def lis(arr):
    dp = [1] * len(arr)
    for i in range(1, len(arr)):
        for j in range(i):
            if arr[j] < arr[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// 0/1 Knapsack — O(n × capacity)
public int knapsack(int[] w, int[] v, int cap) {
    int n = w.length;
    int[][] dp = new int[n + 1][cap + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i-1][c];
            if (w[i-1] <= c)
                dp[i][c] = Math.max(dp[i][c],
                    dp[i-1][c-w[i-1]] + v[i-1]);
        }
    return dp[n][cap];
}

// LCS — O(m × n)
public int lcs(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m+1][n+1];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            if (s1.charAt(i-1) == s2.charAt(j-1))
                dp[i][j] = dp[i-1][j-1] + 1;
            else
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}`,
  },
]

const DOUBTS = [
  {
    q: 'Memoization (top-down) vs tabulation (bottom-up) — which do I write?',
    a: 'Same subproblems, different driver. Top-down (memoization) is faster to write: take your recursive brute-force solution and add a cache (`memo = {}`). It only computes states you actually need, so on sparse problem spaces (e.g., only a few knapsack weights matter), it skips the rest. Bottom-up (tabulation) avoids recursion depth limits—no stack overflow on deep problems—and unlocks space optimizations: you can loop from base cases upward and keep only the previous row instead of the full 2D table (e.g., in coin change, store one row and slide it forward). Both give the same time complexity; the choice depends on problem shape and coding comfort.\n\n**Rule of thumb:** Start with top-down if you can write the recursion easily; convert to bottom-up if you hit stack limits or need space optimization.',
  },
  {
    q: 'How do I recognize a DP problem?',
    a: 'Two ingredients unlock the pattern. First, overlapping subproblems: the same smaller question recurs multiple times across different branches (e.g., `fib(3)` appears twice in the recursion tree for `fib(5)`). Second, optimal substructure: the best answer for a large problem builds from best sub-answers (the best path to destination X must contain the best path to some intermediate waypoint Y). Trigger phrases reveal DP situations: "count the ways to...", "find minimum cost to...", "maximize profit from...", or "choose items subject to constraints". If every decision at every step matters and you can define a state capturing those choices, DP likely applies.\n\n**Common mistake:** Confusing greedy optimization with DP—just because a problem has choices does not mean greedy works.',
  },
  {
    q: 'Where do people actually get stuck?',
    a: 'Defining the state is the hardest part. Before writing a single line of code, write one sentence: "dp[i] = the best X considering the first i items" or "dp[i][j] = the best Y considering items 0..i-1 with capacity j". If the recurrence relationship does not naturally fall out of that definition, the state is incomplete—you need to add a dimension. For example, in LIS, "dp[i] = longest increasing subsequence" is too vague; you must say "dp[i] = longest increasing subsequence **ending at index i**". In knapsack, "dp[i] = best value" needs the capacity: "dp[i][w] = best value using items 0..i-1 with remaining capacity w". Spend 10 minutes on the state definition; the code will write itself.\n\n**Rule of thumb:** Your state sentence should answer "what does this cell represent?" so clearly that a teammate understands the entire problem without code.',
  },
  {
    q: 'Why does greedy fail where DP works?',
    a: 'Greedy locks in the locally best move at each step and never reconsiders; DP explores all choices at each state and picks the one leading to the global optimum. The difference is stark in problems with "traps"—states where the locally best choice blocks the globally best path. Coin change with coins `{1, 3, 4}` and target 6 shows this: greedy picks the largest coin (4), leaving 2, then takes 1+1, yielding three coins total. DP evaluates `3+3=6` (two coins) and recognizes it as better. Other trap examples: the longest path in a DAG (greedy picks one edge, misses better detours), or scheduling jobs with deadlines (greedy by earliest deadline can conflict; DP respects constraints).\n\n**Common mistake:** Assuming greedy works because it feels efficient—always verify on a multi-choice problem with an edge case that breaks the greedy heuristic.',
  },
]

export default function DynamicProgrammingVisualizer() {
  const [problem, setProblem] = useState<Problem>('knapsack')
  const [s1] = useState('AGGTCAB')
  const [s2] = useState('GXTXAYB')
  const [lisArr] = useState([10, 9, 2, 5, 3, 7, 101, 18, 4, 6])

  const knapsackSt = knapsackSteps(WEIGHTS, VALUES, CAP)
  const lcsSt = lcsSteps(s1.slice(0, 5), s2.slice(0, 4))
  const lisSt = lisSteps(lisArr)

  const steps = problem === 'knapsack' ? knapsackSt : problem === 'lcs' ? lcsSt : lisSt
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step] as any

  const cellBg = (i: number, j: number) => {
    if (!cur.highlightCell) return ''
    if (cur.highlightCell[0] === i && cur.highlightCell[1] === j) return cur.match ? 'bg-emerald-400 dark:bg-emerald-600 text-white' : 'bg-violet-500 text-white'
    return ''
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dynamic Programming (Tabulation)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Build optimal solutions iteratively — fill a table from base cases up to the answer</p>
        </div>
        <ComplexityBadge time="O(n²) or O(m×n)" space="O(n²) table" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenarios</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Knapsack:</strong> A space shuttle has a 12 kg cargo limit. Choose which science experiments to pack to maximise total research value.
          <strong> LCS:</strong> A bioinformatics tool compares two DNA strands to find the longest common subsequence — useful for measuring genetic similarity.
          <strong> LIS:</strong> A stock analyst finds the longest streak of days where prices trended upward (non-consecutive allowed) — reveals the underlying growth pattern.
        </p>
      </div>

      <MemoryTip>DP means define the state, write the transition, seed the base case, and choose the fill order.</MemoryTip>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Bottom-up (tabulation) vs Top-down (memoization)</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Both give the same result. Tabulation iterates from the smallest sub-problem upward — no recursion, no call-stack overhead, and better CPU cache behaviour (sequential memory access).
          Memoization is often easier to derive (start from the recursive solution, add a cache).
          For very large inputs or when only a few sub-problems are needed, memoization skips the rest — tabulation always fills the full table.
        </p>
      </div>

      {/* Problem picker */}
      <div className="flex gap-2 flex-wrap">
        {([['knapsack', '0/1 Knapsack'], ['lcs', 'LCS'], ['lis', 'LIS']] as [Problem, string][]).map(([p, label]) => (
          <button key={p} onClick={() => { setProblem(p); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              problem === p ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Item list for knapsack */}
      {problem === 'knapsack' && (
        <div className="flex gap-3 flex-wrap">
          {WEIGHTS.map((w, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center text-sm">
              <div className="font-bold text-slate-700 dark:text-slate-200">Exp. {i + 1}</div>
              <div className="text-xs text-slate-500">{w} kg</div>
              <div className="text-xs text-violet-600 dark:text-violet-400">value: {VALUES[i]}</div>
            </div>
          ))}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center text-sm">
            <div className="font-bold text-amber-700 dark:text-amber-300">Cargo limit</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{CAP} kg</div>
          </div>
        </div>
      )}

      <div className="viz-container p-4 overflow-auto">
        {/* Knapsack table */}
        {problem === 'knapsack' && cur.table && (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-slate-500">i\w</th>
                  {Array.from({ length: CAP + 1 }, (_, w) => (
                    <th key={w} className="px-2 py-1 text-slate-500 w-8">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cur.table.map((row: number[], i: number) => (
                  <tr key={i}>
                    <td className="px-2 py-1 text-slate-500 font-medium">{i === 0 ? '—' : `${i}`}</td>
                    {row.map((val: number, j: number) => (
                      <td key={j} className={`px-2 py-1 text-center font-mono rounded transition-colors ${cellBg(i, j) || (val > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600')}`}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LCS table */}
        {problem === 'lcs' && cur.table && (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-slate-500">—</th>
                  <th className="px-2 py-1 text-slate-500">ε</th>
                  {[...s1.slice(0, 5)].map((c, j) => <th key={j} className="px-2 py-1 text-violet-600 dark:text-violet-400 font-bold w-8">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {cur.table.map((row: number[], i: number) => (
                  <tr key={i}>
                    <td className="px-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold">{i === 0 ? 'ε' : s2[i - 1]}</td>
                    {row.map((val: number, j: number) => (
                      <td key={j} className={`px-2 py-1 text-center font-mono font-bold rounded transition-colors ${cellBg(i, j) || (val > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600')}`}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LIS bars */}
        {problem === 'lis' && cur.dp && (
          <div className="space-y-4">
            <div className="flex items-end gap-3 justify-center h-32">
              {lisArr.map((val, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500 font-mono">{val}</span>
                  <div className={`w-10 rounded-t-lg transition-all duration-300 ${cur.highlight === i ? 'bg-violet-500' : cur.dp[i] > 1 ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    style={{ height: `${(val / Math.max(...lisArr)) * 100}px` }} />
                  <div className={`text-xs font-bold font-mono ${cur.highlight === i ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500'}`}>
                    dp={cur.dp[i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Current LIS length: {cur.best}
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
      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
