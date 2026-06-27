import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  slow: number; fast: number; hasCycle: boolean | null; message: string
  step: number
}

function detectCycleSteps(hasCycle: boolean): Step[] {
  const steps: Step[] = []
  // Nodes: 0→1→2→3→4→(cycle back to 2 if hasCycle)
  const n = 6
  const next = hasCycle ? [1, 2, 3, 4, 5, 3] : [1, 2, 3, 4, 5, -1]

  steps.push({ slow: 0, fast: 0, hasCycle: null, message: `Both probes start at node 0 (object root). Slow follows one reference at a time; fast follows two.`, step: 0 })
  let slow = 0, fast = 0

  for (let i = 0; i < 10; i++) {
    const nextSlow = next[slow]
    const nextFast = next[fast] !== -1 ? next[next[fast]] : -1

    if (nextSlow === -1 || nextFast === -1) {
      steps.push({ slow, fast, hasCycle: false, message: `Fast probe hit a dead-end (null reference) — no circular dependency. Memory is safe to free.`, step: i + 1 })
      break
    }

    slow = nextSlow
    fast = nextFast === undefined ? -1 : nextFast

    if (fast === -1) {
      steps.push({ slow, fast: -1, hasCycle: false, message: `Fast probe hit null — reference chain terminates cleanly. No memory leak.`, step: i + 1 })
      break
    }

    steps.push({ slow, fast, hasCycle: null, message: `Slow probe → node ${slow} | Fast probe → node ${fast} (2× speed). ${slow !== fast ? 'Not met yet — keep going.' : ''}`, step: i + 1 })

    if (slow === fast) {
      steps.push({ slow, fast, hasCycle: true, message: `Both probes at node ${slow}! They can only meet inside a loop — circular reference confirmed. Memory leak detected.`, step: i + 2 })
      break
    }
  }
  return steps
}

const NODES_WITH_CYCLE = [0, 1, 2, 3, 4, 5] // 5 → back to 3
const NODES_NO_CYCLE = [0, 1, 2, 3, 4, 5]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Floyd's Cycle Detection — O(n) time, O(1) space
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;           // 1 step
    fast = fast.next.next;      // 2 steps
    if (slow === fast) return true; // cycle!
  }
  return false;
}

// Find cycle start
function detectCycleStart(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      // Reset slow to head, keep fast at meeting point
      slow = head;
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
      }
      return slow; // cycle start
    }
  }
  return null;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Floyd's Cycle Detection — O(n) time, O(1) space
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next         # 1 step
        fast = fast.next.next    # 2 steps
        if slow is fast:
            return True          # cycle!
    return False

def detect_cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow  # cycle start
    return None`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Floyd's Cycle Detection — O(n) time, O(1) space
public boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}

public ListNode detectCycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            slow = head;
            while (slow != fast) {
                slow = slow.next;
                fast = fast.next;
            }
            return slow;
        }
    }
    return null;
}`,
  },
]

const NODE_X = [80, 160, 240, 320, 400, 480]
const NODE_Y = 80

export default function FastSlowVisualizer() {
  const [hasCycle, setHasCycle] = useState(true)
  const steps = detectCycleSteps(hasCycle)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const nodes = [0, 1, 2, 3, 4, 5]
  const nextMap = hasCycle ? [1, 2, 3, 4, 5, 3] : [1, 2, 3, 4, 5, -1]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fast & Slow Pointer (Floyd's Algorithm)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Two probes at different speeds — if one ever laps the other, there's a loop</p>
        </div>
        <ComplexityBadge time="O(n)" space="O(1)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A JavaScript app's memory keeps growing even after releasing references. The garbage collector can't free certain objects because they reference each other in a loop — a circular dependency.
          A memory profiler sends two "probes" through the object reference chain: one follows one link at a time (slow), the other follows two links per step (fast).
          If they ever land on the same object, a cycle exists. If the fast probe hits null, the chain terminates cleanly.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Any problem on a <strong>linked list or implicit sequence</strong> asking about cycles, finding the middle node, or finding the duplicate number in an array (where values are indices).
          The key insight: if two runners start at the same point on a circular track, the faster one will eventually lap the slower one and they'll meet — guaranteed.
          O(1) space because you never store visited nodes, unlike a HashSet approach.
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setHasCycle(true); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${hasCycle ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          With Cycle
        </button>
        <button onClick={() => { setHasCycle(false); ctrl.reset() }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!hasCycle ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
          No Cycle
        </button>
      </div>

      <div className="viz-container overflow-x-auto">
        <svg width={600} height={180} className="block w-full max-w-2xl mx-auto" viewBox="0 0 600 180">
          {/* Edges */}
          {nodes.map(i => {
            const nx = nextMap[i]
            if (nx === -1) return null
            const curved = nx < i
            if (curved) {
              return <path key={i} d={`M ${NODE_X[i]} ${NODE_Y} Q ${(NODE_X[i] + NODE_X[nx]) / 2} ${NODE_Y + 60} ${NODE_X[nx]} ${NODE_Y}`}
                fill="none" stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrow)" />
            }
            return <line key={i} x1={NODE_X[i] + 22} y1={NODE_Y} x2={NODE_X[nx] - 22} y2={NODE_Y}
              stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700"
              markerEnd="url(#arrow)" />
          })}
          {/* NULL at end if no cycle */}
          {!hasCycle && (
            <text x={NODE_X[5] + 38} y={NODE_Y + 5} fontSize={12} className="fill-slate-400 dark:fill-slate-500">→null</text>
          )}

          {/* Arrow marker */}
          <defs>
            <marker id="arrow" markerWidth={8} markerHeight={8} refX={4} refY={4} orient="auto">
              <path d="M0,0 L0,8 L8,4 z" fill="currentColor" className="text-slate-400 dark:text-slate-600" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map(i => {
            const isSlow = cur.slow === i
            const isFast = cur.fast === i
            const isBoth = isSlow && isFast
            return (
              <g key={i} transform={`translate(${NODE_X[i]},${NODE_Y})`}>
                <circle r={22} className={`transition-all duration-300 ${
                  isBoth ? 'fill-rose-500' : isSlow ? 'fill-sky-500' : isFast ? 'fill-amber-500' : 'fill-slate-200 dark:fill-slate-700'
                }`} />
                <text textAnchor="middle" dy="0.35em" fontSize={13} fontWeight="600"
                  className={isSlow || isFast ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                  {i}
                </text>
              </g>
            )
          })}

          {/* Pointer labels */}
          {cur.slow !== undefined && cur.slow >= 0 && cur.slow < 6 && (
            <text x={NODE_X[cur.slow]} y={NODE_Y - 34} textAnchor="middle" fontSize={11} className="fill-sky-500 dark:fill-sky-400" fontWeight="bold">
              slow
            </text>
          )}
          {cur.fast !== undefined && cur.fast >= 0 && cur.fast < 6 && (
            <text x={NODE_X[cur.fast]} y={NODE_Y + (cur.fast === cur.slow ? -46 : -34)} textAnchor="middle" fontSize={11} className="fill-amber-500 dark:fill-amber-400" fontWeight="bold">
              fast
            </text>
          )}
        </svg>

        <div className={`border-t border-slate-200 dark:border-slate-800 p-4 text-center ${
          cur.hasCycle === true ? 'bg-rose-50 dark:bg-rose-950/20' : cur.hasCycle === false ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
        }`}>
          {cur.hasCycle !== null && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-2 ${
              cur.hasCycle ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            }`}>
              {cur.hasCycle ? '🔄 Cycle detected!' : '✓ No cycle'}
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> Slow (1 step)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Fast (2 steps)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Meet (cycle!)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Cycle back edge</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
