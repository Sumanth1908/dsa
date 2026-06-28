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
  // ── AI & Machine Learning ─────────────────────────────────────────────────
  {
    id: 'ai-ml',
    title: 'AI & Machine Learning',
    path: '/ai-ml',
    icon: '🤖',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'RAG pipelines, vector embeddings, and neural network fundamentals — visualized step by step',
    subcategories: [
      { id: 'rag', title: 'RAG Pipeline', path: '/ai-ml/rag', description: 'Retrieval-Augmented Generation: ingest → embed → search → generate', difficulty: 'intermediate', tags: ['LLM', 'embeddings', 'semantic search'] },
      { id: 'vector-embeddings', title: 'Vector Embeddings', path: '/ai-ml/vector-embeddings', description: 'How text becomes vectors and cosine similarity finds meaning', difficulty: 'intermediate', tags: ['cosine similarity', 'transformers', 'semantic'] },
      { id: 'neural-networks', title: 'Neural Networks', path: '/ai-ml/neural-networks', description: 'Forward pass through a multi-layer network — spam classifier demo', difficulty: 'advanced', tags: ['deep learning', 'activation', 'layers', 'weights'] },
    ],
  },

  // ── Containers & Kubernetes ───────────────────────────────────────────────
  {
    id: 'containers',
    title: 'Containers & K8s',
    path: '/containers',
    icon: '📦',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Kubernetes architecture, pod lifecycle, and container orchestration patterns',
    subcategories: [
      { id: 'kubernetes', title: 'Kubernetes Architecture', path: '/containers/kubernetes', description: 'Cluster, control plane, nodes, pods and the deployment lifecycle', difficulty: 'advanced', tags: ['K8s', 'pods', 'deployments', 'orchestration'] },
    ],
  },

  // ── Data Structures ───────────────────────────────────────────────────────
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

  // ── Algorithms ────────────────────────────────────────────────────────────
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

  // ── Problem Patterns ──────────────────────────────────────────────────────
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

  // ── JavaScript ────────────────────────────────────────────────────────────
  {
    id: 'javascript',
    title: 'JavaScript',
    path: '/javascript',
    icon: '🟨',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'JS-specific internals — the event loop, async patterns, and runtime behaviour',
    subcategories: [
      { id: 'event-loop', title: 'Event Loop & Async', path: '/javascript/event-loop', description: 'Call stack, task queue, microtasks, async/await — how JS stays non-blocking', difficulty: 'intermediate', tags: ['event loop', 'promises', 'async/await', 'microtasks'] },
    ],
  },

  // ── Python ────────────────────────────────────────────────────────────────
  {
    id: 'python',
    title: 'Python',
    path: '/python',
    icon: '🐍',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Python-specific patterns — generators, decorators, context managers, and OOP',
    subcategories: [
      { id: 'generators', title: 'Generators & Iterators', path: '/python/generators', description: 'yield pauses a function and streams values lazily — O(1) memory for any size', difficulty: 'intermediate', tags: ['yield', 'lazy evaluation', 'iterators', 'streams'] },
      { id: 'decorators', title: 'Decorators', path: '/python/decorators', description: '@decorator wraps functions to add behaviour without modifying the original', difficulty: 'intermediate', tags: ['higher-order functions', 'AOP', 'first-class', 'functools'] },
      { id: 'context-managers', title: 'Context Managers', path: '/python/context-managers', description: 'with guarantees __enter__ and __exit__ — automatic resource cleanup', difficulty: 'intermediate', tags: ['with', '__enter__', '__exit__', 'RAII', 'resource management'] },
    ],
  },

  // ── Coding Essentials ─────────────────────────────────────────────────────
  {
    id: 'coding-essentials',
    title: 'Coding Essentials',
    path: '/essentials',
    icon: '💡',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
    description: 'Language-agnostic fundamentals — concurrency, hardware, security, and auth patterns',
    subcategories: [
      { id: 'concurrency', title: 'Concurrency', path: '/essentials/concurrency', description: 'Coffee-shop model: sync vs async vs multi-threaded — race conditions and mutexes', difficulty: 'advanced', tags: ['threads', 'event loop', 'coroutines', 'race condition', 'mutex'] },
      { id: 'cpu-threads', title: 'CPU & Threads', path: '/essentials/cpu-threads', description: 'Cores, threads, I/O-bound vs CPU-bound — restaurant kitchen analogy', difficulty: 'intermediate', tags: ['hardware', 'parallelism', 'I/O-bound', 'CPU-bound'] },
      { id: 'memory', title: 'Memory Model', path: '/essentials/memory', description: 'Stack vs Heap, garbage collection, and memory leaks', difficulty: 'advanced', tags: ['JVM', 'V8', 'CPython', 'GC', 'heap', 'stack'] },
      { id: 'jwt', title: 'JWT Authentication', path: '/essentials/jwt', description: 'Token structure, signing, and claims — decoded live', difficulty: 'intermediate', tags: ['auth', 'security', 'tokens', 'HMAC', 'stateless'] },
    ],
  },

  // ── System Design ─────────────────────────────────────────────────────────
  {
    id: 'system-design',
    title: 'System Design',
    path: '/system-design',
    icon: '🏗️',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    description: 'Distributed systems patterns, real architectures, and design interview frameworks',
    subcategories: [
      { id: 'system-design-approach', title: 'Design Approach', path: '/system-design/approach', description: 'Framework: Requirements → Scale → API → Architecture — with worked examples', difficulty: 'intermediate', tags: ['interview', 'framework', 'requirements', 'trade-offs'] },
      { id: 'event-booking', title: 'Event Booking API', path: '/system-design/event-booking', description: 'REST API design, double-booking race condition, and distributed locking', difficulty: 'intermediate', tags: ['REST', 'concurrency', 'race condition', 'case study'] },
      { id: 'video-processing', title: 'Video Processing', path: '/system-design/video-processing', description: 'Upload → transcode → segment → CDN — adaptive bitrate streaming pipeline', difficulty: 'advanced', tags: ['streaming', 'transcoding', 'CDN', 'HLS', 'adaptive bitrate'] },
      { id: 'gaming-system', title: 'Gaming System', path: '/system-design/gaming-system', description: 'Matchmaking, authoritative game server, event broker — multiplayer architecture', difficulty: 'advanced', tags: ['real-time', 'matchmaking', 'WebSocket', 'game server', 'low latency'] },
      { id: 'load-balancing', title: 'Load Balancing', path: '/system-design/load-balancing', description: 'Round-robin, least-connections, hashing', difficulty: 'intermediate', tags: ['horizontal scaling', 'availability'] },
      { id: 'caching', title: 'Caching & LRU', path: '/system-design/caching', description: 'LRU eviction, CDN, Redis patterns', difficulty: 'intermediate', tags: ['Redis', 'CDN', 'eviction'] },
      { id: 'message-queues', title: 'Message Queues', path: '/system-design/message-queues', description: 'Async messaging with ordering and at-least-once delivery', difficulty: 'intermediate', tags: ['Kafka', 'async', 'decoupling'] },
      { id: 'pub-sub', title: 'Pub-Sub Pattern', path: '/system-design/pub-sub', description: 'Publishers broadcast to topics — broker fans out to N subscribers', difficulty: 'intermediate', tags: ['events', 'Kafka', 'Redis', 'decoupling', 'fan-out'] },
      { id: 'cap-theorem', title: 'CAP Theorem', path: '/system-design/cap-theorem', description: 'Consistency, Availability, Partition tolerance', difficulty: 'advanced', tags: ['distributed', 'trade-offs'] },
      { id: 'rate-limiter', title: 'Rate Limiter', path: '/system-design/rate-limiter', description: 'Token bucket, leaky bucket, fixed window — animated', difficulty: 'intermediate', tags: ['throttling', 'token bucket', 'DoS protection'] },
      { id: 'cdn', title: 'CDN', path: '/system-design/cdn', description: 'Edge server routing, cache hit vs miss, TTL', difficulty: 'beginner', tags: ['edge servers', 'latency', 'cache', 'static assets'] },
      { id: 'api-design', title: 'API Design', path: '/system-design/api-design', description: 'REST vs RPC trade-offs with side-by-side request comparison', difficulty: 'intermediate', tags: ['REST', 'RPC', 'GraphQL', 'versioning'] },
    ],
  },

  // ── Networking ────────────────────────────────────────────────────────────
  {
    id: 'networking',
    title: 'Networking',
    path: '/networking',
    icon: '🌐',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Protocol-level simulations: OSI model, TCP, UDP, WebSocket, HTTP',
    subcategories: [
      { id: 'osi-model', title: 'OSI Model', path: '/networking/osi-model', description: '7 layers from HTTP to bits — postal analogy, protocol explorer, L4/L7 LB', difficulty: 'intermediate', tags: ['TCP/IP', 'layers', 'protocols', 'load balancing'] },
      { id: 'tcp', title: 'TCP Handshake', path: '/networking/tcp', description: '3-way handshake, connection teardown', difficulty: 'intermediate', tags: ['reliable', 'connection-oriented'] },
      { id: 'udp-vs-tcp', title: 'UDP vs TCP', path: '/networking/udp', description: 'Side-by-side packet flow comparison', difficulty: 'beginner', tags: ['UDP', 'TCP', 'comparison'] },
      { id: 'websocket', title: 'WebSocket', path: '/networking/websocket', description: 'Upgrade handshake, bidirectional frames', difficulty: 'intermediate', tags: ['real-time', 'full-duplex'] },
    ],
  },
]

export const getSection = (id: string): ModuleSection | undefined =>
  registry.find(s => s.id === id)
