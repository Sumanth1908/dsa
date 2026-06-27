import React from 'react'
import { Link } from 'react-router-dom'
import { getSection } from '@/registry'

export default function SystemDesignIndex() {
  const section = getSection('system-design')!
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {section.icon} {section.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
      </div>

      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300">
        🏗️ System design is about trade-offs. Every decision involves choosing between competing concerns: consistency vs availability, latency vs throughput, complexity vs reliability.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.subcategories.map(sub => (
          <Link key={sub.id} to={sub.path}
            className="group block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-md transition-all">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors mb-1">
              {sub.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{sub.description}</p>
            <div className="flex gap-1 flex-wrap">
              {sub.tags?.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
