import React from 'react'
import { Link } from 'react-router-dom'
import ComplexityBadge from '@/components/shared/ComplexityBadge'

export default function TreeOverview() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tree</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Hierarchical structure — root, parent, child, leaf; the foundation for BST, Heap, and Trie</p>
        </div>
        <ComplexityBadge time="O(n) traversal" space="O(n)" />
      </div>

      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm text-sky-800 dark:text-sky-300 space-y-3">
        <p className="font-semibold text-sky-700 dark:text-sky-200">What is a Tree?</p>
        <p>A tree is a connected, acyclic graph with a designated <strong>root</strong>. Unlike a general graph, there is exactly one path between any two nodes — no cycles, and a unique parent-child hierarchy flows from the root downward.</p>
        <ul className="space-y-1 pl-1">
          <li>• <strong>Root</strong> — the single top node with no parent; every tree has exactly one</li>
          <li>• <strong>Leaf</strong> — a node with no children; the "endpoints" of the tree</li>
          <li>• <strong>Internal node</strong> — any node that has at least one child</li>
          <li>• <strong>Depth</strong> — number of edges from root to a node (root has depth 0)</li>
          <li>• <strong>Height</strong> — longest path from a node down to a leaf; height of tree = height of root</li>
          <li>• <strong>Subtree</strong> — a node and all of its descendants; every node is the root of its own subtree</li>
          <li>• <strong>N−1 edges invariant</strong> — a tree with N nodes always has exactly N−1 edges; one edge connects each non-root node to its parent</li>
        </ul>

        <div className="mt-3 overflow-x-auto">
          <svg width="540" height="220" className="block mx-auto" viewBox="0 0 540 220">
            <line x1="270" y1="35" x2="150" y2="105" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <line x1="270" y1="35" x2="390" y2="105" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <line x1="150" y1="105" x2="80" y2="175" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <line x1="150" y1="105" x2="220" y2="175" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <line x1="390" y1="105" x2="320" y2="175" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <line x1="390" y1="105" x2="460" y2="175" stroke="currentColor" strokeWidth="2" className="text-sky-400 dark:text-sky-600" />
            <circle cx="270" cy="35" r="24" className="fill-violet-500" />
            <text x="270" y="35" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">A</text>
            <text x="270" y="68" textAnchor="middle" fontSize="11" className="fill-sky-600 dark:fill-sky-400">root</text>
            <circle cx="150" cy="105" r="22" className="fill-sky-400 dark:fill-sky-600" />
            <text x="150" y="105" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">B</text>
            <circle cx="390" cy="105" r="22" className="fill-sky-400 dark:fill-sky-600" />
            <text x="390" y="105" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">C</text>
            <text x="390" y="135" textAnchor="middle" fontSize="10" className="fill-sky-600 dark:fill-sky-400">internal</text>
            <circle cx="80" cy="175" r="22" className="fill-emerald-400 dark:fill-emerald-600" />
            <text x="80" y="175" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">D</text>
            <text x="80" y="205" textAnchor="middle" fontSize="10" className="fill-emerald-600 dark:fill-emerald-400">leaf</text>
            <circle cx="220" cy="175" r="22" className="fill-emerald-400 dark:fill-emerald-600" />
            <text x="220" y="175" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">E</text>
            <text x="220" y="205" textAnchor="middle" fontSize="10" className="fill-emerald-600 dark:fill-emerald-400">leaf</text>
            <circle cx="320" cy="175" r="22" className="fill-emerald-400 dark:fill-emerald-600" />
            <text x="320" y="175" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">F</text>
            <text x="320" y="205" textAnchor="middle" fontSize="10" className="fill-emerald-600 dark:fill-emerald-400">leaf</text>
            <circle cx="460" cy="175" r="22" className="fill-emerald-400 dark:fill-emerald-600" />
            <text x="460" y="175" textAnchor="middle" dy="0.35em" fontSize="13" fontWeight="700" fill="white">G</text>
            <text x="460" y="205" textAnchor="middle" fontSize="10" className="fill-emerald-600 dark:fill-emerald-400">leaf</text>
            <text x="10" y="38" fontSize="10" className="fill-slate-400">depth 0</text>
            <text x="10" y="108" fontSize="10" className="fill-slate-400">depth 1</text>
            <text x="10" y="178" fontSize="10" className="fill-slate-400">depth 2</text>
          </svg>
        </div>
        <p className="text-xs text-sky-600 dark:text-sky-500 text-center">7 nodes, 6 edges (N−1). Height = 2. A is root; D, E, F, G are leaves.</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">Binary tree shapes — what each name means</strong>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-emerald-800 dark:text-emerald-400">
          <div>
            <p className="font-semibold">Full binary tree</p>
            <p>Every node has 0 or 2 children — no node has exactly one child. Expression trees are always full.</p>
          </div>
          <div>
            <p className="font-semibold">Complete binary tree</p>
            <p>All levels filled except possibly the last, which is filled left to right. Heaps are complete trees, stored in arrays with index math.</p>
          </div>
          <div>
            <p className="font-semibold">Perfect binary tree</p>
            <p>All internal nodes have exactly 2 children and all leaves are at the same depth. N = 2^(h+1) − 1 nodes; maximum density.</p>
          </div>
          <div>
            <p className="font-semibold">Balanced binary tree</p>
            <p>Height is O(log n). AVL trees guarantee |leftHeight − rightHeight| ≤ 1 at every node. Red-Black trees use color rules for looser balance.</p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-semibold">Degenerate (skewed) tree</p>
            <p>Every internal node has one child — essentially a linked list. Inserting a sorted sequence into a BST produces this; height becomes O(n), destroying search guarantees.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm">
        <strong className="text-slate-700 dark:text-slate-200 block mb-3">Traversal strategies — DFS vs BFS</strong>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">DFS — depth-first (stack / recursion)</p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>Inorder</strong> (L → Root → R) — sorted output for a BST</li>
              <li>• <strong>Preorder</strong> (Root → L → R) — serialize/copy a tree; parent always before children</li>
              <li>• <strong>Postorder</strong> (L → R → Root) — delete a tree; children processed before parent</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">BFS — breadth-first (queue)</p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>Level-order</strong> — visit all nodes at depth d before depth d+1</li>
              <li>• Used for: minimum depth, right side view, level averages, zigzag traversal</li>
              <li>• Each level in the queue represents one wave of nodes</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tree sub-types in this app</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/data-structures/bst"
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors group">
            <div className="text-2xl mb-2">🔍</div>
            <p className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300">Binary Search Tree</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">left &lt; node &lt; right — O(log n) search, insert, delete</p>
          </Link>
          <Link to="/data-structures/heap"
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors group">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300">Heap</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Complete binary tree — O(1) peek min/max, O(log n) insert/extract</p>
          </Link>
          <Link to="/data-structures/trie"
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors group">
            <div className="text-2xl mb-2">🔤</div>
            <p className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300">Trie</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Each edge is a character — O(m) prefix search and autocomplete</p>
          </Link>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm">
        <strong className="text-slate-700 dark:text-slate-200 block mb-2">Advanced tree types (interview context)</strong>
        <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
          <li>• <strong>AVL tree</strong> — self-balancing BST; enforces |leftHeight − rightHeight| ≤ 1 via rotations; O(log n) guaranteed for all ops</li>
          <li>• <strong>Red-Black tree</strong> — self-balancing BST with color rules; less strictly balanced than AVL but cheaper to maintain; used in Java's <code className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">TreeMap</code> and Linux scheduler</li>
          <li>• <strong>Segment tree</strong> — binary tree where each node stores aggregate of a range (sum, min, max); O(log n) range queries and point updates; built in O(n)</li>
          <li>• <strong>Fenwick tree (BIT)</strong> — compact alternative to segment tree for prefix sums; O(log n) update and query, O(n) space with simpler code</li>
          <li>• <strong>B-tree / B+ tree</strong> — multi-way balanced tree; minimizes disk I/O by keeping more keys per node; the basis of all database indexes and file systems</li>
          <li>• <strong>N-ary tree</strong> — each node can have up to N children; used for file systems (directory trees), JSON/XML DOM, and organization charts</li>
        </ul>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm">
        <strong className="text-indigo-700 dark:text-indigo-300 block mb-2">Famous techniques on trees</strong>
        <ul className="space-y-1.5 text-indigo-800 dark:text-indigo-400">
          <li>• <Link to="/patterns/dfs" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">DFS (recursive / iterative)</Link> — the workhorse for most tree problems; use recursion for elegance, an explicit stack to avoid stack-overflow on deep trees</li>
          <li>• <Link to="/patterns/bfs" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">BFS / level-order</Link> — any problem that mentions "level", "depth", or "shortest path in an unweighted tree"</li>
          <li>• <strong>LCA (Lowest Common Ancestor)</strong> — binary lifting or Euler tour + sparse table; foundational for many path problems on trees</li>
          <li>• <strong>Tree diameter</strong> — two DFS passes (or one DFS tracking max depth); the longest path between any two nodes</li>
          <li>• <strong>Path sum / root-to-leaf</strong> — DFS carrying a running sum; check at leaves; pruning possible with target sum</li>
          <li>• <strong>Serialize / deserialize</strong> — preorder DFS with null markers fully encodes a tree; used in distributed systems and databases</li>
        </ul>
      </div>
    </div>
  )
}
