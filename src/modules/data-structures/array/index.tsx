import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

type Operation = 'search' | 'insert' | 'delete'

interface Step {
  array: (number | null)[]
  highlight: number[]
  active: number | null
  message: string
  found?: boolean
}

function generateSearchSteps(arr: number[], target: number): Step[] {
  const steps: Step[] = []
  steps.push({ array: [...arr], highlight: [], active: null, message: `Searching for ${target} in the array` })
  for (let i = 0; i < arr.length; i++) {
    steps.push({ array: [...arr], highlight: [i], active: i, message: `Checking index ${i}: arr[${i}] = ${arr[i]}${arr[i] === target ? ' ✓ Found!' : ' ≠ ' + target}`, found: arr[i] === target })
    if (arr[i] === target) break
  }
  return steps
}

function generateInsertSteps(arr: number[], value: number, pos: number): Step[] {
  const steps: Step[] = []
  const a = [...arr]
  steps.push({ array: [...a], highlight: [], active: null, message: `Insert ${value} at index ${pos}` })
  steps.push({ array: [...a], highlight: [pos], active: pos, message: `Target insertion point: index ${pos}` })
  for (let i = a.length - 1; i >= pos; i--) {
    const shifted = [...a, null] as (number | null)[]
    steps.push({ array: shifted.map((v, idx) => idx > i ? a[idx - 1] ?? null : v) as (number | null)[], highlight: [i, i + 1], active: i + 1, message: `Shift arr[${i}] → arr[${i + 1}]` })
  }
  const result: (number | null)[] = [...a, null]
  result[pos] = value
  steps.push({ array: result, highlight: [pos], active: pos, message: `Inserted ${value} at index ${pos}` })
  return steps
}

function generateDeleteSteps(arr: number[], pos: number): Step[] {
  const steps: Step[] = []
  const a = [...arr]
  steps.push({ array: [...a], highlight: [], active: null, message: `Delete element at index ${pos}` })
  steps.push({ array: [...a], highlight: [pos], active: pos, message: `Marking arr[${pos}] = ${a[pos]} for deletion` })
  const shifted = [...a] as (number | null)[]
  for (let i = pos; i < a.length - 1; i++) {
    shifted[i] = shifted[i + 1]
    steps.push({ array: [...shifted.slice(0, a.length - 1), null], highlight: [i, i + 1], active: i, message: `Shift arr[${i + 1}] → arr[${i}]` })
  }
  const final = a.slice(0, a.length - 1)
  final[pos] = a[pos + 1] ?? a[pos]
  steps.push({ array: a.slice(0, a.length - 1), highlight: [], active: null, message: `Element deleted, array size reduced to ${a.length - 1}` })
  return steps
}

const COLORS = {
  default: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  highlight: 'bg-amber-400 dark:bg-amber-500 text-slate-900 scale-105',
  found: 'bg-emerald-400 dark:bg-emerald-500 text-white scale-105',
  active: 'bg-violet-500 dark:bg-violet-500 text-white scale-110',
}

const INITIAL = [4, 8, 15, 16, 23, 42]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const,
    label: 'JavaScript',
    code: `// Array operations in JavaScript
const arr = [4, 8, 15, 16, 23, 42];

// Access - O(1)
const val = arr[2]; // 15

// Linear Search - O(n)
function search(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}

// Insert at index - O(n)
function insert(arr, value, index) {
  arr.splice(index, 0, value);
  return arr;
}

// Delete at index - O(n)
function remove(arr, index) {
  arr.splice(index, 1);
  return arr;
}`,
  },
  {
    lang: 'python' as const,
    label: 'Python',
    code: `# Array (list) operations in Python
arr = [4, 8, 15, 16, 23, 42]

# Access - O(1)
val = arr[2]  # 15

# Linear Search - O(n)
def search(arr, target):
    for i, v in enumerate(arr):
        if v == target:
            return i
    return -1

# Insert at index - O(n)
def insert(arr, value, index):
    arr.insert(index, value)
    return arr

# Delete at index - O(n)
def remove(arr, index):
    arr.pop(index)
    return arr`,
  },
  {
    lang: 'java' as const,
    label: 'Java',
    code: `import java.util.ArrayList;

// Array operations in Java
int[] arr = {4, 8, 15, 16, 23, 42};
ArrayList<Integer> list = new ArrayList<>();

// Access - O(1)
int val = arr[2]; // 15

// Linear Search - O(n)
public int search(int[] arr, int target) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}

// Insert at index - O(n) with ArrayList
public void insert(ArrayList<Integer> list,
                   int value, int index) {
    list.add(index, value);
}

// Delete at index - O(n)
public void remove(ArrayList<Integer> list,
                   int index) {
    list.remove(index);
}`,
  },
]

export default function ArrayVisualizer() {
  const [op, setOp] = useState<Operation>('search')
  const [target, setTarget] = useState(15)
  const [insertVal, setInsertVal] = useState(99)
  const [insertPos, setInsertPos] = useState(2)
  const [deletePos, setDeletePos] = useState(3)

  const getSteps = useCallback((): Step[] => {
    if (op === 'search') return generateSearchSteps(INITIAL, target)
    if (op === 'insert') return generateInsertSteps(INITIAL, insertVal, insertPos)
    return generateDeleteSteps(INITIAL, deletePos)
  }, [op, target, insertVal, insertPos, deletePos])

  const steps = getSteps()
  const ctrl = useSteps(steps.length)
  const current = steps[ctrl.step]

  const getColor = (idx: number) => {
    if (current.found && current.active === idx) return COLORS.found
    if (current.active === idx) return COLORS.active
    if (current.highlight.includes(idx)) return COLORS.highlight
    return COLORS.default
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Array</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Index-based linear data structure with O(1) random access</p>
        </div>
        <ComplexityBadge time="O(n) search, O(1) access" space="O(n)" />
      </div>

      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm text-sky-800 dark:text-sky-300 space-y-2">
        <p className="font-semibold text-sky-700 dark:text-sky-200">What is an Array?</p>
        <p>An array is a <strong>fixed-size, ordered collection</strong> of elements stored back-to-back in memory. Think of numbered mailboxes in a hallway — each has an address (index 0, 1, 2…) and you can jump to any box directly without checking the others.</p>
        <ul className="space-y-1 pl-1">
          <li>• <strong>Indexed</strong> — every element has a position starting at 0</li>
          <li>• <strong>Contiguous</strong> — elements live side-by-side in memory; sequential reads are fast because the CPU can prefetch adjacent slots</li>
          <li>• <strong>O(1) random access</strong> — reaching index <code className="font-mono bg-sky-100 dark:bg-sky-900 px-1 rounded">i</code> is arithmetic: <code className="font-mono bg-sky-100 dark:bg-sky-900 px-1 rounded">base + i × size</code>, no traversal needed</li>
          <li>• <strong>Dynamic in high-level languages</strong> — Python lists, JS arrays, and Java ArrayLists resize automatically by doubling capacity when full, making appends O(1) amortised</li>
        </ul>
        <p>Inserting or deleting in the <em>middle</em> costs O(n) — every element after the target must physically shift to close or open the gap. This is why arrays shine for read-heavy workloads and tail appends, but linked lists win for frequent head or middle insertions.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">When to choose an array</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• You need O(1) random access — reading or writing any element by index instantly</li>
          <li>• The size is roughly known upfront, or growth happens mostly at the tail (appending)</li>
          <li>• Cache performance matters — contiguous memory maps perfectly to CPU cache lines, making sequential scans very fast compared to pointer-chasing data structures</li>
          <li>• <strong>Prefer a Linked List instead</strong> when: insertions and deletions at the head or middle dominate, and you rarely look up by index</li>
        </ul>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm">
        <strong className="text-indigo-700 dark:text-indigo-300 block mb-2">Famous techniques on arrays</strong>
        <ul className="space-y-1.5 text-indigo-800 dark:text-indigo-400">
          <li>• <strong>Linear search</strong> — scan every element; O(n), works on unsorted arrays</li>
          <li>• <Link to="/algorithms/binary-search" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">Binary search</Link> — halve the search space each step; O(log n), requires sorted input</li>
          <li>• <Link to="/patterns/two-pointer" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">Two pointer</Link> — one index from each end converging; pair-sum, palindrome check, container with most water</li>
          <li>• <Link to="/patterns/sliding-window" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">Sliding window</Link> — grow/shrink a subarray window; max subarray sum, longest substring without repeats</li>
        </ul>
      </div>

      {/* Operation selector */}
      <div className="flex gap-2">
        {(['search', 'insert', 'delete'] as Operation[]).map(o => (
          <button
            key={o}
            onClick={() => { setOp(o); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              op === o ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-violet-400'
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      {/* Params */}
      <div className="flex flex-wrap gap-4 text-sm">
        {op === 'search' && (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Target:</span>
            <input type="number" value={target} onChange={e => { setTarget(+e.target.value); ctrl.reset() }}
              className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" />
          </label>
        )}
        {op === 'insert' && (
          <>
            <label className="flex items-center gap-2">
              <span className="text-slate-500">Value:</span>
              <input type="number" value={insertVal} onChange={e => { setInsertVal(+e.target.value); ctrl.reset() }}
                className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-500">At index:</span>
              <input type="number" value={insertPos} min={0} max={INITIAL.length} onChange={e => { setInsertPos(+e.target.value); ctrl.reset() }}
                className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" />
            </label>
          </>
        )}
        {op === 'delete' && (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Delete index:</span>
            <input type="number" value={deletePos} min={0} max={INITIAL.length - 1} onChange={e => { setDeletePos(+e.target.value); ctrl.reset() }}
              className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" />
          </label>
        )}
      </div>

      {/* Visualizer */}
      <div className="viz-container p-8">
        <div className="flex justify-center gap-2 flex-wrap">
          {current.array.map((val, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-300 ${val === null ? 'border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-600' : getColor(i)}`}>
                {val ?? ''}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{i}</span>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {current.message}
          </p>
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400"></span> Comparing</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500"></span> Current</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400"></span> Found</span>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
