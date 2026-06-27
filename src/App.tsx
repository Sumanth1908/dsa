import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from '@/components/layout/Layout'

const HomePage = lazy(() => import('@/modules/home/HomePage'))

// Data Structures
const DSIndex = lazy(() => import('@/modules/data-structures'))
const ArrayViz = lazy(() => import('@/modules/data-structures/array'))
const StackViz = lazy(() => import('@/modules/data-structures/stack'))
const QueueViz = lazy(() => import('@/modules/data-structures/queue'))
const LinkedListViz = lazy(() => import('@/modules/data-structures/linked-list'))
const TreeViz = lazy(() => import('@/modules/data-structures/tree'))
const GraphViz = lazy(() => import('@/modules/data-structures/graph'))
const HeapViz = lazy(() => import('@/modules/data-structures/heap'))

// Algorithms
const AlgoIndex = lazy(() => import('@/modules/algorithms'))
const SortingViz = lazy(() => import('@/modules/algorithms/sorting'))
const BinarySearchViz = lazy(() => import('@/modules/algorithms/searching'))

// Patterns
const PatternsIndex = lazy(() => import('@/modules/patterns'))
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

// Programming Concepts
const ConceptsIndex = lazy(() => import('@/modules/programming-concepts'))
const EventLoopViz = lazy(() => import('@/modules/programming-concepts/async'))

// System Design
const SystemDesignIndex = lazy(() => import('@/modules/system-design'))
const LoadBalancingViz = lazy(() => import('@/modules/system-design/load-balancing'))
const CachingViz = lazy(() => import('@/modules/system-design/caching'))
const MessageQueuesViz = lazy(() => import('@/modules/system-design/message-queues'))
const CAPViz = lazy(() => import('@/modules/system-design/cap-theorem'))

// Networking
const NetworkingIndex = lazy(() => import('@/modules/networking'))
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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><HomePage /></Suspense> },

      // Data Structures
      { path: 'data-structures', element: <Suspense fallback={<Loading />}><DSIndex /></Suspense> },
      { path: 'data-structures/array', element: <Suspense fallback={<Loading />}><ArrayViz /></Suspense> },
      { path: 'data-structures/stack', element: <Suspense fallback={<Loading />}><StackViz /></Suspense> },
      { path: 'data-structures/queue', element: <Suspense fallback={<Loading />}><QueueViz /></Suspense> },
      { path: 'data-structures/linked-list', element: <Suspense fallback={<Loading />}><LinkedListViz /></Suspense> },
      { path: 'data-structures/tree', element: <Suspense fallback={<Loading />}><TreeViz /></Suspense> },
      { path: 'data-structures/graph', element: <Suspense fallback={<Loading />}><GraphViz /></Suspense> },
      { path: 'data-structures/heap', element: <Suspense fallback={<Loading />}><HeapViz /></Suspense> },

      // Algorithms
      { path: 'algorithms', element: <Suspense fallback={<Loading />}><AlgoIndex /></Suspense> },
      { path: 'algorithms/bubble-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="bubble" /></Suspense> },
      { path: 'algorithms/merge-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="merge" /></Suspense> },
      { path: 'algorithms/quick-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="quick" /></Suspense> },
      { path: 'algorithms/heap-sort', element: <Suspense fallback={<Loading />}><SortingViz algo="heap" /></Suspense> },
      { path: 'algorithms/binary-search', element: <Suspense fallback={<Loading />}><BinarySearchViz /></Suspense> },

      // Patterns
      { path: 'patterns', element: <Suspense fallback={<Loading />}><PatternsIndex /></Suspense> },
      { path: 'patterns/two-pointer', element: <Suspense fallback={<Loading />}><TwoPointerViz /></Suspense> },
      { path: 'patterns/sliding-window', element: <Suspense fallback={<Loading />}><SlidingWindowViz /></Suspense> },
      { path: 'patterns/fast-slow', element: <Suspense fallback={<Loading />}><FastSlowViz /></Suspense> },
      { path: 'patterns/bfs', element: <Suspense fallback={<Loading />}><BFSPatternViz /></Suspense> },
      { path: 'patterns/dfs', element: <Suspense fallback={<Loading />}><DFSPatternViz /></Suspense> },
      { path: 'patterns/binary-search', element: <Suspense fallback={<Loading />}><BinarySearchPatternViz /></Suspense> },
      { path: 'patterns/backtracking', element: <Suspense fallback={<Loading />}><BacktrackingViz /></Suspense> },
      { path: 'patterns/memoization', element: <Suspense fallback={<Loading />}><MemoizationViz /></Suspense> },
      { path: 'patterns/dynamic-programming', element: <Suspense fallback={<Loading />}><DynamicProgrammingViz /></Suspense> },
      { path: 'patterns/merge-intervals', element: <Suspense fallback={<Loading />}><MergeIntervalsViz /></Suspense> },
      { path: 'patterns/top-k', element: <Suspense fallback={<Loading />}><TopKElementsViz /></Suspense> },
      { path: 'patterns/monotonic-stack', element: <Suspense fallback={<Loading />}><MonotonicStackViz /></Suspense> },

      // Programming Concepts
      { path: 'concepts', element: <Suspense fallback={<Loading />}><ConceptsIndex /></Suspense> },
      { path: 'concepts/event-loop', element: <Suspense fallback={<Loading />}><EventLoopViz /></Suspense> },
      { path: 'concepts/async-await', element: <Suspense fallback={<Loading />}><EventLoopViz /></Suspense> },
      { path: 'concepts/concurrency', element: <Suspense fallback={<Loading />}><EventLoopViz /></Suspense> },
      { path: 'concepts/memory', element: <Suspense fallback={<Loading />}><EventLoopViz /></Suspense> },

      // System Design
      { path: 'system-design', element: <Suspense fallback={<Loading />}><SystemDesignIndex /></Suspense> },
      { path: 'system-design/load-balancing', element: <Suspense fallback={<Loading />}><LoadBalancingViz /></Suspense> },
      { path: 'system-design/caching', element: <Suspense fallback={<Loading />}><CachingViz /></Suspense> },
      { path: 'system-design/message-queues', element: <Suspense fallback={<Loading />}><MessageQueuesViz /></Suspense> },
      { path: 'system-design/cap-theorem', element: <Suspense fallback={<Loading />}><CAPViz /></Suspense> },

      // Networking
      { path: 'networking', element: <Suspense fallback={<Loading />}><NetworkingIndex /></Suspense> },
      { path: 'networking/tcp', element: <Suspense fallback={<Loading />}><TCPViz /></Suspense> },
      { path: 'networking/udp', element: <Suspense fallback={<Loading />}><UDPViz /></Suspense> },
      { path: 'networking/websocket', element: <Suspense fallback={<Loading />}><WebSocketViz /></Suspense> },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
