import React from 'react'
import { registry } from '@/registry'
import ModuleCard from '@/components/shared/ModuleCard'

const STATS = [
  { label: 'Data Structures', value: '7' },
  { label: 'Algorithms', value: '5' },
  { label: 'Problem Patterns', value: '6' },
  { label: 'System Design', value: '4' },
]

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 text-sm font-medium border border-violet-200 dark:border-violet-800">
          <span>⚡</span> Interactive Learning Reference
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
          DSA & System Design
          <br />
          <span className="text-violet-600 dark:text-violet-400">Visualized</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Step-by-step interactive simulations for data structures, algorithms, problem patterns,
          system design, and networking — with code in JS, Python & Java.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          All Sections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {registry.map(section => (
            <ModuleCard key={section.id} section={section} />
          ))}
        </div>
      </div>

      {/* Quick tips */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-lg mb-3">How to use this app</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
          <div className="flex gap-3">
            <span className="text-2xl">▶️</span>
            <div>
              <div className="font-medium text-white">Step-by-step</div>
              Use Play/Pause/Step controls on each visualizer to go at your own pace.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🔀</span>
            <div>
              <div className="font-medium text-white">Switch languages</div>
              Every code example has tabs for JavaScript, Python, and Java.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🌙</span>
            <div>
              <div className="font-medium text-white">Dark / Light</div>
              Toggle the theme from the top-right of the header.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
