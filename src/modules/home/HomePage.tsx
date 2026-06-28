import React from 'react'
import { registry } from '@/registry'
import ModuleCard from '@/components/shared/ModuleCard'

const totalTopics = registry.reduce((sum, s) => sum + s.subcategories.length, 0)

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 text-sm font-medium border border-violet-200 dark:border-violet-800">
          <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
            <rect width="20" height="20" rx="5" fill="#7c3aed"/>
            <polyline points="6.5,5.5 3.5,10 6.5,14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="13.5,5.5 16.5,10 13.5,14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="5" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          DevRef — Your Interactive Engineering Reference
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight">
          Algorithms, Systems & Code
          <br />
          <span className="text-violet-600 dark:text-violet-400">Step by Step</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Interactive visualizers for DSA, system design, AI/ML, Python, JavaScript, Kubernetes, and networking —
          with real code examples in JS, Python & Java.
        </p>
      </div>

      {/* Stats — derived dynamically from registry */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <div className="bg-violet-600 dark:bg-violet-700 rounded-xl p-4 text-center text-white">
          <div className="text-3xl font-bold">{totalTopics}</div>
          <div className="text-xs text-violet-200 mt-1">Total Topics</div>
        </div>
        {registry.map(s => (
          <div key={s.id} className={`${s.bgColor} rounded-xl border ${s.borderColor} p-4 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.subcategories.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">{s.title}</div>
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
