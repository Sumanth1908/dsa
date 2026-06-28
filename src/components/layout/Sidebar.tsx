import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react'
import { registry } from '@/registry'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const [expanded, setExpanded] = useState<string[]>(() =>
    registry.map(s => s.id)
  )

  const toggleSection = (id: string) => {
    setExpanded(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <aside
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#7c3aed"/>
          <polyline points="11,9 6,16 11,23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="21,9 26,16 21,23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="19.5" y1="8.5" x2="12.5" y2="23.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        {!collapsed && (
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm leading-none">DevRef</div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-none">DSA · Systems · Code</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1">
        {/* Home link */}
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

        {registry.map(section => {
          const isExpanded = expanded.includes(section.id)
          const isSectionActive = location.pathname.startsWith(section.path)

          return (
            <div key={section.id}>
              <button
                onClick={() => !collapsed && toggleSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors ${
                  isSectionActive
                    ? 'text-slate-900 dark:text-white font-medium bg-slate-50 dark:bg-slate-800/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                style={{ width: collapsed ? 'calc(100% - 16px)' : 'calc(100% - 16px)' }}
              >
                <span className="text-base flex-shrink-0">{section.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{section.title}</span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </>
                )}
              </button>

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
      </nav>
    </aside>
  )
}
