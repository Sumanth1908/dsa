import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

type Problem = 'fibonacci' | 'coin-change'

// Staircase problem: n steps, 1 or 2 at a time — how many ways to climb?
// Recurrence: ways(n) = ways(n-1) + ways(n-2)  (same as Fibonacci!)
interface FibStep {
  n: number
  memo: Record<number, number>
  callStack: string[]
  action: 'call' | 'cache-hit' | 'base' | 'return'
  result: number | null
  message: string
}

function fibSteps(target: number): FibStep[] {
  const steps: FibStep[] = []
  const memo: Record<number, number> = {}
  const callStack: string[] = []

  function fib(n: number): number {
    callStack.push(`ways(${n})`)
    steps.push({ n, memo: { ...memo }, callStack: [...callStack], action: 'call', result: null, message: `How many ways to climb ${n} step${n !== 1 ? 's' : ''}?` })

    if (n <= 1) {
      memo[n] = n
      callStack.pop()
      steps.push({ n, memo: { ...memo }, callStack: [...callStack], action: 'base', result: n, message: `Base case: ${n === 0 ? '0 steps = 1 way (do nothing)' : '1 step = 1 way (take it)'}. ways(${n}) = ${n}` })
      return n
    }

    if (memo[n] !== undefined) {
      callStack.pop()
      steps.push({ n, memo: { ...memo }, callStack: [...callStack], action: 'cache-hit', result: memo[n], message: `Cache hit! ways(${n}) = ${memo[n]} already computed — skip the entire subtree!` })
      return memo[n]
    }

    const result = fib(n - 1) + fib(n - 2)
    memo[n] = result
    callStack.pop()
    steps.push({ n, memo: { ...memo }, callStack: [...callStack], action: 'return', result, message: `ways(${n}) = ways(${n - 1}) + ways(${n - 2}) = ${result}. Cached for future calls.` })
    return result
  }

  steps.push({ n: target, memo: {}, callStack: [], action: 'call', result: null, message: `Staircase: ${target} steps, take 1 or 2 at a time. Naive recursion = O(2^${target}) = ${Math.pow(2, target)} calls. With memo = O(${target}) = ${target} unique subproblems.` })
  fib(target)
  return steps
}

// ── Coin Change with memoization ──────────────────────────────────────────────
interface CoinStep {
  amount: number
  coins: number[]
  memo: Record<number, number>
  callStack: string[]
  action: 'call' | 'cache-hit' | 'base' | 'return' | 'try'
  result: number | null
  message: string
}

function coinChangeSteps(coins: number[], amount: number): CoinStep[] {
  const steps: CoinStep[] = []
  const memo: Record<number, number> = {}
  const callStack: string[] = []

  function cc(rem: number): number {
    if (rem === 0) { steps.push({ amount: rem, coins, memo: { ...memo }, callStack: [...callStack], action: 'base', result: 0, message: `Base case: 0 coins needed for amount 0` }); return 0 }
    if (rem < 0) return Infinity
    if (memo[rem] !== undefined) {
      steps.push({ amount: rem, coins, memo: { ...memo }, callStack: [...callStack], action: 'cache-hit', result: memo[rem], message: `Cache hit! cc(${rem}) = ${memo[rem] === Infinity ? '∞ (impossible)' : memo[rem]}` })
      return memo[rem]
    }

    callStack.push(`cc(${rem})`)
    steps.push({ amount: rem, coins, memo: { ...memo }, callStack: [...callStack], action: 'call', result: null, message: `Compute min coins for amount ${rem}` })

    let best = Infinity
    for (const coin of coins) {
      if (rem - coin < 0) continue
      steps.push({ amount: rem, coins, memo: { ...memo }, callStack: [...callStack], action: 'try', result: null, message: `Try coin ${coin}: need cc(${rem - coin}) + 1` })
      const sub = cc(rem - coin)
      if (sub + 1 < best) best = sub + 1
    }

    memo[rem] = best
    callStack.pop()
    steps.push({ amount: rem, coins, memo: { ...memo }, callStack: [...callStack], action: 'return', result: best, message: `cc(${rem}) = ${best === Infinity ? '∞ (impossible)' : best} coins. Cached.` })
    return best
  }

  steps.push({ amount, coins, memo: {}, callStack: [], action: 'call', result: null, message: `Min coins to make amount ${amount} using coins [${coins}]` })
  cc(amount)
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Memoization = top-down DP with a cache
// Pattern: wrap recursive fn, check cache first

// Fibonacci — O(n) with memo vs O(2^n) naive
function fib(n, memo = new Map()) {
  if (n <= 1) return n;
  if (memo.has(n)) return memo.get(n); // cache hit!
  const result = fib(n - 1, memo) + fib(n - 2, memo);
  memo.set(n, result); // cache result
  return result;
}

// Coin Change — O(amount * coins)
function coinChange(coins, amount, memo = new Map()) {
  if (amount === 0) return 0;
  if (amount < 0) return Infinity;
  if (memo.has(amount)) return memo.get(amount);

  let best = Infinity;
  for (const coin of coins) {
    const sub = coinChange(coins, amount - coin, memo);
    if (sub + 1 < best) best = sub + 1;
  }
  memo.set(amount, best);
  return best;
}

// Generic memoize HOF
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `from functools import lru_cache

# Python's @lru_cache — automatic memoization
@lru_cache(maxsize=None)  # cache all results
def fib(n):
    if n <= 1: return n
    return fib(n - 1) + fib(n - 2)  # O(n) with cache

# Manual dict memo
def fib_manual(n, memo={}):
    if n <= 1: return n
    if n in memo: return memo[n]  # cache hit
    memo[n] = fib_manual(n-1, memo) + fib_manual(n-2, memo)
    return memo[n]

# Coin Change — O(amount × len(coins))
@lru_cache(maxsize=None)
def coin_change(coins, amount):
    if amount == 0: return 0
    best = float('inf')
    for coin in coins:
        if amount - coin >= 0:
            sub = coin_change(coins, amount - coin)
            if sub + 1 < best:
                best = sub + 1
    return best

# Key insight: overlapping subproblems → cache!
# fib(5) → fib(4)+fib(3) → fib(3)+fib(2)+fib(2)+fib(1)
# Without memo: fib(3) computed TWICE → exponential
# With memo: fib(3) computed ONCE → linear`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.HashMap;
import java.util.Map;

// Fibonacci with memoization — O(n)
public int fib(int n, Map<Integer, Integer> memo) {
    if (n <= 1) return n;
    if (memo.containsKey(n)) return memo.get(n); // hit!
    int result = fib(n - 1, memo) + fib(n - 2, memo);
    memo.put(n, result); // cache
    return result;
}

// Coin Change — O(amount * coins.length)
public int coinChange(int[] coins, int amount,
                      Map<Integer, Integer> memo) {
    if (amount == 0) return 0;
    if (amount < 0) return Integer.MAX_VALUE;
    if (memo.containsKey(amount)) return memo.get(amount);

    int best = Integer.MAX_VALUE;
    for (int coin : coins) {
        int sub = coinChange(coins, amount - coin, memo);
        if (sub != Integer.MAX_VALUE && sub + 1 < best)
            best = sub + 1;
    }
    memo.put(amount, best);
    return best;
}`,
  },
]

const ACTION_STYLE: Record<string, string> = {
  call:      'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  'cache-hit': 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  base:      'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
  return:    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  try:       'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

export default function MemoizationVisualizer() {
  const [problem, setProblem] = useState<Problem>('fibonacci')
  const [fibN, setFibN] = useState(9)
  const [coinAmt, setCoinAmt] = useState(11)
  const COINS = [1, 3, 5]

  const steps = problem === 'fibonacci' ? fibSteps(fibN) : coinChangeSteps(COINS, coinAmt)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step] as any

  const memoEntries = Object.entries(cur.memo ?? {}).sort(([a], [b]) => +a - +b)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Memoization (Top-down DP)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Cache sub-problem results — turns exponential recursion into linear time</p>
        </div>
        <ComplexityBadge time="O(n) vs O(2ⁿ) naive" space="O(n) cache" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Staircase:</strong> A game character can jump 1 or 2 steps at a time. How many distinct ways can they reach step 9?
          Naive recursion computes ways(7) twice, ways(5) four times, ways(3) eight times… the call tree doubles at every level — O(2^n).
          Memoization caches the answer the first time each step is solved, turning it into O(n).
          <br /><strong>Coin Change:</strong> A vending machine finds the minimum coins to make exact change — a classic "overlapping subproblems" puzzle.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Two conditions must hold: <strong>overlapping subproblems</strong> (same sub-problem computed multiple times) and <strong>optimal substructure</strong> (optimal solution built from optimal sub-solutions).
          If you can write a clean recursive solution but it's slow — add a memo dict/map before the recursive call and return early on a hit.
          Python: use <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">@lru_cache</code>. JavaScript: a <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">Map</code> closure.
        </p>
      </div>

      {/* Problem picker */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setProblem('fibonacci'); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${problem === 'fibonacci' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          Fibonacci
        </button>
        <button onClick={() => { setProblem('coin-change'); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${problem === 'coin-change' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          Coin Change
        </button>

        {problem === 'fibonacci' && (
          <label className="flex items-center gap-2 text-sm ml-2">
            <span className="text-slate-500">steps (n) =</span>
            {[7, 9, 11].map(v => (
              <button key={v} onClick={() => { setFibN(v); ctrl.reset() }}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${fibN === v ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'}`}>
                {v}
              </button>
            ))}
          </label>
        )}
        {problem === 'coin-change' && (
          <label className="flex items-center gap-2 text-sm ml-2">
            <span className="text-slate-500">amount = </span>
            {[8, 11, 14].map(v => (
              <button key={v} onClick={() => { setCoinAmt(v); ctrl.reset() }}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${coinAmt === v ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'}`}>
                {v}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-1">coins: [{COINS.join(', ')}]</span>
          </label>
        )}
      </div>

      <div className="viz-container p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Call stack */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Call Stack</h4>
            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl min-h-36 p-2 space-y-1 flex flex-col-reverse overflow-y-auto max-h-48">
              {(cur.callStack ?? []).map((frame: string, i: number) => (
                <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${i === (cur.callStack ?? []).length - 1 ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  {frame}
                </div>
              ))}
              {(cur.callStack ?? []).length === 0 && <div className="text-xs text-slate-400 text-center py-2">empty</div>}
            </div>
          </div>

          {/* Memo table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Memo Cache ({memoEntries.length} entries)
            </h4>
            <div className="border-2 border-amber-200 dark:border-amber-800 rounded-xl min-h-36 p-2 overflow-y-auto max-h-48 bg-amber-50 dark:bg-amber-950/20">
              {memoEntries.length === 0
                ? <div className="text-xs text-slate-400 text-center py-2">empty — no results cached yet</div>
                : (
                  <div className="flex flex-wrap gap-1">
                    {memoEntries.map(([k, v]) => (
                      <div key={k} className="flex items-center gap-0.5 bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-amber-200 dark:border-amber-800">
                        <span className="text-xs font-mono text-amber-600 dark:text-amber-400">{problem === 'fibonacci' ? `fib(${k})` : `cc(${k})`}</span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{(v as number) === Infinity ? '∞' : String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Action + message */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${ACTION_STYLE[cur.action] ?? ''}`}>
            {cur.action === 'cache-hit' ? '⚡ Cache Hit' : cur.action}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      {/* Without vs with memo comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <h4 className="font-semibold text-rose-700 dark:text-rose-400 text-sm mb-1">Without memo</h4>
          <p className="text-xs text-rose-600 dark:text-rose-500">
            fib(7) recomputes fib(5) twice, fib(4) three times, fib(3) five times… exponential explosion.
          </p>
          <div className="mt-2 text-xs font-mono text-rose-700 dark:text-rose-400">O(2ⁿ) time</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-1">With memo</h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">
            Each sub-problem solved exactly once, result cached. All subsequent calls are O(1) lookups.
          </p>
          <div className="mt-2 text-xs font-mono text-emerald-700 dark:text-emerald-400">O(n) time</div>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500 inline-block"></span> New call</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> Cache hit (saved!)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-400 inline-block"></span> Base case</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Return & cache</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
