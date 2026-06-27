import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step { visited: number[]; current: number | null; callStack: number[]; message: string }

const TREE_NODES = [
  { id: 0, val: 1, x: 300, y: 40 },
  { id: 1, val: 2, x: 180, y: 130 },
  { id: 2, val: 3, x: 420, y: 130 },
  { id: 3, val: 4, x: 110, y: 220 },
  { id: 4, val: 5, x: 250, y: 220 },
  { id: 5, val: 6, x: 350, y: 220 },
  { id: 6, val: 7, x: 490, y: 220 },
]
const TREE_EDGES = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]]
const CHILDREN: Record<number, number[]> = { 0:[1,2], 1:[3,4], 2:[5,6] }

// Nodes represent folders in a codebase (root → modules → files)
const FOLDER_NAMES = ['src/', 'components/', 'utils/', 'Button.tsx', 'Modal.tsx', 'api.ts', 'format.ts']

function dfsSteps(): Step[] {
  const steps: Step[] = [{ visited: [], current: null, callStack: [], message: `File indexer starts at root folder "src/". DFS commits fully to one subfolder before exploring the next.` }]
  const visited: number[] = []
  const callStack: number[] = []

  function dfs(id: number) {
    callStack.push(id)
    steps.push({ visited: [...visited], current: id, callStack: [...callStack], message: `Enter "${FOLDER_NAMES[id]}" — depth ${callStack.length - 1}. Call stack depth: ${callStack.length}` })
    visited.push(id)
    steps.push({ visited: [...visited], current: id, callStack: [...callStack], message: `Index "${FOLDER_NAMES[id]}"` })
    for (const child of CHILDREN[id] || []) {
      steps.push({ visited: [...visited], current: id, callStack: [...callStack], message: `"${FOLDER_NAMES[id]}" has child "${FOLDER_NAMES[child]}" — recurse deeper` })
      dfs(child)
    }
    callStack.pop()
    steps.push({ visited: [...visited], current: callStack[callStack.length - 1] ?? null, callStack: [...callStack], message: `Finished indexing "${FOLDER_NAMES[id]}" and all its children. Return to caller.` })
  }

  dfs(0)
  steps.push({ visited: [...visited], current: null, callStack: [], message: `Index complete! All 7 entries scanned in preorder: ${visited.map(i => FOLDER_NAMES[i]).join(' → ')}` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// DFS — Recursive (preorder)
// O(V + E) time, O(V) space (call stack)
function dfs(node, visited = new Set()) {
  if (!node || visited.has(node)) return;
  visited.add(node);
  console.log(node.val); // process node
  for (const child of node.children || []) {
    dfs(child, visited);
  }
}

// DFS — Iterative with stack
function dfsIterative(root) {
  const stack = [root], visited = new Set();
  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node)) continue;
    visited.add(node);
    console.log(node.val);
    // Push in reverse so left is processed first
    for (let i = (node.children||[]).length-1; i >= 0; i--)
      stack.push(node.children[i]);
  }
}

// DFS for path finding
function hasPath(graph, src, dst, visited = new Set()) {
  if (src === dst) return true;
  visited.add(src);
  for (const nb of graph[src] || []) {
    if (!visited.has(nb) && hasPath(graph, nb, dst, visited))
      return true;
  }
  return false;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# DFS — Recursive
def dfs(node, visited=None):
    if visited is None: visited = set()
    if not node or node in visited: return
    visited.add(node)
    print(node.val)  # process
    for child in node.children or []:
        dfs(child, visited)

# DFS — Iterative with stack
def dfs_iterative(root):
    if not root: return
    stack, visited = [root], set()
    while stack:
        node = stack.pop()
        if node in visited: continue
        visited.add(node)
        print(node.val)
        for child in reversed(node.children or []):
            stack.append(child)

# DFS with backtracking (all paths)
def all_paths(graph, src, dst, path=None):
    if path is None: path = [src]
    if src == dst: return [path[:]]
    results = []
    for nb in graph.get(src, []):
        if nb not in path:
            path.append(nb)
            results.extend(all_paths(graph, nb, dst, path))
            path.pop()  # backtrack
    return results`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// DFS — Recursive
public void dfs(TreeNode node, Set<TreeNode> visited) {
    if (node == null || visited.contains(node)) return;
    visited.add(node);
    System.out.println(node.val);
    for (TreeNode child : node.children)
        dfs(child, visited);
}

// DFS — Iterative with Deque as stack
public void dfsIterative(TreeNode root) {
    if (root == null) return;
    Deque<TreeNode> stack = new ArrayDeque<>();
    Set<TreeNode> visited = new HashSet<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        TreeNode node = stack.pop();
        if (visited.contains(node)) continue;
        visited.add(node);
        System.out.println(node.val);
        // push children in reverse
        List<TreeNode> children = node.children;
        for (int i = children.size()-1; i >= 0; i--)
            stack.push(children.get(i));
    }
}`,
  },
]

export default function DFSPatternVisualizer() {
  const steps = dfsSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const getNodeFill = (id: number) => {
    if (cur.current === id) return 'fill-violet-500'
    if (cur.visited.includes(id)) return 'fill-emerald-500'
    if (cur.callStack.includes(id)) return 'fill-amber-400'
    return 'fill-slate-200 dark:fill-slate-700'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">DFS — Depth-First Search</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Commit fully to one branch before exploring the next — the call stack IS the traversal memory</p>
        </div>
        <ComplexityBadge time="O(V + E)" space="O(V) call stack" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A search engine's web crawler starts from a root page and follows links as deep as it can before backtracking.
          This file indexer enters a folder, recurses into every subfolder completely, then returns — mirroring the call stack growing and shrinking.
          Same pattern powers: maze solving, cycle detection, topological build-order, and tree serialization.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Need to <strong>explore all paths</strong> from a source, or visit every node once. Key signals: "all possible paths", "topological order", "connected components", "path exists".
          Pick DFS over BFS when shortest path doesn't matter, you expect the target deep in the tree, or you're doing backtracking. The call stack naturally tracks your position — no extra visited queue needed.
        </p>
      </div>

      <div className="viz-container">
        <svg width={600} height={280} className="block w-full max-w-2xl mx-auto" viewBox="0 0 600 280">
          {TREE_EDGES.map(([from, to], i) => (
            <line key={i} x1={TREE_NODES[from].x} y1={TREE_NODES[from].y} x2={TREE_NODES[to].x} y2={TREE_NODES[to].y}
              stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />
          ))}
          {TREE_NODES.map(n => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <circle r={24} className={`transition-all duration-300 ${getNodeFill(n.id)}`} />
              <text textAnchor="middle" dy="0.35em" fontSize={15} fontWeight="700"
                className={cur.visited.includes(n.id) || cur.current === n.id ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                {n.val}
              </text>
            </g>
          ))}
        </svg>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-slate-500 text-xs">Call Stack:</span>
            <div className="flex gap-1 flex-wrap">
              {cur.callStack.length === 0
                ? <span className="text-xs text-slate-400">empty</span>
                : cur.callStack.map((id, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-mono">
                    {FOLDER_NAMES[id]}
                  </span>
                ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-slate-500 text-xs">Indexed:</span>
            <div className="flex gap-1 flex-wrap">
              {cur.visited.map((id, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                  {FOLDER_NAMES[id]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> On call stack</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Visited</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
