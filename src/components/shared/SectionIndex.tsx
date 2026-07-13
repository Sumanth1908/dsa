import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { getSectionByPath, groups } from '@/registry'

const DIFF_STYLE = {
  beginner: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  intermediate: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  advanced: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
}

/**
 * Generic section landing page — one component for every section,
 * fully driven by the registry. Derives the section from the current URL.
 */
export default function SectionIndex() {
  const { pathname } = useLocation()
  const section = getSectionByPath(pathname)

  if (!section) return null
  const group = groups.find(g => g.id === section.group)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        {group && (
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            {group.title}
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {section.icon} {section.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
      </div>

      {/* Story panel — the "why should I care", in the section's colors */}
      <div className={`${section.bgColor} border ${section.borderColor} rounded-xl p-4 text-sm leading-relaxed ${section.color}`}>
        {section.story}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.subcategories.map((sub, i) => (
          <Link key={sub.id} to={sub.path}
            className="group block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className={`font-semibold ${section.color}`}>
                <span className="text-slate-300 dark:text-slate-600 font-mono text-xs mr-2">{String(i + 1).padStart(2, '0')}</span>
                {sub.title}
              </h3>
              {sub.difficulty && (
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${DIFF_STYLE[sub.difficulty]}`}>
                  {sub.difficulty}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{sub.description}</p>
            <div className="flex gap-1 flex-wrap items-center">
              {sub.complexity && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                  <Clock size={10} /> {sub.complexity}
                </span>
              )}
              {sub.tags?.map(t => (
                <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${section.bgColor} ${section.color} border ${section.borderColor}`}>
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
