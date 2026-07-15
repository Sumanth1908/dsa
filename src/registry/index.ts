export interface SubCategory {
  id: string
  title: string
  path: string
  description: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  complexity?: string
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
  /** Narrative intro rendered on the section index page — the "why should I care" */
  story: string
  group: GroupId
  subcategories: SubCategory[]
}

export type GroupId = 'foundations' | 'languages' | 'design' | 'systems'

export interface Group {
  id: GroupId
  title: string
  tagline: string
}

/** The learning path: groups render in this order in the sidebar and home page */
export const groups: Group[] = [
  { id: 'foundations', title: 'Foundations', tagline: 'How data is arranged, sorted, searched — and the reusable tricks behind every interview problem' },
  { id: 'languages', title: 'Language Internals', tagline: 'What your runtime is actually doing — event loops, generators, streams' },
  { id: 'design', title: 'Software Design', tagline: 'Writing code other humans can extend — patterns, concurrency, memory, auth' },
  { id: 'systems', title: 'Systems & Scale', tagline: 'From one server to planet-scale — distributed systems, networks, orchestration, AI pipelines' },
]

export const registry: ModuleSection[] = [
  // ══ FOUNDATIONS ═══════════════════════════════════════════════════════════

  {
    id: 'data-structures',
    title: 'Data Structures',
    path: '/data-structures',
    icon: '🗄️',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    description: 'Nine ways to arrange data — and why picking the right one turns an impossible problem into an easy one',
    story: 'Every program is data plus decisions about how to arrange it. An array finds any element instantly but hates insertions; a linked list is the opposite. A heap always knows the minimum; a trie autocompletes your search box; a graph models everything from friendships to flight routes. Learn the shape of each structure and its trade-offs, and half of algorithm design becomes pattern-matching.',
    group: 'foundations',
    subcategories: [
      { id: 'array', title: 'Array', path: '/data-structures/array', description: 'Numbered slots in memory — O(1) access by index, O(n) to shift when inserting in the middle', difficulty: 'beginner', tags: ['linear', 'O(1) access'], complexity: 'O(1) access' },
      { id: 'linked-list', title: 'Linked List', path: '/data-structures/linked-list', description: 'Nodes chained by pointers — O(1) head insert with no shifting, O(n) to find by index', difficulty: 'beginner', tags: ['pointers', 'dynamic'], complexity: 'O(n) search' },
      { id: 'stack', title: 'Stack', path: '/data-structures/stack', description: 'A pile of plates — only touch the top; powers the call stack, undo history, and DFS', difficulty: 'beginner', tags: ['LIFO', 'recursion'], complexity: 'O(1) push/pop' },
      { id: 'queue', title: 'Queue', path: '/data-structures/queue', description: 'A line at checkout — first in, first served; the engine behind BFS and task scheduling', difficulty: 'beginner', tags: ['FIFO', 'BFS'], complexity: 'O(1) enq/deq' },
      { id: 'tree', title: 'Tree', path: '/data-structures/tree', description: 'Hierarchical structure — root, parent, child, leaf; foundation for BST, Heap, and Trie', difficulty: 'beginner', tags: ['hierarchy', 'traversal', 'recursive'], complexity: 'O(n) traversal' },
      { id: 'bst', title: 'Binary Search Tree', path: '/data-structures/bst', description: 'Left subtree < node < right subtree — binary search on a dynamic sorted container', difficulty: 'intermediate', tags: ['BST', 'traversal'], complexity: 'O(log n) avg' },
      { id: 'trie', title: 'Trie', path: '/data-structures/trie', description: 'Each edge is a character — O(m) prefix search, autocomplete, spell check', difficulty: 'intermediate', tags: ['prefix', 'strings', 'autocomplete'], complexity: 'O(m) search' },
      { id: 'graph', title: 'Graph', path: '/data-structures/graph', description: 'The most general structure — networks, maps, dependencies; every tree is a special-case graph', difficulty: 'intermediate', tags: ['BFS', 'DFS'], complexity: 'O(V+E)' },
      { id: 'heap', title: 'Heap', path: '/data-structures/heap', description: 'Keeps the smallest (or largest) element at the root always — the natural priority queue', difficulty: 'intermediate', tags: ['priority queue', 'O(log n)'], complexity: 'O(log n)' },
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
    description: 'Watch sorting and searching happen one comparison at a time — see why O(n log n) beats O(n²)',
    story: 'Sorting a million records with bubble sort takes ~30 minutes; merge sort does it in under a second. That gap — not hardware, not clever syntax — is what algorithm analysis measures. These visualizers slow the classics down to one comparison per step so you can see exactly where the speedup comes from: divide-and-conquer, smart partitioning, and cutting the search space in half.',
    group: 'foundations',
    subcategories: [
      { id: 'bubble-sort', title: 'Bubble Sort', path: '/algorithms/bubble-sort', description: 'Compare neighbours, swap, repeat — the slow baseline every other sort is measured against', difficulty: 'beginner', tags: ['O(n²)', 'stable'] },
      { id: 'merge-sort', title: 'Merge Sort', path: '/algorithms/merge-sort', description: 'Split in half, sort each side, zip them together — divide & conquer done right', difficulty: 'intermediate', tags: ['O(n log n)', 'divide & conquer'] },
      { id: 'quick-sort', title: 'Quick Sort', path: '/algorithms/quick-sort', description: 'Pick a pivot, throw smaller left and bigger right — the fastest sort in practice', difficulty: 'intermediate', tags: ['O(n log n)', 'in-place'] },
      { id: 'heap-sort', title: 'Heap Sort', path: '/algorithms/heap-sort', description: 'Turn the array into a max-heap, then peel the biggest off the top n times', difficulty: 'intermediate', tags: ['O(n log n)', 'in-place'] },
      { id: 'binary-search', title: 'Binary Search', path: '/algorithms/binary-search', description: 'Guess the middle, discard half, repeat — find anything in a sorted list in ~20 steps, even a billion items', difficulty: 'beginner', tags: ['O(log n)', 'sorted'] },
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
    description: 'Twelve reusable moves that solve hundreds of interview problems — learn the pattern, not the problem',
    story: 'Interviewers don\'t have 500 unique problems — they have about a dozen patterns wearing 500 costumes. "Longest substring without repeats" is a sliding window; "detect a cycle" is fast & slow pointers; "next warmer day" is a monotonic stack. Each module here animates one pattern on real problems so you learn to recognize the costume, name the pattern, and write the loop from muscle memory.',
    group: 'foundations',
    subcategories: [
      { id: 'two-pointer', title: 'Two Pointer', path: '/patterns/two-pointer', description: 'Two indices walking toward each other — pair sums and palindromes without nested loops', difficulty: 'beginner', tags: ['arrays', 'sorted'] },
      { id: 'sliding-window', title: 'Sliding Window', path: '/patterns/sliding-window', description: 'Grow the window right, shrink it left — every "longest/shortest substring" problem', difficulty: 'intermediate', tags: ['subarray', 'substring'] },
      { id: 'fast-slow', title: 'Fast & Slow Pointer', path: '/patterns/fast-slow', description: 'The tortoise and the hare — if there\'s a cycle, the fast pointer laps the slow one', difficulty: 'intermediate', tags: ['cycle', 'linked list'] },
      { id: 'bfs-pattern', title: 'BFS Pattern', path: '/patterns/bfs', description: 'Explore level by level with a queue — shortest paths in unweighted worlds', difficulty: 'intermediate', tags: ['queue', 'shortest path'] },
      { id: 'dfs-pattern', title: 'DFS Pattern', path: '/patterns/dfs', description: 'Dive deep, backtrack, dive again — exhaustive exploration with a stack or recursion', difficulty: 'intermediate', tags: ['stack', 'recursion'] },
      { id: 'binary-search-pattern', title: 'Binary Search Pattern', path: '/patterns/binary-search', description: 'Not just sorted arrays — binary search any monotonic condition ("first version that fails")', difficulty: 'intermediate', tags: ['O(log n)', 'sorted'] },
      { id: 'backtracking', title: 'Backtracking', path: '/patterns/backtracking', description: 'Try a choice, recurse, undo it — permutations, N-Queens, and Sudoku all share one template', difficulty: 'advanced', tags: ['recursion', 'permutations', 'N-Queens'] },
      { id: 'memoization', title: 'Memoization', path: '/patterns/memoization', description: 'Cache what recursion already computed — fib goes from 2ⁿ calls to n', difficulty: 'intermediate', tags: ['DP', 'recursion', 'cache'] },
      { id: 'dynamic-programming', title: 'Dynamic Programming', path: '/patterns/dynamic-programming', description: 'Build the answer bottom-up from smaller answers — the pattern behind the hardest questions', difficulty: 'advanced', tags: ['DP', 'tabulation', 'optimal substructure'] },
      { id: 'merge-intervals', title: 'Merge Intervals', path: '/patterns/merge-intervals', description: 'Sort by start, merge overlaps — calendars, bookings, and range problems', difficulty: 'intermediate', tags: ['intervals', 'sorting', 'O(n log n)'] },
      { id: 'top-k-elements', title: 'Top K Elements', path: '/patterns/top-k', description: 'A size-k heap beats sorting everything — trending topics and leaderboards in O(n log k)', difficulty: 'intermediate', tags: ['heap', 'priority queue', 'O(n log k)'] },
      { id: 'monotonic-stack', title: 'Monotonic Stack', path: '/patterns/monotonic-stack', description: 'Keep the stack sorted; when the order breaks, you\'ve found an answer — "next greater" in O(n)', difficulty: 'intermediate', tags: ['stack', 'next greater element', 'O(n)'] },
    ],
  },

  // ══ LANGUAGE INTERNALS ════════════════════════════════════════════════════

  {
    id: 'javascript',
    title: 'JavaScript',
    path: '/javascript',
    icon: '🟨',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'One thread, zero blocking — how the event loop pulls off that trick',
    story: 'JavaScript runs your entire UI on a single thread, yet a slow network call never freezes the page. The secret is the event loop: a relentless little scheduler juggling the call stack, task queue, and microtask queue. Once you can predict what order console.log fires in a promise-vs-setTimeout puzzle, async bugs stop being mysterious.',
    group: 'languages',
    subcategories: [
      { id: 'event-loop', title: 'Event Loop & Async', path: '/javascript/event-loop', description: 'Call stack, task queue, microtasks, async/await — how JS stays non-blocking', difficulty: 'intermediate', tags: ['event loop', 'promises', 'async/await', 'microtasks'] },
    ],
  },

  {
    id: 'python',
    title: 'Python',
    path: '/python',
    icon: '🐍',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'The three features that make Python feel like magic — generators, decorators, and context managers',
    story: 'Python\'s most elegant features share one idea: hand control of execution to the language. A generator pauses mid-function and resumes later; a decorator wraps behaviour around a function without touching it; a context manager guarantees cleanup no matter how the block exits. Master these three and "Pythonic" stops being a vibe and becomes a technique.',
    group: 'languages',
    subcategories: [
      { id: 'generators', title: 'Generators & Iterators', path: '/python/generators', description: 'yield pauses a function and streams values lazily — O(1) memory for any size', difficulty: 'intermediate', tags: ['yield', 'lazy evaluation', 'iterators', 'streams'] },
      { id: 'decorators', title: 'Decorators', path: '/python/decorators', description: '@decorator wraps functions to add behaviour without modifying the original', difficulty: 'intermediate', tags: ['higher-order functions', 'AOP', 'first-class', 'functools'] },
      { id: 'context-managers', title: 'Context Managers', path: '/python/context-managers', description: 'with guarantees __enter__ and __exit__ — automatic resource cleanup', difficulty: 'intermediate', tags: ['with', '__enter__', '__exit__', 'RAII', 'resource management'] },
    ],
  },

  {
    id: 'java',
    title: 'Java',
    path: '/java',
    icon: '☕',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Streams, reactive pipelines, and what the JVM does behind your back',
    story: 'Java\'s Stream API and reactive extensions embody two different philosophies: process a known batch lazily, or subscribe to an unbounded flow with backpressure. Knowing when a stream pipeline actually executes — and when a Flux will overwhelm a slow consumer — separates code that works in the demo from code that works in production.',
    group: 'languages',
    subcategories: [
      { id: 'java-streams', title: 'Streams & Reactive', path: '/java/streams', description: 'Lazy stream pipelines, infinite streams, and reactive backpressure for continuous data', difficulty: 'intermediate', tags: ['Stream API', 'filter/map/collect', 'reactive', 'backpressure', 'Flux'] },
    ],
  },

  // ══ SOFTWARE DESIGN ═══════════════════════════════════════════════════════

  {
    id: 'design-patterns',
    title: 'Design Patterns',
    path: '/design-patterns',
    icon: '🏛️',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800',
    description: 'The Gang of Four patterns in Java — nine animated solutions to problems you already have',
    story: 'In 1994, four engineers catalogued the solutions that kept reappearing in good object-oriented code — and gave them names. That vocabulary is the point: say "make it a Strategy" and a whole refactoring is communicated in three words. These modules animate the nine patterns you\'ll actually meet — in interviews, in frameworks, and hiding inside the JDK itself — with Java implementations ready to lift.',
    group: 'design',
    subcategories: [
      { id: 'creational', title: 'Creational Patterns', path: '/design-patterns/creational', description: 'Singleton, Factory Method, Builder — control how objects come into existence', difficulty: 'intermediate', tags: ['Singleton', 'Factory', 'Builder', 'GoF'] },
      { id: 'structural', title: 'Structural Patterns', path: '/design-patterns/structural', description: 'Adapter, Decorator, Facade — compose objects into larger structures', difficulty: 'intermediate', tags: ['Adapter', 'Decorator', 'Facade', 'composition'] },
      { id: 'behavioral', title: 'Behavioral Patterns', path: '/design-patterns/behavioral', description: 'Strategy, Observer, Command — how objects communicate and share responsibility', difficulty: 'intermediate', tags: ['Strategy', 'Observer', 'Command', 'decoupling'] },
    ],
  },

  {
    id: 'coding-essentials',
    title: 'Coding Essentials',
    path: '/essentials',
    icon: '💡',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
    description: 'The concepts every senior engineer assumes you know — threads, memory, and how auth really works',
    story: 'Some knowledge doesn\'t belong to any language: why two threads corrupting a counter is a race condition, why your laptop\'s 8 cores don\'t make single-threaded code faster, where the stack ends and the heap begins, and what\'s actually inside that JWT your API keeps passing around. This is the layer beneath the frameworks — the stuff debugging eventually forces you to learn.',
    group: 'design',
    subcategories: [
      { id: 'concurrency', title: 'Concurrency', path: '/essentials/concurrency', description: 'Coffee-shop model: sync vs async vs multi-threaded — race conditions and mutexes', difficulty: 'advanced', tags: ['threads', 'event loop', 'coroutines', 'race condition', 'mutex'] },
      { id: 'locking-patterns', title: 'Locking Patterns', path: '/essentials/locking-patterns', description: 'Mutex, semaphore, read-write lock, reentrant lock, spinlock, optimistic vs pessimistic, deadlock, distributed lock', difficulty: 'advanced', tags: ['mutex', 'semaphore', 'deadlock', 'optimistic locking', 'distributed lock'] },
      { id: 'cpu-threads', title: 'CPU & Threads', path: '/essentials/cpu-threads', description: 'Cores, threads, I/O-bound vs CPU-bound — restaurant kitchen analogy', difficulty: 'intermediate', tags: ['hardware', 'parallelism', 'I/O-bound', 'CPU-bound'] },
      { id: 'memory', title: 'Memory Model', path: '/essentials/memory', description: 'Stack vs Heap, garbage collection, and memory leaks', difficulty: 'advanced', tags: ['JVM', 'V8', 'CPython', 'GC', 'heap', 'stack'] },
      { id: 'jwt', title: 'JWT Authentication', path: '/essentials/jwt', description: 'Token structure, signing, and claims — decoded live', difficulty: 'intermediate', tags: ['auth', 'security', 'tokens', 'HMAC', 'stateless'] },
    ],
  },

  // ══ SYSTEMS & SCALE ═══════════════════════════════════════════════════════

  {
    id: 'system-design',
    title: 'System Design',
    path: '/system-design',
    icon: '🏗️',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    description: 'How real systems survive real traffic — load balancers, caches, queues, and the art of the trade-off',
    story: 'At scale there are no right answers, only trade-offs: consistency vs availability, latency vs throughput, simple vs bulletproof. This section walks the standard interview framework, then dives into the building blocks — load balancing, caching, queues, rate limiting — and full case studies like video pipelines and booking systems where a race condition can sell the same seat twice.',
    group: 'systems',
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

  {
    id: 'networking',
    title: 'Networking',
    path: '/networking',
    icon: '🌐',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'What actually happens after you hit Enter — packets, handshakes, and the seven layers underneath',
    story: 'Between your browser and the server sits a stack of protocols, each solving one problem and trusting the layer below. Watch TCP\'s three-way handshake establish trust, see why gaming picks UDP and accepts lost packets, and follow a WebSocket upgrade turn a one-shot HTTP request into a permanent two-way channel. Networking stops being scary once you can see the packets move.',
    group: 'systems',
    subcategories: [
      { id: 'osi-model', title: 'OSI Model', path: '/networking/osi-model', description: '7 layers from HTTP to bits — postal analogy, protocol explorer, L4/L7 LB', difficulty: 'intermediate', tags: ['TCP/IP', 'layers', 'protocols', 'load balancing'] },
      { id: 'tcp', title: 'TCP Handshake', path: '/networking/tcp', description: '3-way handshake, connection teardown', difficulty: 'intermediate', tags: ['reliable', 'connection-oriented'] },
      { id: 'udp-vs-tcp', title: 'UDP vs TCP', path: '/networking/udp', description: 'Side-by-side packet flow comparison', difficulty: 'beginner', tags: ['UDP', 'TCP', 'comparison'] },
      { id: 'websocket', title: 'WebSocket', path: '/networking/websocket', description: 'Upgrade handshake, bidirectional frames', difficulty: 'intermediate', tags: ['real-time', 'full-duplex'] },
    ],
  },

  {
    id: 'containers',
    title: 'Containers & K8s',
    path: '/containers',
    icon: '📦',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'How Kubernetes turns "it works on my machine" into "it works on a thousand machines"',
    story: 'Containers made software portable; Kubernetes made it self-healing. Declare "I want three replicas" and a control loop makes reality match — restarting crashed pods, rescheduling around dead nodes, rolling out updates with zero downtime. Understand the control plane and the pod lifecycle, and the YAML stops feeling like incantations.',
    group: 'systems',
    subcategories: [
      { id: 'kubernetes', title: 'Kubernetes Architecture', path: '/containers/kubernetes', description: 'Cluster, control plane, nodes, pods and the deployment lifecycle', difficulty: 'advanced', tags: ['K8s', 'pods', 'deployments', 'orchestration'] },
    ],
  },

  {
    id: 'ai-ml',
    title: 'AI & Machine Learning',
    path: '/ai-ml',
    icon: '🤖',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Peek inside the black box — how text becomes vectors, vectors become answers, and networks learn',
    story: 'Modern AI rests on a strange idea: meaning can be turned into geometry. Words become vectors, similar meanings end up near each other, and "search" becomes measuring angles. Follow a RAG pipeline from raw document to grounded answer, watch cosine similarity find the right passage, and trace a forward pass through a neural network one neuron at a time.',
    group: 'systems',
    subcategories: [
      { id: 'rag', title: 'RAG Pipeline', path: '/ai-ml/rag', description: 'Retrieval-Augmented Generation: ingest → embed → search → generate', difficulty: 'intermediate', tags: ['LLM', 'embeddings', 'semantic search'] },
      { id: 'vector-embeddings', title: 'Vector Embeddings', path: '/ai-ml/vector-embeddings', description: 'How text becomes vectors and cosine similarity finds meaning', difficulty: 'intermediate', tags: ['cosine similarity', 'transformers', 'semantic'] },
      { id: 'neural-networks', title: 'Neural Networks', path: '/ai-ml/neural-networks', description: 'Forward pass through a multi-layer network — spam classifier demo', difficulty: 'advanced', tags: ['deep learning', 'activation', 'layers', 'weights'] },
    ],
  },
]

export const getSection = (id: string): ModuleSection | undefined =>
  registry.find(s => s.id === id)

export const getSectionByPath = (path: string): ModuleSection | undefined =>
  registry.find(s => s.path === path)

/** All modules flattened in learning-path order, each with its parent section */
export interface FlatModule {
  sub: SubCategory
  section: ModuleSection
}

export const flatModules: FlatModule[] = registry.flatMap(section =>
  section.subcategories.map(sub => ({ sub, section }))
)
