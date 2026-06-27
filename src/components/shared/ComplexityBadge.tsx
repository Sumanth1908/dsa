import React from 'react'

interface ComplexityBadgeProps {
  time: string
  space: string
}

export default function ComplexityBadge({ time, space }: ComplexityBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        Time: {time}
      </span>
      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
        Space: {space}
      </span>
    </div>
  )
}
