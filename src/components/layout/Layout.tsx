import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ModuleNav from '@/components/shared/ModuleNav'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // <main> is the scroll container, not the window — reset it on navigation
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden md:block flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden shadow-2xl">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} mobile />
          </div>
        </>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onOpenSidebar={() => setMobileOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
          <ModuleNav />
        </main>
      </div>
    </div>
  )
}
