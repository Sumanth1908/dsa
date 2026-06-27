import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

type Problem = 'permutations' | 'subsets' | 'nqueens'

const CITIES = ['Austin', 'Boston', 'Chicago', 'Denver']

interface PermStep {
  current: string[]
  remaining: string[]
  results: string[][]
  action: 'enter' | 'choose' | 'backtrack' | 'result'
  message: string
}

function permutationSteps(cities: string[]): PermStep[] {
  const steps: PermStep[] = []
  const results: string[][] = []
  const total = cities.reduce((a, _, i) => a * (i + 1), 1)

  function bt(current: string[], remaining: string[]) {
    steps.push({ current: [...current], remaining: [...remaining], results: results.map(r => [...r]), action: 'enter', message: `Route so far: [${current.join(' → ') || 'none'}]. Still to visit: ${remaining.length > 0 ? remaining.join(', ') : 'all done'}` })
    if (remaining.length === 0) {
      results.push([...current])
      steps.push({ current: [...current], remaining: [], results: results.map(r => [...r]), action: 'result', message: `Itinerary #${results.length} of ${total}: ${current.join(' → ')}` })
      return
    }
    for (const city of remaining) {
      const newRemaining = remaining.filter(c => c !== city)
      steps.push({ current: [...current, city], remaining: newRemaining, results: results.map(r => [...r]), action: 'choose', message: `Fly to ${city} next → [${[...current, city].join(' → ')}]` })
      bt([...current, city], newRemaining)
      steps.push({ current: [...current], remaining: [...remaining], results: results.map(r => [...r]), action: 'backtrack', message: `Dead end — backtrack and try a different city after [${current.join(' → ') || 'start'}]` })
    }
  }

  steps.push({ current: [], remaining: [...cities], results: [], action: 'enter', message: `Road-trip planner: generate all ${cities.length}! = ${total} possible ${cities.length}-city itineraries for ${cities.join(', ')}.` })
  bt([], cities)
  steps.push({ current: [], remaining: [], results: results.map(r => [...r]), action: 'result', message: `All ${results.length} itineraries found! Compare total distances to solve the Travelling Salesman warmup.` })
  return steps
}

const INGREDIENTS = ['Mushroom', 'Cheese', 'Tomato', 'Spinach']

interface SubsetStep {
  current: string[]
  index: number
  results: string[][]
  action: 'enter' | 'include' | 'exclude' | 'result'
  message: string
}

function subsetSteps(items: string[]): SubsetStep[] {
  const steps: SubsetStep[] = []
  const results: string[][] = []
  const total = Math.pow(2, items.length)

  function bt(index: number, current: string[]) {
    results.push([...current])
    steps.push({ current: [...current], index, results: results.map(r => [...r]), action: 'result', message: `Menu option #${results.length}: [${current.join(' + ') || 'plain (no toppings)'}]` })
    for (let i = index; i < items.length; i++) {
      steps.push({ current: [...current, items[i]], index: i, results: results.map(r => [...r]), action: 'include', message: `Add ${items[i]} → current: [${[...current, items[i]].join(' + ')}]` })
      bt(i + 1, [...current, items[i]])
      steps.push({ current: [...current], index: i, results: results.map(r => [...r]), action: 'exclude', message: `Backtrack: skip ${items[i]}, try next topping from current [${current.join(' + ') || 'none'}]` })
    }
  }

  steps.push({ current: [], index: 0, results: [], action: 'enter', message: `Omelette menu builder: generate all 2^${items.length} = ${total} topping combos (including the plain omelette).` })
  bt(0, [])
  steps.push({ current: [], index: items.length, results: results.map(r => [...r]), action: 'result', message: `Menu complete! All ${results.length} omelette variations ready.` })
  return steps
}

interface QueensStep {
  board: (0 | 1 | -1)[][]
  row: number
  action: 'try' | 'place' | 'invalid' | 'backtrack' | 'solution'
  message: string
  solutions: number
}

function nQueensSteps(n: number): QueensStep[] {
  const steps: QueensStep[] = []
  let solutions = 0
  const queens: number[] = []

  const emptyBoard = () => Array.from({ length: n }, () => Array(n).fill(0) as (0 | 1 | -1)[])

  function buildBoard(): (0 | 1 | -1)[][] {
    const b = emptyBoard()
    queens.forEach((col, row) => { b[row][col] = 1 })
    if (queens.length < n) {
      const row = queens.length
      for (let col = 0; col < n; col++) {
        if (!isSafe(row, col)) b[row][col] = -1
      }
    }
    return b
  }

  function isSafe(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      const c = queens[r]
      if (c === col || Math.abs(c - col) === Math.abs(r - row)) return false
    }
    return true
  }

  function bt(row: number) {
    if (row === n) {
      solutions++
      steps.push({ board: buildBoard(), row, action: 'solution', message: `Solution #${solutions}: all ${n} queens placed — no two share a row, column, or diagonal!`, solutions })
      return
    }
    for (let col = 0; col < n; col++) {
      const safe = isSafe(row, col)
      if (!safe) {
        steps.push({ board: buildBoard(), row, action: 'invalid', message: `(row ${row + 1}, col ${col + 1}): under attack — prune this branch`, solutions })
        continue
      }
      steps.push({ board: buildBoard(), row, action: 'try', message: `(row ${row + 1}, col ${col + 1}): safe — place a queen`, solutions })
      queens.push(col)
      steps.push({ board: buildBoard(), row, action: 'place', message: `Queen placed at (${row + 1}, ${col + 1}). Try to fill row ${row + 2}.`, solutions })
      bt(row + 1)
      queens.pop()
      steps.push({ board: buildBoard(), row, action: 'backtrack', message: `No valid placement found in row ${row + 2} — remove queen from (${row + 1}, ${col + 1}) and try next column.`, solutions })
    }
  }

  steps.push({ board: emptyBoard(), row: 0, action: 'try', message: `${n}-Queens: place ${n} queens on a ${n}×${n} board so none threatens another. This is a classic constraint satisfaction — backtracking prunes attacked positions immediately.`, solutions: 0 })
  bt(0)
  steps.push({ board: emptyBoard(), row: n, action: 'solution', message: `Done! ${solutions} valid arrangement${solutions !== 1 ? 's' : ''} found for ${n}-Queens.`, solutions })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Backtracking template — always three steps
function backtrack(path, choices, results) {
  if (isComplete(path)) {
    results.push([...path]); // snapshot the solution
    return;
  }
  for (const choice of choices) {
    if (!isValid(path, choice)) continue; // PRUNE early
    path.push(choice);                    // 1. Choose
    backtrack(path, nextChoices(choices, choice), results);
    path.pop();                           // 3. Un-choose
  }
}

// Permutations — O(n! · n)
function permute(nums) {
  const results = [];
  function bt(path, used) {
    if (path.length === nums.length) { results.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;  path.push(nums[i]);
      bt(path, used);
      path.pop();      used[i] = false;
    }
  }
  bt([], Array(nums.length).fill(false));
  return results;
}

// Subsets / Power Set — O(2^n · n)
function subsets(nums) {
  const results = [];
  function bt(start, path) {
    results.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);  bt(i + 1, path);  path.pop();
    }
  }
  bt(0, []);
  return results;
}

// Combination Sum (reuse elements) with pruning
function combinationSum(candidates, target) {
  const results = [];
  candidates.sort((a, b) => a - b);
  function bt(start, path, rem) {
    if (rem === 0) { results.push([...path]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > rem) break; // PRUNE — sorted, all rest are too big
      path.push(candidates[i]);  bt(i, path, rem - candidates[i]);  path.pop();
    }
  }
  bt(0, [], target);
  return results;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Backtracking — choose → recurse → un-choose
def backtrack(path, choices, results):
    if is_complete(path):
        results.append(path[:])  # snapshot
        return
    for choice in choices:
        if not is_valid(path, choice): continue   # prune
        path.append(choice)                        # choose
        backtrack(path, next_choices(choices, choice), results)
        path.pop()                                 # un-choose

# Permutations
def permute(nums):
    results = []
    def bt(path, remaining):
        if not remaining: results.append(path[:]); return
        for i in range(len(remaining)):
            path.append(remaining[i])
            bt(path, remaining[:i] + remaining[i+1:])
            path.pop()
    bt([], nums); return results

# Subsets
def subsets(nums):
    results = []
    def bt(start, path):
        results.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i]); bt(i+1, path); path.pop()
    bt(0, []); return results

# N-Queens
def solve_n_queens(n):
    results, queens = [], []
    def is_safe(row, col):
        return all(c != col and abs(c-col) != abs(r-row)
                   for r, c in enumerate(queens))
    def bt(row):
        if row == n: results.append(queens[:]); return
        for col in range(n):
            if is_safe(row, col):
                queens.append(col); bt(row+1); queens.pop()
    bt(0); return results`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Permutations — O(n! · n)
public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> results = new ArrayList<>();
    bt(results, new ArrayList<>(), nums, new boolean[nums.length]);
    return results;
}
private void bt(List<List<Integer>> res, List<Integer> path,
                int[] nums, boolean[] used) {
    if (path.size() == nums.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;  path.add(nums[i]);       // choose
        bt(res, path, nums, used);
        path.remove(path.size()-1); used[i] = false; // un-choose
    }
}

// Subsets — O(2^n · n)
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> results = new ArrayList<>();
    btSubsets(results, new ArrayList<>(), nums, 0);
    return results;
}
private void btSubsets(List<List<Integer>> res, List<Integer> path,
                        int[] nums, int start) {
    res.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        btSubsets(res, path, nums, i+1);
        path.remove(path.size()-1);  // backtrack
    }
}`,
  },
]

const ACTION_COLORS: Record<string, string> = {
  enter:     'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  choose:    'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  include:   'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  backtrack: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  exclude:   'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  result:    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  solution:  'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  try:       'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  place:     'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  invalid:   'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
}

export default function BacktrackingVisualizer() {
  const [problem, setProblem] = useState<Problem>('permutations')
  const [n, setN] = useState(3)
  const [queensN, setQueensN] = useState(5)

  const permSteps = permutationSteps(CITIES.slice(0, n))
  const subSteps  = subsetSteps(INGREDIENTS.slice(0, n))
  const queenSt   = nQueensSteps(queensN)

  const steps = problem === 'permutations' ? permSteps : problem === 'subsets' ? subSteps : queenSt
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step] as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Backtracking</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Explore every possibility, prune dead-ends early — a smarter brute force</p>
        </div>
        <ComplexityBadge time="O(n! permutations)" space="O(n) call stack" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenarios</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Permutations:</strong> A road-trip planner generates every possible ordering of cities so you can compare total distances and find the shortest tour.
          <strong> Subsets:</strong> A restaurant menu builder generates every topping combination for a customisable omelette — each ingredient is either in or out.
          <strong> N-Queens:</strong> Place N queens on an N×N chess board so none threatens another — classic constraint satisfaction.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">The template (always three steps)</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          <strong>1. Choose</strong> a candidate.
          <strong> 2. Recurse</strong> with it added to the path.
          <strong> 3. Un-choose (backtrack)</strong> — restore state and try the next option.
          Add a <strong>pruning condition</strong> before recursing to cut branches that can never yield valid solutions.
          That's the difference between backtracking and naïve brute force — you stop exploring early.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['permutations', 'subsets', 'nqueens'] as Problem[]).map(p => (
          <button key={p} onClick={() => { setProblem(p); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              problem === p ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {p === 'nqueens' ? 'N-Queens' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        {(problem === 'permutations' || problem === 'subsets') && (
          <label className="flex items-center gap-2 text-sm ml-2">
            <span className="text-slate-500">{problem === 'permutations' ? 'Cities' : 'Ingredients'}:</span>
            {[3, 4].map(v => (
              <button key={v} onClick={() => { setN(v); ctrl.reset() }}
                className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${n === v ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                {v}
              </button>
            ))}
          </label>
        )}
        {problem === 'nqueens' && (
          <label className="flex items-center gap-2 text-sm ml-2">
            <span className="text-slate-500">N =</span>
            {[4, 5].map(v => (
              <button key={v} onClick={() => { setQueensN(v); ctrl.reset() }}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${queensN === v ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                {v}
              </button>
            ))}
          </label>
        )}
      </div>

      <div className="viz-container p-6">
        {(problem === 'permutations' || problem === 'subsets') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {problem === 'permutations' ? 'Current Route' : 'Current Omelette'}
              </h4>
              <div className="flex items-center gap-1 min-h-14 flex-wrap">
                {cur.current?.length === 0
                  ? <span className="text-slate-400 text-sm italic">nothing chosen yet</span>
                  : cur.current?.map((v: string, i: number) => (
                    <React.Fragment key={i}>
                      {i > 0 && problem === 'permutations' && <span className="text-slate-400 text-xs">→</span>}
                      <div className="px-3 py-2 rounded-xl bg-violet-500 text-white text-sm font-bold">
                        {v}
                      </div>
                    </React.Fragment>
                  ))}
              </div>

              {problem === 'permutations' && (
                <>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-4">Remaining Cities</h4>
                  <div className="flex gap-2 flex-wrap min-h-8">
                    {cur.remaining?.map((v: string, i: number) => (
                      <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm">
                        {v}
                      </div>
                    ))}
                    {cur.remaining?.length === 0 && <span className="text-slate-400 text-sm italic">all visited</span>}
                  </div>
                </>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {problem === 'permutations'
                  ? `Routes (${cur.results?.length ?? 0} / ${CITIES.slice(0, n).reduce((a, _, i) => a * (i + 1), 1)})`
                  : `Menu Options (${cur.results?.length ?? 0} / ${Math.pow(2, n)})`}
              </h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {cur.results?.map((r: string[], i: number) => (
                  <div key={i} className="flex gap-1 flex-wrap items-center">
                    <span className="text-xs text-slate-400 w-6">#{i + 1}</span>
                    {r.length === 0
                      ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 italic">plain</span>
                      : r.map((v, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && problem === 'permutations' && <span className="text-slate-400 text-xs">→</span>}
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">{v}</span>
                        </React.Fragment>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {problem === 'nqueens' && (
          <div className="flex justify-center gap-8 flex-wrap">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 text-center">Board</h4>
              <div className="inline-block border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                {cur.board?.map((row: (0|1|-1)[], ri: number) => (
                  <div key={ri} className="flex">
                    {row.map((cell: 0|1|-1, ci: number) => (
                      <div key={ci} className={`w-11 h-11 flex items-center justify-center text-xl font-bold transition-colors ${
                        (ri + ci) % 2 === 0 ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-amber-200 dark:bg-amber-900/30'
                      } ${cell === -1 ? 'opacity-40' : ''}`}>
                        {cell === 1 ? '♛' : cell === -1 ? '·' : ''}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={`text-5xl font-bold ${cur.solutions > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                {cur.solutions}
              </div>
              <div className="text-sm text-slate-500">solutions found</div>
              <div className="text-xs text-slate-400 text-center mt-2">
                {queensN === 4 ? '(2 solutions for N=4)' : '(10 solutions for N=5)'}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${ACTION_COLORS[cur.action] ?? ''}`}>
            {cur.action}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block"></span> Choose / Place</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-400 inline-block"></span> Backtrack (undo)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Complete solution</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400 inline-block"></span> Pruned (invalid)</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
