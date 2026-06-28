import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  stack: number[]
  highlight: number | null
  message: string
  operation: 'push' | 'pop' | 'peek' | 'idle'
}

function generatePushSteps(initial: number[], value: number): Step[] {
  return [
    { stack: [...initial], highlight: null, message: `Push ${value} onto the stack`, operation: 'idle' },
    { stack: [...initial], highlight: null, message: `Check: stack has space — proceed`, operation: 'push' },
    { stack: [...initial, value], highlight: initial.length, message: `Pushed ${value}. New top = ${value}`, operation: 'push' },
  ]
}

function generatePopSteps(initial: number[]): Step[] {
  if (initial.length === 0) {
    return [{ stack: [], highlight: null, message: 'Stack is empty — cannot pop!', operation: 'idle' }]
  }
  const top = initial[initial.length - 1]
  return [
    { stack: [...initial], highlight: null, message: 'Pop from the stack (LIFO)', operation: 'idle' },
    { stack: [...initial], highlight: initial.length - 1, message: `Top element is ${top} — removing it`, operation: 'pop' },
    { stack: initial.slice(0, -1), highlight: null, message: `Popped ${top}. New top = ${initial[initial.length - 2] ?? 'none'}`, operation: 'pop' },
  ]
}

function generatePeekSteps(initial: number[]): Step[] {
  if (initial.length === 0) {
    return [{ stack: [], highlight: null, message: 'Stack is empty!', operation: 'idle' }]
  }
  const top = initial[initial.length - 1]
  return [
    { stack: [...initial], highlight: null, message: 'Peek at the top element', operation: 'peek' },
    { stack: [...initial], highlight: initial.length - 1, message: `Top = ${top} (no removal)`, operation: 'peek' },
  ]
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class Stack {
  constructor() { this.items = []; }

  push(val) {
    this.items.push(val); // O(1)
  }

  pop() {
    if (this.isEmpty()) throw new Error("Empty");
    return this.items.pop(); // O(1)
  }

  peek() {
    return this.items[this.items.length - 1]; // O(1)
  }

  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `class Stack:
    def __init__(self):
        self.items = []

    def push(self, val):
        self.items.append(val)  # O(1)

    def pop(self):
        if self.is_empty():
            raise IndexError("Empty stack")
        return self.items.pop()  # O(1)

    def peek(self):
        return self.items[-1]  # O(1)

    def is_empty(self):
        return len(self.items) == 0

    def size(self):
        return len(self.items)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.ArrayDeque;

public class Stack<T> {
    private ArrayDeque<T> deque = new ArrayDeque<>();

    public void push(T val) {
        deque.push(val); // O(1)
    }

    public T pop() {
        if (isEmpty()) throw new EmptyStackException();
        return deque.pop(); // O(1)
    }

    public T peek() {
        return deque.peek(); // O(1)
    }

    public boolean isEmpty() {
        return deque.isEmpty();
    }
}`,
  },
]

const INITIAL_STACK = [3, 7, 12, 5]

export default function StackVisualizer() {
  const [op, setOp] = useState<'push' | 'pop' | 'peek'>('push')
  const [pushVal, setPushVal] = useState(99)

  const getSteps = (): Step[] => {
    if (op === 'push') return generatePushSteps(INITIAL_STACK, pushVal)
    if (op === 'pop') return generatePopSteps(INITIAL_STACK)
    return generatePeekSteps(INITIAL_STACK)
  }

  const steps = getSteps()
  const ctrl = useSteps(steps.length)
  const current = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stack</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            LIFO — Last In, First Out. All operations happen at the <strong>top</strong>.
          </p>
        </div>
        <ComplexityBadge time="O(1) push/pop/peek" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Stacks are everywhere in software — even when you don't realise it. Your browser's Back button is a stack of URLs: each page you visit is pushed, Back pops it. Your IDE's Undo is a stack of edits. When your program calls a function, the CPU pushes a <strong>stack frame</strong> (local variables + return address) — that's the call stack you see in debuggers and crash traces.</p>
        <p>All operations are O(1) because you <em>only ever touch the top</em>. There's no searching, no shifting, no traversal — just push to top or pop from top. This constraint is exactly what makes stacks so predictable and fast.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">Recognise a stack problem</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• <strong>Bracket matching</strong> — push open brackets, pop to verify against each close bracket</li>
          <li>• <strong>DFS traversal</strong> — either via recursion (the call stack is the stack) or an explicit stack iteration</li>
          <li>• <strong>Undo/Redo</strong> — two stacks: undo stack and redo stack; push to one, pop from the other</li>
          <li>• <strong>Monotonic stack pattern</strong> — maintain elements in increasing or decreasing order while scanning left to right (Next Greater Element, Largest Rectangle in Histogram)</li>
          <li>• <strong>Expression evaluation</strong> — operators and operands, respecting precedence</li>
        </ul>
      </div>

      {/* Op selector */}
      <div className="flex gap-2 flex-wrap">
        {(['push', 'pop', 'peek'] as const).map(o => (
          <button key={o} onClick={() => { setOp(o); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              op === o ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {o}
          </button>
        ))}
        {op === 'push' && (
          <input type="number" value={pushVal} onChange={e => { setPushVal(+e.target.value); ctrl.reset() }}
            className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm" />
        )}
      </div>

      {/* Visualizer */}
      <div className="viz-container p-8">
        <div className="flex justify-center">
          <div className="flex flex-col-reverse gap-2 items-center">
            {/* Bottom label */}
            <div className="text-xs text-slate-400 mt-2 font-mono">Bottom</div>

            {current.stack.map((val, i) => (
              <div key={i} className={`w-24 h-14 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all duration-300 ${
                current.highlight === i
                  ? op === 'peek' ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 scale-110' : 'border-violet-500 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 scale-110'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}>
                {val}
              </div>
            ))}

            {current.stack.length === 0 && (
              <div className="w-24 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                empty
              </div>
            )}

            {/* Top indicator */}
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xs text-slate-400 font-mono">Top ↑</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {current.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
