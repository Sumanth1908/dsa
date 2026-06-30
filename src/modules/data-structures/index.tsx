import React from 'react'
import { Link } from 'react-router-dom'
import { getSection } from '@/registry'
import ComplexityBadge from '@/components/shared/ComplexityBadge'

const META: Record<string, { time: string; space: string; icon: string }> = {
  array: { time: 'O(1) access', space: 'O(n)', icon: '▦' },
  'linked-list': { time: 'O(n) search', space: 'O(n)', icon: '⬡' },
  stack: { time: 'O(1) push/pop', space: 'O(n)', icon: '⬆' },
  queue: { time: 'O(1) enq/deq', space: 'O(n)', icon: '➡' },
  tree: { time: 'O(n) traversal', space: 'O(n)', icon: '🌲' },
  bst: { time: 'O(log n) avg', space: 'O(n)', icon: '🔍' },
  trie: { time: 'O(m) search', space: 'O(N·m)', icon: '🔤' },
  graph: { time: 'O(V+E)', space: 'O(V+E)', icon: '⬡' },
  heap: { time: 'O(log n)', space: 'O(n)', icon: '△' },
}

export default function DataStructuresIndex() {
  const section = getSection('data-structures')!
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {section.icon} {section.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.subcategories.map(sub => {
          const m = META[sub.id] || { time: '-', space: '-', icon: '📦' }
          return (
            <Link
              key={sub.id}
              to={sub.path}
              className="group block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-2xl">{m.icon}</span>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mt-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {sub.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  sub.difficulty === 'beginner' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                  sub.difficulty === 'intermediate' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                  'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {sub.difficulty}
                </span>
              </div>
              <ComplexityBadge time={m.time} space={m.space} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
