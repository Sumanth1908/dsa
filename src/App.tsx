import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from '@/components/layout/Layout'
import { registry } from '@/registry'

const HomePage = lazy(() => import('@/modules/home/HomePage'))

// One generic index page serves every section — driven by the registry
const SectionIndexPage = lazy(() => import('@/components/shared/SectionIndex'))

// ── Data Structures ───────────────────────────────────────────────────────
const ArrayViz = lazy(() => import('@/modules/data-structures/array'))
const StackViz = lazy(() => import('@/modules/data-structures/stack'))
const QueueViz = lazy(() => import('@/modules/data-structures/queue'))
const LinkedListViz = lazy(() => import('@/modules/data-structures/linked-list'))
const TreeViz = lazy(() => import('@/modules/data-structures/tree'))
const BSTViz = lazy(() => import('@/modules/data-structures/bst'))
const TrieViz = lazy(() => import('@/modules/data-structures/trie'))
const GraphViz = lazy(() => import('@/modules/data-structures/graph'))
const HeapViz = lazy(() => import('@/modules/data-structures/heap'))

// ── Algorithms ────────────────────────────────────────────────────────────
const SortingViz = lazy(() => import('@/modules/algorithms/sorting'))
const BinarySearchViz = lazy(() => import('@/modules/algorithms/searching'))

// ── Problem Patterns ──────────────────────────────────────────────────────
const TwoPointerViz = lazy(() => import('@/modules/patterns/two-pointer'))
const SlidingWindowViz = lazy(() => import('@/modules/patterns/sliding-window'))
const FastSlowViz = lazy(() => import('@/modules/patterns/fast-slow'))
const BFSPatternViz = lazy(() => import('@/modules/patterns/bfs'))
const DFSPatternViz = lazy(() => import('@/modules/patterns/dfs'))
const BinarySearchPatternViz = lazy(() => import('@/modules/patterns/binary-search'))
const BacktrackingViz = lazy(() => import('@/modules/patterns/backtracking'))
const MemoizationViz = lazy(() => import('@/modules/patterns/memoization'))
const DynamicProgrammingViz = lazy(() => import('@/modules/patterns/dynamic-programming'))
const MergeIntervalsViz = lazy(() => import('@/modules/patterns/merge-intervals'))
const TopKElementsViz = lazy(() => import('@/modules/patterns/top-k'))
const MonotonicStackViz = lazy(() => import('@/modules/patterns/monotonic-stack'))

// ── AI & ML ───────────────────────────────────────────────────────────────
const RAGViz = lazy(() => import('@/modules/ai-ml/rag'))
const VectorEmbeddingsViz = lazy(() => import('@/modules/ai-ml/vector-embeddings'))
const NeuralNetworksViz = lazy(() => import('@/modules/ai-ml/neural-networks'))

// ── Containers ────────────────────────────────────────────────────────────
const KubernetesViz = lazy(() => import('@/modules/containers/kubernetes'))

// ── JavaScript ────────────────────────────────────────────────────────────
const EventLoopViz = lazy(() => import('@/modules/programming-concepts/async'))

// ── Java ──────────────────────────────────────────────────────────────────
const JavaStreamsViz = lazy(() => import('@/modules/programming-concepts/java-streams'))

// ── Design Patterns ───────────────────────────────────────────────────────
const CreationalPatternsViz = lazy(() => import('@/modules/design-patterns/creational'))
const StructuralPatternsViz = lazy(() => import('@/modules/design-patterns/structural'))
const BehavioralPatternsViz = lazy(() => import('@/modules/design-patterns/behavioral'))

// ── Python ────────────────────────────────────────────────────────────────
const PyGeneratorsViz = lazy(() => import('@/modules/programming-concepts/python-generators'))
const PyDecoratorsViz = lazy(() => import('@/modules/programming-concepts/python-decorators'))
const PyContextMgrViz = lazy(() => import('@/modules/programming-concepts/python-context-managers'))

// ── Coding Essentials ─────────────────────────────────────────────────────
const ConcurrencyViz = lazy(() => import('@/modules/programming-concepts/concurrency'))
const LockingPatternsViz = lazy(() => import('@/modules/programming-concepts/locking-patterns'))
const CPUThreadsViz = lazy(() => import('@/modules/programming-concepts/cpu-threads'))
const MemoryModelViz = lazy(() => import('@/modules/programming-concepts/memory'))
const JWTViz = lazy(() => import('@/modules/programming-concepts/jwt'))

// ── System Design ─────────────────────────────────────────────────────────
const SystemDesignApproachViz = lazy(() => import('@/modules/system-design/system-design-approach'))
const EventBookingViz = lazy(() => import('@/modules/system-design/event-booking'))
const VideoProcessingViz = lazy(() => import('@/modules/system-design/video-processing'))
const GamingSystemViz = lazy(() => import('@/modules/system-design/gaming-system'))
const LoadBalancingViz = lazy(() => import('@/modules/system-design/load-balancing'))
const CachingViz = lazy(() => import('@/modules/system-design/caching'))
const MessageQueuesViz = lazy(() => import('@/modules/system-design/message-queues'))
const PubSubViz = lazy(() => import('@/modules/system-design/pub-sub'))
const CAPViz = lazy(() => import('@/modules/system-design/cap-theorem'))
const RateLimiterViz = lazy(() => import('@/modules/system-design/rate-limiter'))
const CDNViz = lazy(() => import('@/modules/system-design/cdn'))
const APIDesignViz = lazy(() => import('@/modules/system-design/api-design'))

// ── Networking ────────────────────────────────────────────────────────────
const OSIModelViz = lazy(() => import('@/modules/networking/osi-model'))
const TCPViz = lazy(() => import('@/modules/networking/tcp'))
const UDPViz = lazy(() => import('@/modules/networking/udp'))
const WebSocketViz = lazy(() => import('@/modules/networking/websocket'))

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-4">
      <div className="text-6xl">🧭</div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        This topic doesn't exist (yet). Head back home or pick a section from the sidebar.
      </p>
      <Link to="/" className="inline-block px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
        Back to Home
      </Link>
    </div>
  )
}

const S = (C: React.ComponentType) => <Suspense fallback={<Loading />}><C /></Suspense>

// Exported so tests can verify registry ↔ route consistency
// eslint-disable-next-line react-refresh/only-export-components
export const appRoutes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: S(HomePage) },

      // Section index pages — generated from the registry
      ...registry.map(section => ({
        path: section.path.slice(1),
        element: S(SectionIndexPage),
      })),

      // Data Structures
      { path: 'data-structures/array', element: S(ArrayViz) },
      { path: 'data-structures/stack', element: S(StackViz) },
      { path: 'data-structures/queue', element: S(QueueViz) },
      { path: 'data-structures/linked-list', element: S(LinkedListViz) },
      { path: 'data-structures/tree', element: S(TreeViz) },
      { path: 'data-structures/bst', element: S(BSTViz) },
      { path: 'data-structures/trie', element: S(TrieViz) },
      { path: 'data-structures/graph', element: S(GraphViz) },
      { path: 'data-structures/heap', element: S(HeapViz) },

      // Algorithms
      { path: 'algorithms/bubble-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="bubble" /></Suspense> },
      { path: 'algorithms/merge-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="merge" /></Suspense> },
      { path: 'algorithms/quick-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="quick" /></Suspense> },
      { path: 'algorithms/heap-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="heap" /></Suspense> },
      { path: 'algorithms/binary-search', element: S(BinarySearchViz) },

      // Patterns
      { path: 'patterns/two-pointer', element: S(TwoPointerViz) },
      { path: 'patterns/sliding-window', element: S(SlidingWindowViz) },
      { path: 'patterns/fast-slow', element: S(FastSlowViz) },
      { path: 'patterns/bfs', element: S(BFSPatternViz) },
      { path: 'patterns/dfs', element: S(DFSPatternViz) },
      { path: 'patterns/binary-search', element: S(BinarySearchPatternViz) },
      { path: 'patterns/backtracking', element: S(BacktrackingViz) },
      { path: 'patterns/memoization', element: S(MemoizationViz) },
      { path: 'patterns/dynamic-programming', element: S(DynamicProgrammingViz) },
      { path: 'patterns/merge-intervals', element: S(MergeIntervalsViz) },
      { path: 'patterns/top-k', element: S(TopKElementsViz) },
      { path: 'patterns/monotonic-stack', element: S(MonotonicStackViz) },

      // AI & ML
      { path: 'ai-ml/rag', element: S(RAGViz) },
      { path: 'ai-ml/vector-embeddings', element: S(VectorEmbeddingsViz) },
      { path: 'ai-ml/neural-networks', element: S(NeuralNetworksViz) },

      // Containers
      { path: 'containers/kubernetes', element: S(KubernetesViz) },

      // JavaScript
      { path: 'javascript/event-loop', element: S(EventLoopViz) },

      // Java
      { path: 'java/streams', element: S(JavaStreamsViz) },

      // Design Patterns
      { path: 'design-patterns/creational', element: S(CreationalPatternsViz) },
      { path: 'design-patterns/structural', element: S(StructuralPatternsViz) },
      { path: 'design-patterns/behavioral', element: S(BehavioralPatternsViz) },

      // Python
      { path: 'python/generators', element: S(PyGeneratorsViz) },
      { path: 'python/decorators', element: S(PyDecoratorsViz) },
      { path: 'python/context-managers', element: S(PyContextMgrViz) },

      // Coding Essentials
      { path: 'essentials/concurrency', element: S(ConcurrencyViz) },
      { path: 'essentials/locking-patterns', element: S(LockingPatternsViz) },
      { path: 'essentials/cpu-threads', element: S(CPUThreadsViz) },
      { path: 'essentials/memory', element: S(MemoryModelViz) },
      { path: 'essentials/jwt', element: S(JWTViz) },

      // System Design
      { path: 'system-design/approach', element: S(SystemDesignApproachViz) },
      { path: 'system-design/event-booking', element: S(EventBookingViz) },
      { path: 'system-design/video-processing', element: S(VideoProcessingViz) },
      { path: 'system-design/gaming-system', element: S(GamingSystemViz) },
      { path: 'system-design/load-balancing', element: S(LoadBalancingViz) },
      { path: 'system-design/caching', element: S(CachingViz) },
      { path: 'system-design/message-queues', element: S(MessageQueuesViz) },
      { path: 'system-design/pub-sub', element: S(PubSubViz) },
      { path: 'system-design/cap-theorem', element: S(CAPViz) },
      { path: 'system-design/rate-limiter', element: S(RateLimiterViz) },
      { path: 'system-design/cdn', element: S(CDNViz) },
      { path: 'system-design/api-design', element: S(APIDesignViz) },

      // Networking
      { path: 'networking/osi-model', element: S(OSIModelViz) },
      { path: 'networking/tcp', element: S(TCPViz) },
      { path: 'networking/udp', element: S(UDPViz) },
      { path: 'networking/websocket', element: S(WebSocketViz) },

      // Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
]

const router = createBrowserRouter(appRoutes, { basename: import.meta.env.BASE_URL })

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
