import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null
  x?: number
  y?: number
  id: number
}

interface VizNode { id: number; val: number; x: number; y: number }
interface VizEdge { x1: number; y1: number; x2: number; y2: number }

let nodeId = 0
function mkNode(val: number): TreeNode { return { val, left: null, right: null, id: nodeId++ } }

function insert(root: TreeNode | null, val: number): TreeNode {
  if (!root) return mkNode(val)
  if (val < root.val) root.left = insert(root.left, val)
  else if (val > root.val) root.right = insert(root.right, val)
  return root
}

function buildTree(values: number[]): TreeNode | null {
  nodeId = 0
  let root: TreeNode | null = null
  for (const v of values) root = insert(root, v)
  return root
}

function layout(node: TreeNode | null, x: number, y: number, gap: number): void {
  if (!node) return
  node.x = x; node.y = y
  layout(node.left, x - gap, y + 80, gap / 2)
  layout(node.right, x + gap, y + 80, gap / 2)
}

function collectNodes(node: TreeNode | null): VizNode[] {
  if (!node) return []
  return [{ id: node.id, val: node.val, x: node.x!, y: node.y! }, ...collectNodes(node.left), ...collectNodes(node.right)]
}

function collectEdges(node: TreeNode | null): VizEdge[] {
  if (!node) return []
  const edges: VizEdge[] = []
  if (node.left) edges.push({ x1: node.x!, y1: node.y!, x2: node.left.x!, y2: node.left.y! })
  if (node.right) edges.push({ x1: node.x!, y1: node.y!, x2: node.right.x!, y2: node.right.y! })
  return [...edges, ...collectEdges(node.left), ...collectEdges(node.right)]
}

type Traversal = 'inorder' | 'preorder' | 'postorder' | 'insert'

function getInorder(node: TreeNode | null, acc: number[] = []): number[] {
  if (!node) return acc
  getInorder(node.left, acc); acc.push(node.val); getInorder(node.right, acc)
  return acc
}

function getPreorder(node: TreeNode | null, acc: number[] = []): number[] {
  if (!node) return acc
  acc.push(node.val); getPreorder(node.left, acc); getPreorder(node.right, acc)
  return acc
}

function getPostorder(node: TreeNode | null, acc: number[] = []): number[] {
  if (!node) return acc
  getPostorder(node.left, acc); getPostorder(node.right, acc); acc.push(node.val)
  return acc
}

interface Step { highlight: number[]; visited: number[]; message: string; tree: TreeNode | null }

function traversalSteps(root: TreeNode | null, type: Traversal, insertVal?: number): Step[] {
  const steps: Step[] = []
  const visited: number[] = []

  function traverse(node: TreeNode | null) {
    if (!node) return
    if (type === 'preorder') {
      steps.push({ highlight: [node.id], visited: [...visited], message: `Visit ${node.val} (preorder: root first)`, tree: root })
      visited.push(node.id)
      traverse(node.left); traverse(node.right)
    } else if (type === 'inorder') {
      traverse(node.left)
      steps.push({ highlight: [node.id], visited: [...visited], message: `Visit ${node.val} (inorder: left → root → right)`, tree: root })
      visited.push(node.id)
      traverse(node.right)
    } else if (type === 'postorder') {
      traverse(node.left); traverse(node.right)
      steps.push({ highlight: [node.id], visited: [...visited], message: `Visit ${node.val} (postorder: children first)`, tree: root })
      visited.push(node.id)
    }
  }

  steps.push({ highlight: [], visited: [], message: `Starting ${type} traversal`, tree: root })
  traverse(root)
  steps.push({ highlight: [], visited: [...visited], message: `${type} complete: [${type === 'inorder' ? getInorder(root) : type === 'preorder' ? getPreorder(root) : getPostorder(root)}]`, tree: root })
  return steps
}

function insertSteps(root: TreeNode | null, val: number): Step[] {
  const steps: Step[] = []
  steps.push({ highlight: [], visited: [], message: `Insert ${val} into BST`, tree: root })
  const path: number[] = []
  let cur = root
  while (cur) {
    path.push(cur.id)
    steps.push({ highlight: [cur.id], visited: [...path.slice(0, -1)], message: `${val} ${val < cur.val ? '<' : '>'} ${cur.val} — go ${val < cur.val ? 'left' : 'right'}`, tree: root })
    if (val < cur.val) cur = cur.left
    else cur = cur.right
  }
  const newRoot = insert(JSON.parse(JSON.stringify(root)), val)
  layout(newRoot, 300, 40, 120)
  steps.push({ highlight: [], visited: path, message: `Inserted ${val} as a new leaf node`, tree: newRoot })
  return steps
}

const INITIAL_VALUES = [50, 30, 70, 20, 40, 60, 80]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class BST {
  insert(root, val) { // O(log n) avg, O(n) worst
    if (!root) return { val, left: null, right: null };
    if (val < root.val) root.left = this.insert(root.left, val);
    else if (val > root.val) root.right = this.insert(root.right, val);
    return root;
  }

  // Inorder = sorted order for BST
  inorder(node, result = []) {
    if (!node) return result;
    this.inorder(node.left, result);
    result.push(node.val);
    this.inorder(node.right, result);
    return result;
  }

  search(node, val) { // O(log n) avg
    if (!node || node.val === val) return node;
    if (val < node.val) return this.search(node.left, val);
    return this.search(node.right, val);
  }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `class BST:
    def insert(self, root, val):  # O(log n) avg
        if not root:
            return {"val": val, "left": None, "right": None}
        if val < root["val"]:
            root["left"] = self.insert(root["left"], val)
        elif val > root["val"]:
            root["right"] = self.insert(root["right"], val)
        return root

    def inorder(self, node, result=None):
        if result is None: result = []
        if not node: return result
        self.inorder(node["left"], result)
        result.append(node["val"])
        self.inorder(node["right"], result)
        return result

    def search(self, node, val):  # O(log n) avg
        if not node or node["val"] == val:
            return node
        if val < node["val"]:
            return self.search(node["left"], val)
        return self.search(node["right"], val)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `public class BST {
    class Node {
        int val; Node left, right;
        Node(int v) { val = v; }
    }

    Node insert(Node root, int val) { // O(log n) avg
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else if (val > root.val) root.right = insert(root.right, val);
        return root;
    }

    void inorder(Node node, List<Integer> result) {
        if (node == null) return;
        inorder(node.left, result);
        result.add(node.val);
        inorder(node.right, result);
    }

    Node search(Node node, int val) { // O(log n) avg
        if (node == null || node.val == val) return node;
        if (val < node.val) return search(node.left, val);
        return search(node.right, val);
    }
}`,
  },
]

export default function TreeVisualizer() {
  const [traversal, setTraversal] = useState<Traversal>('inorder')
  const [insertVal, setInsertVal] = useState(45)

  const buildAndLayout = (vals: number[], extra?: number) => {
    const tree = buildTree(extra ? [...vals, extra] : vals)
    layout(tree!, 300, 40, 120)
    return tree
  }

  const rootTree = buildAndLayout(INITIAL_VALUES)

  const steps = traversal === 'insert'
    ? insertSteps(buildAndLayout(INITIAL_VALUES), insertVal)
    : traversalSteps(buildAndLayout(INITIAL_VALUES), traversal)

  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const vizNodes = collectNodes(cur.tree)
  const vizEdges = collectEdges(cur.tree)

  const minX = Math.min(...vizNodes.map(n => n.x))
  const maxX = Math.max(...vizNodes.map(n => n.x))
  const svgW = Math.max(600, maxX - minX + 100)
  const offsetX = -minX + 50

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Binary Search Tree</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ordered tree: left &lt; root &lt; right at every node</p>
        </div>
        <ComplexityBadge time="O(log n) avg, O(n) worst" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>A BST enforces one simple invariant at every node: left subtree has only smaller values, right subtree has only larger values. This lets you search by <strong>eliminating half the tree at each step</strong> — O(log n) on average. It's binary search, but on a dynamic structure that supports O(log n) insert and delete without reshuffling everything.</p>
        <p><strong>Inorder traversal</strong> (left → root → right) visits BST nodes in ascending sorted order. This is a key property: a BST is essentially a sorted container.</p>
        <p><strong>The danger of imbalance:</strong> if you insert already-sorted values (1, 2, 3, 4, 5…), the tree degrades into a linked list — every node only has a right child, and search becomes O(n). Real databases and language standard libraries use <strong>self-balancing trees</strong> (AVL or Red-Black) that automatically rotate to maintain O(log n) height. Java's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">TreeMap</code>, C++'s <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">std::map</code>, and database B-tree indexes all do this.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">BST vs HashMap — when to choose each</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• <strong>HashMap</strong> — O(1) average lookup, but keys are unordered; no range queries, no floor/ceiling, no in-order iteration</li>
          <li>• <strong>BST / TreeMap</strong> — O(log n) lookup, but supports range queries ("all values between 10 and 50"), floor/ceiling operations, and sorted iteration — essential for problems like "count elements in range", "find closest value", or "maintain sorted order with insertions"</li>
          <li>• If you need both speed and ordering: use Java's <code className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900 px-1 rounded">TreeMap</code> or Python's <code className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900 px-1 rounded">sortedcontainers.SortedDict</code></li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['inorder', 'preorder', 'postorder', 'insert'] as const).map(t => (
          <button key={t} onClick={() => { setTraversal(t); ctrl.reset() }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              traversal === t ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {t === 'insert' ? 'Insert' : `${t.charAt(0).toUpperCase() + t.slice(1)} Traversal`}
          </button>
        ))}
        {traversal === 'insert' && (
          <input type="number" value={insertVal} onChange={e => { setInsertVal(+e.target.value); ctrl.reset() }}
            className="w-24 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
        )}
      </div>

      <div className="viz-container overflow-x-auto">
        <svg width={svgW} height={280} className="block mx-auto">
          {/* Edges */}
          {vizEdges.map((e, i) => (
            <line key={i} x1={e.x1 + offsetX} y1={e.y1} x2={e.x2 + offsetX} y2={e.y2}
              stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />
          ))}
          {/* Nodes */}
          {vizNodes.map(n => {
            const isHighlight = cur.highlight.includes(n.id)
            const isVisited = cur.visited.includes(n.id)
            return (
              <g key={n.id} transform={`translate(${n.x + offsetX},${n.y})`}>
                <circle r={24} className={`transition-all duration-300 ${
                  isHighlight ? 'fill-violet-500' : isVisited ? 'fill-emerald-500' : 'fill-slate-200 dark:fill-slate-700'
                }`} />
                <text textAnchor="middle" dy="0.35em" fontSize={14} fontWeight="600"
                  className={isHighlight || isVisited ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                  {n.val}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-slate-500 pb-3">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Visited</span>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
