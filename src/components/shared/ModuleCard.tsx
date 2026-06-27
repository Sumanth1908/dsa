import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ModuleSection } from '@/registry'

interface ModuleCardProps {
  section: ModuleSection
}

const DIFF_COLOR = {
  beginner: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  intermediate: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  advanced: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
}

export default function ModuleCard({ section }: ModuleCardProps) {
  return (
    <div className={`rounded-2xl border ${section.borderColor} ${section.bgColor} p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-3xl">{section.icon}</span>
          <h2 className={`mt-2 text-lg font-bold ${section.color}`}>{section.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{section.description}</p>
        </div>
        <Link
          to={section.path}
          className={`flex-shrink-0 p-2 rounded-xl ${section.bgColor} ${section.color} hover:scale-110 transition-transform`}
        >
          <ArrowRight size={20} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {section.subcategories.map(sub => (
          <Link
            key={sub.id}
            to={sub.path}
            className="group flex items-center gap-1"
          >
            <span className={`px-2 py-0.5 rounded-full text-xs border ${section.borderColor} text-slate-600 dark:text-slate-400 group-hover:${section.color} transition-colors bg-white dark:bg-slate-900`}>
              {sub.title}
              {sub.difficulty && (
                <span className={`ml-1.5 px-1 py-px rounded text-xs ${DIFF_COLOR[sub.difficulty]}`}>
                  {sub.difficulty[0].toUpperCase()}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
