import React from 'react'
import { Link } from 'react-router-dom'
import { getSection } from '@/registry'

export default function PythonIndex() {
  const section = getSection('python')!
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {section.icon} {section.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
      </div>

      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-300">
        Python's design philosophy — "batteries included, readable is better than clever" — leads to powerful patterns that feel unlike other languages.
        These modules cover the idioms that separate Pythonic code from code-that-happens-to-run-in-Python.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {section.subcategories.map(sub => (
          <Link key={sub.id} to={sub.path}
            className="group block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md transition-all">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
              {sub.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{sub.description}</p>
            <div className="flex gap-1 flex-wrap">
              {sub.tags?.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
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
