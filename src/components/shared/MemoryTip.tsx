import type { ReactNode } from 'react'

interface MemoryTipProps {
  children: ReactNode
}

export default function MemoryTip({ children }: MemoryTipProps) {
  return (
    <aside className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
      <h3 className="font-semibold text-violet-800 dark:text-violet-300 mb-1">🧠 Memory trick</h3>
      <p className="text-sm text-violet-700 dark:text-violet-300">{children}</p>
    </aside>
  )
}
