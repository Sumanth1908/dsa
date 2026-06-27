export interface SubCategory {
  id: string
  title: string
  path: string
  description: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

export interface ModuleSection {
  id: string
  title: string
  path: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  subcategories: SubCategory[]
}

export const registry: ModuleSection[] = [
  {
    id: 'data-structures',
    title: 'Data Structures',
    path: '/data-structures',
    icon: '🗄️',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    description: 'Visual, interactive representations of fundamental data structures',
    subcategories: [
      { id: 'array', title: 'Array', path: '/data-structures/array', description: 'Index-based linear storage', difficulty: 'beginner', tags: ['linear', 'O(1) access'] },
      { id: 'linked-list', title: 'Linked List', path: '/data-structures/linked-list', description: 'Singly & doubly linked nodes', difficulty: 'beginner', tags: ['pointers', 'dynamic'] },
      { id: 'stack', title: 'Stack', path: '/data-structures/stack', description: 'LIFO — Last In, First Out', difficulty: 'beginner', tags: ['LIFO', 'recursion'] },
      { id: 'queue', title: 'Queue', path: '/data-structures/queue', description: 'FIFO — First In, First Out', difficulty: 'beginner', tags: ['FIFO', 'BFS'] },
      { id: 'tree', title: 'Binary Search Tree', path: '/data-structures/tree', description: 'Ordered binary tree with traversals', difficulty: 'intermediate', tags: ['BST', 'traversal'] },
      { id: 'graph', title: 'Graph', path: '/data-structures/graph', description: 'Nodes, edges, adjacency representations', difficulty: 'intermediate', tags: ['BFS', 'DFS'] },
      { id: 'heap', title: 'Heap', path: '/data-structures/heap', description: 'Min/Max heap with heapify', difficulty: 'intermediate', tags: ['priority queue', 'O(log n)'] },
    ],
  },
  {
    id: 'algorithms',
    title: 'Algorithms',
    path: '/algorithms',
    icon: '⚡',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Step-by-step sorting and searching algorithm visualizations',
    subcategories: [
      { id: 'bubble-sort', title: 'Bubble Sort', path: '/algorithms/bubble-sort', description: 'Compare adjacent, swap if needed', difficulty: 'beginner', tags: ['O(n²)', 'stable'] },
      { id: 'merge-sort', title: 'Merge Sort', path: '/algorithms/merge-sort', description: 'Divide, sort, merge recursively', difficulty: 'intermediate', tags: ['O(n log n)', 'divide & conquer'] },
      { id: 'quick-sort', title: 'Quick Sort', path: '/algorithms/quick-sort', description: 'Partition around pivot', difficulty: 'intermediate', tags: ['O(n log n)', 'in-place'] },
      { id: 'heap-sort', title: 'Heap Sort', path: '/algorithms/heap-sort', description: 'Sort using max-heap property', difficulty: 'intermediate', tags: ['O(n log n)', 'in-place'] },
      { id: 'binary-search', title: 'Binary Search', path: '/algorithms/binary-search', description: 'Halve search space each step', difficulty: 'beginner', tags: ['O(log n)', 'sorted'] },
    ],
  },
  {
    id: 'patterns',
    title: 'Problem Patterns',
    path: '/patterns',
    icon: '🧩',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Common interview problem-solving patterns with visualizations',
    subcategories: [
      { id: 'two-pointer', title: 'Two Pointer', path: '/patterns/two-pointer', description: 'Two indices traversing toward each other', difficulty: 'beginner', tags: ['arrays', 'sorted'] },
      { id: 'sliding-window', title: 'Sliding Window', path: '/patterns/sliding-window', description: 'Expand/shrink a window over data', difficulty: 'intermediate', tags: ['subarray', 'substring'] },
      { id: 'fast-slow', title: 'Fast & Slow Pointer', path: '/patterns/fast-slow', description: 'Cycle detection in linked structures', difficulty: 'intermediate', tags: ['cycle', 'linked list'] },
      { id: 'bfs-pattern', title: 'BFS Pattern', path: '/patterns/bfs', description: 'Level-by-level traversal with a queue', difficulty: 'intermediate', tags: ['queue', 'shortest path'] },
      { id: 'dfs-pattern', title: 'DFS Pattern', path: '/patterns/dfs', description: 'Depth-first with backtracking', difficulty: 'intermediate', tags: ['stack', 'recursion'] },
      { id: 'binary-search-pattern', title: 'Binary Search Pattern', path: '/patterns/binary-search', description: 'Search on sorted/monotonic conditions', difficulty: 'intermediate', tags: ['O(log n)', 'sorted'] },
      { id: 'backtracking', title: 'Backtracking', path: '/patterns/backtracking', description: 'Explore all candidates, undo bad choices', difficulty: 'advanced', tags: ['recursion', 'permutations', 'N-Queens'] },
      { id: 'memoization', title: 'Memoization', path: '/patterns/memoization', description: 'Cache recursive sub-problem results (top-down DP)', difficulty: 'intermediate', tags: ['DP', 'recursion', 'cache'] },
      { id: 'dynamic-programming', title: 'Dynamic Programming', path: '/patterns/dynamic-programming', description: 'Build optimal solutions bottom-up from sub-problems', difficulty: 'advanced', tags: ['DP', 'tabulation', 'optimal substructure'] },
      { id: 'merge-intervals', title: 'Merge Intervals', path: '/patterns/merge-intervals', description: 'Combine overlapping ranges efficiently', difficulty: 'intermediate', tags: ['intervals', 'sorting', 'O(n log n)'] },
      { id: 'top-k-elements', title: 'Top K Elements', path: '/patterns/top-k', description: 'Find K largest/smallest using a heap', difficulty: 'intermediate', tags: ['heap', 'priority queue', 'O(n log k)'] },
      { id: 'monotonic-stack', title: 'Monotonic Stack', path: '/patterns/monotonic-stack', description: 'Maintain sorted invariant to find next greater/smaller', difficulty: 'intermediate', tags: ['stack', 'next greater element', 'O(n)'] },
    ],
  },
  {
    id: 'programming-concepts',
    title: 'Programming Concepts',
    path: '/concepts',
    icon: '💡',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
    description: 'Core and advanced programming paradigms across JS, Python, Java',
    subcategories: [
      { id: 'event-loop', title: 'Event Loop', path: '/concepts/event-loop', description: 'JavaScript call stack, task queue, microtasks', difficulty: 'intermediate', tags: ['JavaScript', 'async'] },
      { id: 'async-await', title: 'Async / Await', path: '/concepts/async-await', description: 'Promise chaining and async patterns', difficulty: 'intermediate', tags: ['JavaScript', 'Python'] },
      { id: 'concurrency', title: 'Concurrency', path: '/concepts/concurrency', description: 'Threads, locks, race conditions', difficulty: 'advanced', tags: ['Java', 'Python', 'threads'] },
      { id: 'memory', title: 'Memory Model', path: '/concepts/memory', description: 'Stack vs Heap, GC, memory leaks', difficulty: 'advanced', tags: ['JVM', 'V8', 'CPython'] },
    ],
  },
  {
    id: 'system-design',
    title: 'System Design',
    path: '/system-design',
    icon: '🏗️',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    description: 'Distributed systems patterns with interactive animated diagrams',
    subcategories: [
      { id: 'load-balancing', title: 'Load Balancing', path: '/system-design/load-balancing', description: 'Round-robin, least-connections, hashing', difficulty: 'intermediate', tags: ['horizontal scaling', 'availability'] },
      { id: 'caching', title: 'Caching & LRU', path: '/system-design/caching', description: 'LRU eviction, CDN, Redis patterns', difficulty: 'intermediate', tags: ['Redis', 'CDN', 'eviction'] },
      { id: 'message-queues', title: 'Message Queues', path: '/system-design/message-queues', description: 'Pub/Sub, at-least-once, ordering', difficulty: 'intermediate', tags: ['Kafka', 'async', 'decoupling'] },
      { id: 'cap-theorem', title: 'CAP Theorem', path: '/system-design/cap-theorem', description: 'Consistency, Availability, Partition tolerance', difficulty: 'advanced', tags: ['distributed', 'trade-offs'] },
    ],
  },
  {
    id: 'networking',
    title: 'Networking',
    path: '/networking',
    icon: '🌐',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Protocol-level simulations: TCP, UDP, WebSocket, HTTP',
    subcategories: [
      { id: 'tcp', title: 'TCP Handshake', path: '/networking/tcp', description: '3-way handshake, connection teardown', difficulty: 'intermediate', tags: ['reliable', 'connection-oriented'] },
      { id: 'udp-vs-tcp', title: 'UDP vs TCP', path: '/networking/udp', description: 'Side-by-side packet flow comparison', difficulty: 'beginner', tags: ['UDP', 'TCP', 'comparison'] },
      { id: 'websocket', title: 'WebSocket', path: '/networking/websocket', description: 'Upgrade handshake, bidirectional frames', difficulty: 'intermediate', tags: ['real-time', 'full-duplex'] },
    ],
  },
]

export function getSection(id: string): ModuleSection | undefined {
  return registry.find(s => s.id === id)
}
