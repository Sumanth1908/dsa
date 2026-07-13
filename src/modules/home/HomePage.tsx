import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { registry, groups } from '@/registry'
import ModuleCard from '@/components/shared/ModuleCard'

const totalTopics = registry.reduce((sum, s) => sum + s.subcategories.length, 0)

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
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
          Don't just read about it.
          <br />
          <span className="text-violet-600 dark:text-violet-400">Watch it happen.</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {totalTopics} interactive visualizers that slow computer science down to one step at a time —
          from your first array to distributed systems, with real code in JavaScript, Python & Java.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/data-structures/array"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
            Start with Arrays <ArrowRight size={16} />
          </Link>
          <Link to="/patterns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-sm font-medium transition-colors">
            Prepping interviews? Jump to Patterns
          </Link>
        </div>
      </div>

      {/* The journey — four stages, in order */}
      <div className="space-y-10">
        {groups.map((group, gi) => {
          const sections = registry.filter(s => s.group === group.id)
          const count = sections.reduce((n, s) => n + s.subcategories.length, 0)
          return (
            <div key={group.id}>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-2xl font-bold text-slate-200 dark:text-slate-700 font-mono">
                  0{gi + 1}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{group.title}</h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">{count} topics</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-10">{group.tagline}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sections.map(section => (
                  <ModuleCard key={section.id} section={section} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick tips */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-lg mb-3">How to use this app</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-300">
          <div className="flex gap-3">
            <span className="text-2xl">▶️</span>
            <div>
              <div className="font-medium text-white">Step through it</div>
              Play, pause, and scrub every animation — nothing moves faster than you can follow.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🧭</span>
            <div>
              <div className="font-medium text-white">Follow the path</div>
              Prev / Next at the bottom of every topic walks the whole curriculum in order.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-medium text-white">Search anything</div>
              The sidebar search finds topics by name or tag — try "heap" or "race condition".
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">🔀</span>
            <div>
              <div className="font-medium text-white">Switch languages</div>
              Code examples come in JavaScript, Python, and Java tabs.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
