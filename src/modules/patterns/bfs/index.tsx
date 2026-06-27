import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step { visited: number[]; current: number | null; queue: number[]; level: number; levelNodes: number[][]; message: string }

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
const ADJ: Record<number, number[]> = { 0:[1,2], 1:[3,4], 2:[5,6] }

// The nodes represent subway stations in a city network.
// Station 1 = Central Hub (start). Find shortest path (fewest stops) to all stations.
const STATION_NAMES = ['Central', 'North', 'East', 'Park', 'Mall', 'Stadium', 'Airport']

function bfsLevelSteps(): Step[] {
  const steps: Step[] = [{ visited: [], current: null, queue: [0], level: 0, levelNodes: [[0]], message: `Emergency routing: find shortest path from ${STATION_NAMES[0]} station to all others. Enqueue Central (stop 0).` }]
  const visited: number[] = []
  const queue = [0]
  const levelNodes: number[][] = [[0]]
  let level = 0

  while (queue.length) {
    const levelSize = queue.length
    const nextLevel: number[] = []
    for (let i = 0; i < levelSize; i++) {
      const cur = queue.shift()!
      visited.push(cur)
      steps.push({ visited: [...visited], current: cur, queue: [...queue], level, levelNodes: [...levelNodes], message: `${level} stop${level !== 1 ? 's' : ''} from Central: visit "${STATION_NAMES[cur]}" station (node ${TREE_NODES[cur].val})` })
      for (const nb of ADJ[cur] || []) {
        queue.push(nb); nextLevel.push(nb)
        steps.push({ visited: [...visited], current: cur, queue: [...queue], level, levelNodes: [...levelNodes], message: `Enqueue adjacent station "${STATION_NAMES[nb]}" — reachable in ${level + 1} stop${level + 1 !== 1 ? 's' : ''}` })
      }
    }
    if (nextLevel.length) { level++; levelNodes.push(nextLevel) }
  }
  steps.push({ visited: [...visited], current: null, queue: [], level, levelNodes, message: `Route map complete! BFS order (fewest stops first): ${visited.map(i => STATION_NAMES[i]).join(' → ')}` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// BFS — Level order traversal
// O(V + E) time, O(V) space (queue)
function bfs(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const levelSize = queue.length;
    const level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result; // [[1],[2,3],[4,5,6,7]]
}

// Use BFS for shortest path in unweighted graph
function shortestPath(graph, start, end) {
  const queue = [[start, 0]]; // [node, distance]
  const visited = new Set([start]);
  while (queue.length) {
    const [node, dist] = queue.shift();
    if (node === end) return dist;
    for (const nb of graph[node] || []) {
      if (!visited.has(nb)) {
        visited.add(nb); queue.push([nb, dist + 1]);
      }
    }
  }
  return -1;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `from collections import deque

# BFS — Level order traversal
def bfs(root):
    if not root: return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result  # [[1],[2,3],[4,5,6,7]]

# Shortest path in unweighted graph
def shortest_path(graph, start, end):
    queue = deque([(start, 0)])
    visited = {start}
    while queue:
        node, dist = queue.popleft()
        if node == end: return dist
        for nb in graph.get(node, []):
            if nb not in visited:
                visited.add(nb)
                queue.append((nb, dist + 1))
    return -1`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// BFS level order traversal
public List<List<Integer>> bfs(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left  != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}`,
  },
]

export default function BFSPatternVisualizer() {
  const steps = bfsLevelSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const getNodeFill = (id: number) => {
    if (cur.current === id) return 'fill-violet-500'
    if (cur.visited.includes(id)) return 'fill-emerald-500'
    if (cur.queue.includes(id)) return 'fill-amber-400'
    return 'fill-slate-200 dark:fill-slate-700'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BFS — Breadth-First Search</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Explore level by level — always finds the shortest path (fewest hops) in an unweighted graph</p>
        </div>
        <ComplexityBadge time="O(V + E)" space="O(V)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          An emergency routing system needs to broadcast an alert to all subway stations, starting from Central Hub.
          BFS explores every station reachable in 1 stop before looking 2 stops away — guaranteeing that each station is reached via the <em>minimum</em> number of stops.
          The same principle powers: shortest path in mazes, social network "degrees of separation", web crawlers, and network packet routing.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          You need the <strong>shortest path in an unweighted graph</strong>, or you need to process nodes <strong>level by level</strong>.
          Key signals: "minimum steps", "fewest moves", "nearest/closest", "level order".
          BFS is correct because a FIFO queue ensures you always process nodes at distance d before distance d+1 — proving the first time you reach a node, it's via the shortest route.
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
                className={cur.visited.includes(n.id) || cur.current === n.id || cur.queue.includes(n.id) ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                {n.val}
              </text>
            </g>
          ))}
        </svg>

        {/* Queue state */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-slate-500 text-xs">Queue:</span>
            <div className="flex gap-1 flex-wrap">
              {cur.queue.length === 0
                ? <span className="text-xs text-slate-400">empty</span>
                : cur.queue.map((id, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-mono">
                    {TREE_NODES[id].val}
                  </span>
                ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-slate-500 text-xs">Visited:</span>
            <div className="flex gap-1 flex-wrap">
              {cur.visited.length === 0
                ? <span className="text-xs text-slate-400">none</span>
                : cur.visited.map((id, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                    {TREE_NODES[id].val}
                  </span>
                ))}
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> In queue</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Visited</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
