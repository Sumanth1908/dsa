import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  queue: number[]
  frontHighlight: boolean
  rearHighlight: boolean
  entering: number | null
  message: string
}

function enqueueSteps(q: number[], val: number): Step[] {
  return [
    { queue: [...q], frontHighlight: false, rearHighlight: false, entering: null, message: `Enqueue ${val}` },
    { queue: [...q], frontHighlight: false, rearHighlight: true, entering: val, message: `Adding ${val} to the rear of the queue` },
    { queue: [...q, val], frontHighlight: false, rearHighlight: true, entering: null, message: `${val} enqueued. Queue size: ${q.length + 1}` },
  ]
}

function dequeueSteps(q: number[]): Step[] {
  if (q.length === 0) return [{ queue: [], frontHighlight: false, rearHighlight: false, entering: null, message: 'Queue is empty!' }]
  const front = q[0]
  return [
    { queue: [...q], frontHighlight: false, rearHighlight: false, entering: null, message: 'Dequeue from front (FIFO)' },
    { queue: [...q], frontHighlight: true, rearHighlight: false, entering: null, message: `Front element is ${front} — removing it` },
    { queue: q.slice(1), frontHighlight: false, rearHighlight: false, entering: null, message: `Dequeued ${front}. New front = ${q[1] ?? 'none'}` },
  ]
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class Queue {
  constructor() { this.items = []; }

  enqueue(val) {
    this.items.push(val); // O(1) amortized
  }

  dequeue() {
    if (this.isEmpty()) throw new Error("Empty");
    return this.items.shift(); // O(n) — use LinkedList for O(1)
  }

  front() { return this.items[0]; }
  rear() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()  # O(1) both ends

    def enqueue(self, val):
        self.items.append(val)  # O(1)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("Empty queue")
        return self.items.popleft()  # O(1)

    def front(self):
        return self.items[0]

    def is_empty(self):
        return len(self.items) == 0`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.ArrayDeque;
import java.util.Queue;

Queue<Integer> queue = new ArrayDeque<>();

// Enqueue - O(1)
queue.offer(42);

// Dequeue - O(1)
int front = queue.poll();

// Peek front - O(1)
int peek = queue.peek();

// Check empty
boolean empty = queue.isEmpty();`,
  },
]

const INITIAL_QUEUE = [11, 22, 33, 44]

export default function QueueVisualizer() {
  const [op, setOp] = useState<'enqueue' | 'dequeue'>('enqueue')
  const [enqVal, setEnqVal] = useState(55)

  const steps = op === 'enqueue' ? enqueueSteps(INITIAL_QUEUE, enqVal) : dequeueSteps(INITIAL_QUEUE)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Queue</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            FIFO — First In, First Out. Enqueue at rear, dequeue at front.
          </p>
        </div>
        <ComplexityBadge time="O(1) enqueue/dequeue" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Queues enforce <strong>fairness</strong>: the first to arrive is the first to be served. This is exactly what you want for <strong>BFS graph traversal</strong> — process nodes layer by layer in the order they were discovered. It's also how OS task schedulers work (round-robin CPU slices), how printer queues work, and how distributed message brokers like Kafka and SQS work — events processed strictly in arrival order.</p>
        <p><strong>Implementation detail worth knowing:</strong> JavaScript's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">array.shift()</code> is O(n) — it must slide every element left after removing the first. Python's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">collections.deque.popleft()</code> is O(1) because deque uses a doubly-linked list internally. Java's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">ArrayDeque.poll()</code> is also O(1) with circular buffer indexing.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">Recognise a queue problem</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• <strong>BFS</strong> — level-order traversal of a graph or tree; "shortest path in an unweighted graph"</li>
          <li>• <strong>Sliding window</strong> — monotonic deque for max/min in a window (see Patterns)</li>
          <li>• <strong>Rate limiting</strong> — fixed-size queue of timestamps, reject if queue full</li>
          <li>• <strong>Multi-source BFS</strong> — start BFS from multiple nodes simultaneously (e.g., "rotting oranges", "walls and gates")</li>
          <li>• <strong>Anything with "process in order"</strong> — task queues, event streams, print jobs</li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['enqueue', 'dequeue'] as const).map(o => (
          <button key={o} onClick={() => { setOp(o); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              op === o ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {o}
          </button>
        ))}
        {op === 'enqueue' && (
          <input type="number" value={enqVal} onChange={e => { setEnqVal(+e.target.value); ctrl.reset() }}
            className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        )}
      </div>

      <div className="viz-container p-8">
        {/* Direction labels */}
        <div className="flex justify-between text-xs text-slate-400 mb-2 px-4">
          <span>← Dequeue (Front)</span>
          <span>(Rear) Enqueue →</span>
        </div>

        <div className="flex justify-center items-center gap-2">
          {/* Entering element animation */}
          {cur.entering !== null && (
            <div className="w-16 h-16 rounded-xl bg-emerald-400 dark:bg-emerald-500 text-white flex items-center justify-center text-lg font-bold animate-slide-in border-2 border-emerald-500">
              {cur.entering}
            </div>
          )}

          {cur.queue.map((val, i) => (
            <React.Fragment key={i}>
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all duration-300 ${
                (i === 0 && cur.frontHighlight)
                  ? 'border-rose-500 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 scale-110'
                  : (i === cur.queue.length - 1 && cur.rearHighlight)
                  ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 scale-110'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {val}
              </div>
              {i < cur.queue.length - 1 && (
                <span className="text-slate-300 dark:text-slate-600">→</span>
              )}
            </React.Fragment>
          ))}

          {cur.queue.length === 0 && (
            <div className="w-32 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-sm">
              empty
            </div>
          )}
        </div>

        {/* Labels */}
        {cur.queue.length > 0 && (
          <div className="flex justify-center gap-2 mt-2 px-4">
            <div style={{ marginLeft: cur.entering ? '72px' : '0' }} className="flex gap-2">
              {cur.queue.map((_, i) => (
                <div key={i} className="w-16 text-center">
                  {i === 0 && <span className="text-xs text-rose-500 font-medium">front</span>}
                  {i === cur.queue.length - 1 && i !== 0 && <span className="text-xs text-emerald-500 font-medium" style={{ marginLeft: `${(i - 1) * 72}px` }}>rear</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
