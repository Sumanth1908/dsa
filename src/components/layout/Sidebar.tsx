import React, { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Search, X } from 'lucide-react'
import { registry, groups, flatModules } from '@/registry'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobile?: boolean
}

// path-boundary match: '/java' must not match '/javascript/...'
const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + '/')

const normalizeSearch = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim()

const matchesSearch = (query: string, values: Array<string | undefined>) => {
  const queryTokens = normalizeSearch(query).split(' ').filter(Boolean)
  if (queryTokens.length === 0) return false

  const searchableText = normalizeSearch(values.filter(Boolean).join(' '))
  const searchableTerms = searchableText.split(' ').filter(Boolean)

  return queryTokens.every(token =>
    searchableText.includes(token) ||
    searchableTerms.some(term =>
      token.length >= 4 &&
      term.length >= 4 &&
      Math.abs(token.length - term.length) <= 2 &&
      (token.startsWith(term) || term.startsWith(token))
    )
  )
}

export default function Sidebar({ collapsed, onToggle, mobile = false }: SidebarProps) {
  const location = useLocation()
  const [expansionOverrides, setExpansionOverrides] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

  const toggleSection = (id: string, isExpanded: boolean) => {
    setExpansionOverrides(prev => ({ ...prev, [id]: !isExpanded }))
  }

  const results = useMemo(() => {
    if (!query.trim()) return []
    return flatModules.filter(({ sub, section }) => matchesSearch(query, [
      sub.title,
      section.title,
      sub.description,
      sub.complexity,
      ...(sub.tags ?? []),
    ]))
  }, [query])

  return (
    <aside
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Logo — links back to the home page */}
      <div className={`flex items-center py-3.5 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}>
        {!collapsed && (
          <NavLink
            to="/"
            aria-label="Go to home page"
            title="Home"
            className="flex items-center gap-3 min-w-0 rounded-lg hover:opacity-80 transition-opacity"
          >
            <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#7c3aed"/>
              <polyline points="11,9 6,16 11,23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="21,9 26,16 21,23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="19.5" y1="8.5" x2="12.5" y2="23.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm leading-none">DevRef</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-none">DSA · Systems · Code</div>
            </div>
          </NavLink>
        )}
        <button
          onClick={onToggle}
          aria-label={mobile ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`${collapsed ? 'p-2' : 'ml-auto p-1'} rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
        >
          {mobile ? <X size={18} /> : collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 border border-transparent focus:border-violet-400 focus:outline-none transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1">
        {/* Search results replace the tree while a query is active */}
        {!collapsed && query.trim() ? (
          <div className="mx-2 space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {results.length} result{results.length === 1 ? '' : 's'}
            </div>
            {results.map(({ sub, section }) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={() => setQuery('')}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isActive
                      ? `font-medium ${section.color} bg-slate-100 dark:bg-slate-800`
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <span className="flex-shrink-0">{section.icon}</span>
                <span className="truncate">{sub.title}</span>
              </NavLink>
            ))}
            {results.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">No topics match "{query.trim()}"</div>
            )}
          </div>
        ) : (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <span className="text-base flex-shrink-0">🏠</span>
              {!collapsed && <span>Home</span>}
            </NavLink>

            {groups.map(group => (
              <div key={group.id}>
                {!collapsed && (
                  <div className="px-5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.title}
                  </div>
                )}
                {registry.filter(s => s.group === group.id).map(section => {
                  const isSectionActive = isUnder(location.pathname, section.path)
                  const isExpanded = expansionOverrides[section.id] ?? isSectionActive

                  return (
                    <div key={section.id}>
                      <div
                        className={`flex items-center mx-2 rounded-lg text-sm transition-colors ${
                          isSectionActive
                            ? 'text-slate-900 dark:text-white font-medium bg-slate-50 dark:bg-slate-800/50'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                        style={{ width: 'calc(100% - 16px)' }}
                      >
                        <NavLink
                          to={section.path}
                          title={collapsed ? section.title : `Open ${section.title} overview`}
                          className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}
                        >
                          <span className="text-base flex-shrink-0">{section.icon}</span>
                          {!collapsed && <span className="flex-1 text-left truncate">{section.title}</span>}
                        </NavLink>
                        {!collapsed && (
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id, isExpanded)}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${section.title}`}
                            aria-expanded={isExpanded}
                            className="mr-1 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </div>

                      {!collapsed && isExpanded && (
                        <div className="ml-8 mr-2 mt-1 space-y-0.5">
                          {section.subcategories.map(sub => (
                            <NavLink
                              key={sub.id}
                              to={sub.path}
                              className={({ isActive }) =>
                                `block px-3 py-1.5 rounded-md text-xs transition-colors truncate ${
                                  isActive
                                    ? `font-medium ${section.color} bg-slate-100 dark:bg-slate-800`
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`
                              }
                            >
                              {sub.title}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
