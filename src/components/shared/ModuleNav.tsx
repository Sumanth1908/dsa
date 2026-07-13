import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-react'
import { flatModules } from '@/registry'

/**
 * Prev / next navigation across the whole learning path.
 * Rendered globally by Layout; shows itself only on module pages.
 */
export default function ModuleNav() {
  const { pathname } = useLocation()
  const idx = flatModules.findIndex(m => m.sub.path === pathname)
  if (idx === -1) return null

  const current = flatModules[idx]
  const prev = idx > 0 ? flatModules[idx - 1] : null
  const next = idx < flatModules.length - 1 ? flatModules[idx + 1] : null

  return (
    <nav className="max-w-4xl mx-auto mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-center mb-3">
        <Link to={current.section.path}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${current.section.bgColor} ${current.section.color} border ${current.section.borderColor} hover:shadow-sm transition-all`}>
          <LayoutGrid size={12} /> All {current.section.title}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prev ? (
          <Link to={prev.sub.path}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all">
            <ArrowLeft size={16} className="flex-shrink-0 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <div className="min-w-0">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Previous{prev.section.id !== current.section.id ? ` · ${prev.section.icon} ${prev.section.title}` : ''}
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{prev.sub.title}</div>
            </div>
          </Link>
        ) : <div />}
        {next ? (
          <Link to={next.sub.path}
            className="group flex items-center justify-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-all text-right">
            <div className="min-w-0">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Next{next.section.id !== current.section.id ? ` · ${next.section.icon} ${next.section.title}` : ''}
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{next.sub.title}</div>
            </div>
            <ArrowRight size={16} className="flex-shrink-0 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : <div />}
      </div>
    </nav>
  )
}
