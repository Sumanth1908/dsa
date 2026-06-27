import React from 'react'
import { Link } from 'react-router-dom'
import { getSection } from '@/registry'
import ComplexityBadge from '@/components/shared/ComplexityBadge'

const META: Record<string, { time: string; space: string; stable: boolean }> = {
  'bubble-sort': { time: 'O(n²)', space: 'O(1)', stable: true },
  'merge-sort': { time: 'O(n log n)', space: 'O(n)', stable: true },
  'quick-sort': { time: 'O(n log n) avg', space: 'O(log n)', stable: false },
  'heap-sort': { time: 'O(n log n)', space: 'O(1)', stable: false },
  'binary-search': { time: 'O(log n)', space: 'O(1)', stable: false },
}

export default function AlgorithmsIndex() {
  const section = getSection('algorithms')!
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
          const m = META[sub.id] || { time: '-', space: '-', stable: false }
          return (
            <Link key={sub.id} to={sub.path}
              className="group block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {sub.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.description}</p>
                </div>
                <div className="flex gap-1">
                  {m.stable !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${m.stable ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {m.stable ? 'stable' : 'unstable'}
                    </span>
                  )}
                </div>
              </div>
              <ComplexityBadge time={m.time} space={m.space} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
