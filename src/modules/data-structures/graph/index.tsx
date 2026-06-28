import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface GraphNode { id: number; label: string; x: number; y: number }
interface GraphEdge { from: number; to: number }
interface Step {
  visited: number[]
  current: number | null
  queue: number[]
  stack: number[]
  message: string
}

const NODES: GraphNode[] = [
  { id: 0, label: 'A', x: 300, y: 50 },
  { id: 1, label: 'B', x: 160, y: 150 },
  { id: 2, label: 'C', x: 440, y: 150 },
  { id: 3, label: 'D', x: 80,  y: 270 },
  { id: 4, label: 'E', x: 240, y: 270 },
  { id: 5, label: 'F', x: 360, y: 270 },
  { id: 6, label: 'G', x: 520, y: 270 },
]

const EDGES: GraphEdge[] = [
  { from: 0, to: 1 }, { from: 0, to: 2 },
  { from: 1, to: 3 }, { from: 1, to: 4 },
  { from: 2, to: 5 }, { from: 2, to: 6 },
]

const ADJ: Record<number, number[]> = {}
for (const e of EDGES) {
  ADJ[e.from] = [...(ADJ[e.from] || []), e.to]
  ADJ[e.to] = [...(ADJ[e.to] || []), e.from]
}

function bfsSteps(start: number): Step[] {
  const steps: Step[] = [{ visited: [], current: null, queue: [start], stack: [], message: `BFS from node ${NODES[start].label}. Initialize queue: [${NODES[start].label}]` }]
  const visited = new Set<number>()
  const queue = [start]
  visited.add(start)

  while (queue.length) {
    const cur = queue.shift()!
    steps.push({ visited: [...visited], current: cur, queue: [...queue], stack: [], message: `Dequeue ${NODES[cur].label}. Visit it.` })
    for (const nb of (ADJ[cur] || [])) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
        steps.push({ visited: [...visited], current: cur, queue: [...queue], stack: [], message: `Discover neighbor ${NODES[nb].label} — enqueue it` })
      }
    }
  }
  steps.push({ visited: [...visited], current: null, queue: [], stack: [], message: `BFS complete. Order: ${[...visited].map(i => NODES[i].label).join(' → ')}` })
  return steps
}

function dfsSteps(start: number): Step[] {
  const steps: Step[] = [{ visited: [], current: null, queue: [], stack: [start], message: `DFS from node ${NODES[start].label}. Initialize stack: [${NODES[start].label}]` }]
  const visited = new Set<number>()
  const stack = [start]

  while (stack.length) {
    const cur = stack.pop()!
    if (visited.has(cur)) continue
    visited.add(cur)
    steps.push({ visited: [...visited], current: cur, queue: [], stack: [...stack], message: `Pop ${NODES[cur].label} from stack. Visit it.` })
    const neighbors = [...(ADJ[cur] || [])].reverse()
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        stack.push(nb)
        steps.push({ visited: [...visited], current: cur, queue: [], stack: [...stack], message: `Push neighbor ${NODES[nb].label} onto stack` })
      }
    }
  }
  steps.push({ visited: [...visited], current: null, queue: [], stack: [], message: `DFS complete. Order: ${[...visited].map(i => NODES[i].label).join(' → ')}` })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Adjacency List representation
const graph = {
  A: ['B', 'C'],
  B: ['A', 'D', 'E'],
  C: ['A', 'F', 'G'],
  D: ['B'], E: ['B'], F: ['C'], G: ['C']
};

// BFS - O(V + E)
function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  const result = [];
  while (queue.length) {
    const node = queue.shift();
    result.push(node);
    for (const nb of graph[node] || []) {
      if (!visited.has(nb)) {
        visited.add(nb); queue.push(nb);
      }
    }
  }
  return result;
}

// DFS - O(V + E)
function dfs(graph, node, visited = new Set()) {
  visited.add(node);
  for (const nb of graph[node] || []) {
    if (!visited.has(nb)) dfs(graph, nb, visited);
  }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `from collections import deque

graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F', 'G'],
    'D': ['B'], 'E': ['B'],
    'F': ['C'], 'G': ['C']
}

# BFS - O(V + E)
def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    result = []
    while queue:
        node = queue.popleft()
        result.append(node)
        for nb in graph.get(node, []):
            if nb not in visited:
                visited.add(nb)
                queue.append(nb)
    return result

# DFS - O(V + E)
def dfs(graph, node, visited=None):
    if visited is None: visited = set()
    visited.add(node)
    for nb in graph.get(node, []):
        if nb not in visited:
            dfs(graph, nb, visited)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.*;

Map<String, List<String>> graph = new HashMap<>();
// Build graph...

// BFS - O(V + E)
public List<String> bfs(String start) {
    Set<String> visited = new HashSet<>();
    Queue<String> queue = new LinkedList<>();
    List<String> result = new ArrayList<>();
    queue.offer(start); visited.add(start);
    while (!queue.isEmpty()) {
        String node = queue.poll();
        result.add(node);
        for (String nb : graph.getOrDefault(node, List.of())) {
            if (!visited.contains(nb)) {
                visited.add(nb); queue.offer(nb);
            }
        }
    }
    return result;
}

// DFS - O(V + E)
public void dfs(String node, Set<String> visited) {
    visited.add(node);
    for (String nb : graph.getOrDefault(node, List.of()))
        if (!visited.contains(nb)) dfs(nb, visited);
}`,
  },
]

export default function GraphVisualizer() {
  const [mode, setMode] = useState<'bfs' | 'dfs'>('bfs')
  const steps = mode === 'bfs' ? bfsSteps(0) : dfsSteps(0)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const getNodeColor = (id: number) => {
    if (cur.current === id) return 'fill-violet-500'
    if (cur.visited.includes(id)) return 'fill-emerald-500'
    return 'fill-slate-200 dark:fill-slate-700'
  }

  const getEdgeColor = (e: GraphEdge) => {
    if (cur.visited.includes(e.from) && cur.visited.includes(e.to)) return '#22c55e'
    return undefined
  }

  const dataStructure = mode === 'bfs'
    ? `Queue: [${cur.queue.map(i => NODES[i].label).join(', ')}]`
    : `Stack: [${cur.stack.map(i => NODES[i].label).join(', ')}]`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Graph</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Nodes connected by edges — BFS & DFS traversal</p>
        </div>
        <ComplexityBadge time="O(V + E)" space="O(V)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Graphs are the most general data structure — a tree is just a connected, acyclic, undirected graph. Real-world graphs are everywhere: <strong>social networks</strong> (nodes = people, edges = friendships), <strong>maps</strong> (nodes = intersections, edges = roads with weights), <strong>dependency graphs</strong> (npm packages, Makefile targets), <strong>web pages</strong> (nodes = URLs, edges = hyperlinks — Google's PageRank runs on this).</p>
        <p><strong>Two representations:</strong></p>
        <ul className="space-y-1 ml-2">
          <li>• <strong>Adjacency list</strong> — each node stores a list of its neighbors. O(V+E) space. Fast to iterate neighbors. Used for most real graphs (which are sparse).</li>
          <li>• <strong>Adjacency matrix</strong> — V×V boolean grid. O(V²) space. O(1) edge lookup ("is there an edge between A and B?"). Good for dense graphs or when you need fast edge checks.</li>
        </ul>
        <p><strong>Directed vs undirected:</strong> Twitter follows are directed (A→B doesn't imply B→A). Facebook friendships are undirected (mutual). <strong>Weighted vs unweighted:</strong> road distances are weighted, social connections are typically unweighted. BFS finds shortest path in hops (unweighted); Dijkstra's algorithm finds shortest path by total weight.</p>
      </div>

      <div className="flex gap-2">
        {(['bfs', 'dfs'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-colors ${
              mode === m ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {m} ({m === 'bfs' ? 'Queue' : 'Stack'})
          </button>
        ))}
      </div>

      <div className="viz-container">
        <svg width="600" height="320" className="block mx-auto w-full max-w-2xl" viewBox="0 0 600 320">
          {EDGES.map((e, i) => {
            const from = NODES[e.from]; const to = NODES[e.to]
            const color = getEdgeColor(e)
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color || 'currentColor'} strokeWidth={color ? 3 : 2}
              className={color ? '' : 'text-slate-300 dark:text-slate-700'} />
          })}
          {NODES.map(n => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <circle r={26} className={`transition-all duration-300 ${getNodeColor(n.id)}`} />
              <text textAnchor="middle" dy="0.35em" fontSize={16} fontWeight="700"
                className={cur.visited.includes(n.id) || cur.current === n.id ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Data structure state */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-mono px-2 py-0.5 rounded ${mode === 'bfs' ? 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
              {dataStructure}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Visited</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 inline-block"></span> Unvisited</span>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
