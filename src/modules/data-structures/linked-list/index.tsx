import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  nodes: (number | null)[]
  highlight: number[]
  active: number | null
  message: string
  newNode?: number | null
}

function traverseSteps(nodes: number[]): Step[] {
  const steps: Step[] = [
    { nodes: [...nodes], highlight: [], active: null, message: 'Start traversal from the head' },
  ]
  for (let i = 0; i < nodes.length; i++) {
    steps.push({ nodes: [...nodes], highlight: Array.from({ length: i + 1 }, (_, k) => k), active: i, message: `Visiting node ${i}: value = ${nodes[i]}` })
  }
  steps.push({ nodes: [...nodes], highlight: [], active: null, message: 'Reached null — traversal complete' })
  return steps
}

function insertHeadSteps(nodes: number[], val: number): Step[] {
  return [
    { nodes: [...nodes], highlight: [], active: null, message: `Insert ${val} at the head` },
    { nodes: [...nodes], highlight: [], active: null, newNode: val, message: `Create new node with value ${val}` },
    { nodes: [val, ...nodes], highlight: [0], active: 0, newNode: null, message: `New node points to old head. New head = ${val}` },
  ]
}

function deleteNodeSteps(nodes: number[], pos: number): Step[] {
  if (nodes.length === 0) return [{ nodes: [], highlight: [], active: null, message: 'List is empty' }]
  const val = nodes[pos]
  const steps: Step[] = [
    { nodes: [...nodes], highlight: [], active: null, message: `Delete node at position ${pos}` },
  ]
  for (let i = 0; i <= pos; i++) {
    steps.push({ nodes: [...nodes], highlight: [i], active: i, message: i === pos ? `Found node ${pos}: value = ${val}` : `Traverse to position ${pos} — at ${i}` })
  }
  const result = nodes.filter((_, i) => i !== pos)
  steps.push({ nodes: result, highlight: [], active: null, message: `Removed node with value ${val}` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

class LinkedList {
  constructor() { this.head = null; }

  insertHead(val) {
    const node = new Node(val); // O(1)
    node.next = this.head;
    this.head = node;
  }

  delete(val) { // O(n)
    if (!this.head) return;
    if (this.head.val === val) {
      this.head = this.head.next;
      return;
    }
    let cur = this.head;
    while (cur.next && cur.next.val !== val) {
      cur = cur.next;
    }
    if (cur.next) cur.next = cur.next.next;
  }

  traverse() { // O(n)
    let cur = this.head;
    while (cur) { console.log(cur.val); cur = cur.next; }
  }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def insert_head(self, val):  # O(1)
        node = Node(val)
        node.next = self.head
        self.head = node

    def delete(self, val):  # O(n)
        if not self.head:
            return
        if self.head.val == val:
            self.head = self.head.next
            return
        cur = self.head
        while cur.next and cur.next.val != val:
            cur = cur.next
        if cur.next:
            cur.next = cur.next.next

    def traverse(self):  # O(n)
        cur = self.head
        while cur:
            print(cur.val)
            cur = cur.next`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `public class LinkedList<T> {
    private static class Node<T> {
        T val; Node<T> next;
        Node(T val) { this.val = val; }
    }

    private Node<T> head;

    public void insertHead(T val) { // O(1)
        Node<T> node = new Node<>(val);
        node.next = head;
        head = node;
    }

    public void delete(T val) { // O(n)
        if (head == null) return;
        if (head.val.equals(val)) {
            head = head.next; return;
        }
        Node<T> cur = head;
        while (cur.next != null
               && !cur.next.val.equals(val)) {
            cur = cur.next;
        }
        if (cur.next != null)
            cur.next = cur.next.next;
    }
}`,
  },
]

const INITIAL_NODES = [10, 20, 30, 40, 50]

export default function LinkedListVisualizer() {
  const [op, setOp] = useState<'traverse' | 'insert' | 'delete'>('traverse')
  const [insertVal, setInsertVal] = useState(99)
  const [deletePos, setDeletePos] = useState(2)

  const getSteps = () => {
    if (op === 'traverse') return traverseSteps(INITIAL_NODES)
    if (op === 'insert') return insertHeadSteps(INITIAL_NODES, insertVal)
    return deleteNodeSteps(INITIAL_NODES, deletePos)
  }

  const steps = getSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Linked List</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Dynamic chain of nodes with pointer-based connections</p>
        </div>
        <ComplexityBadge time="O(n) search, O(1) head insert" space="O(n)" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['traverse', 'insert', 'delete'] as const).map(o => (
          <button key={o} onClick={() => { setOp(o); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              op === o ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {o}
          </button>
        ))}
        {op === 'insert' && (
          <input type="number" value={insertVal} onChange={e => { setInsertVal(+e.target.value); ctrl.reset() }}
            className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        )}
        {op === 'delete' && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Position:</span>
            <input type="number" value={deletePos} min={0} max={INITIAL_NODES.length - 1} onChange={e => { setDeletePos(+e.target.value); ctrl.reset() }}
              className="w-20 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
          </label>
        )}
      </div>

      <div className="viz-container p-8 overflow-x-auto">
        <div className="flex items-center gap-1 justify-start min-w-max mx-auto">
          {/* Head label */}
          <div className="flex flex-col items-center mr-2">
            <div className="text-xs text-violet-500 font-medium">head</div>
            <div className="text-lg">→</div>
          </div>

          {/* New node (for insert) */}
          {cur.newNode !== null && cur.newNode !== undefined && (
            <div className="flex items-center gap-1 mr-2 animate-bounce-in">
              <div className="flex flex-col items-center">
                <div className="px-4 py-3 rounded-xl bg-emerald-400 dark:bg-emerald-600 text-white font-bold border-2 border-emerald-500">
                  {cur.newNode}
                </div>
                <span className="text-xs text-emerald-500 mt-1">new</span>
              </div>
              <span className="text-slate-400 text-xl">→</span>
            </div>
          )}

          {cur.nodes.map((val, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div className={`px-4 py-3 rounded-xl font-bold border-2 transition-all duration-300 ${
                  cur.active === i
                    ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 scale-110'
                    : cur.highlight.includes(i)
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}>
                  {val}
                </div>
                <span className="text-xs text-slate-400 mt-1 font-mono">{i}</span>
              </div>
              {i < cur.nodes.length - 1 && <span className="text-slate-300 dark:text-slate-600 text-xl">→</span>}
            </div>
          ))}

          {/* NULL */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-slate-300 dark:text-slate-600 text-xl">→</span>
            <div className="px-3 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs font-mono">null</div>
          </div>
        </div>

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
