import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { registry } from '@/registry'

export default function Header() {
  const { theme, toggle } = useTheme()
  const location = useLocation()

  const crumbs = buildCrumbs(location.pathname)

  return (
    <header className="flex items-center gap-4 h-14 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <Link to="/" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0">
          Home
        </Link>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}

function buildCrumbs(pathname: string): { label: string; path: string }[] {
  if (pathname === '/') return []
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; path: string }[] = []
  let accumulated = ''

  for (const seg of segments) {
    accumulated += '/' + seg
    const section = registry.find(s => s.path === accumulated)
    if (section) {
      crumbs.push({ label: section.title, path: accumulated })
      continue
    }
    for (const s of registry) {
      const sub = s.subcategories.find(c => c.path === accumulated)
      if (sub) {
        crumbs.push({ label: sub.title, path: accumulated })
        break
      }
    }
  }
  return crumbs
}
