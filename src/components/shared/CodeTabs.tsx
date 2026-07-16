import { useState } from 'react'
import CodeBlock, { CodeExample } from './CodeBlock'
import DoubtsBlock, { Doubt } from './DoubtsBlock'

interface CodeTabsProps {
  examples: CodeExample[]
  doubts?: Doubt[]
  codeLabel?: string
  doubtsLabel?: string
}

// "Code | Common Doubts" tab pair — wraps CodeBlock (with its language tabs)
// and DoubtsBlock so the doubts list can grow without lengthening the page.
export default function CodeTabs({
  examples,
  doubts = [],
  codeLabel = '{ } Code',
  doubtsLabel = '🤔 Common Doubts',
}: CodeTabsProps) {
  const [tab, setTab] = useState<'code' | 'doubts'>('code')

  if (doubts.length === 0) return <CodeBlock examples={examples} />

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active
        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
    }`

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button onClick={() => setTab('code')} className={tabClass(tab === 'code')}>
          {codeLabel}
        </button>
        <button onClick={() => setTab('doubts')} className={tabClass(tab === 'doubts')}>
          {doubtsLabel} ({doubts.length})
        </button>
      </div>
      {tab === 'code' ? (
        <CodeBlock examples={examples} />
      ) : (
        <DoubtsBlock doubts={doubts} showHeader={false} />
      )}
    </div>
  )
}
