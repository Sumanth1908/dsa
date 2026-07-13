import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ModuleNav from '@/components/shared/ModuleNav'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // <main> is the scroll container, not the window — reset it on navigation
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-auto p-6">
          <Outlet />
          <ModuleNav />
        </main>
      </div>
    </div>
  )
}
