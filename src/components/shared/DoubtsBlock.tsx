import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface Doubt {
  q: string
  a: string
}

interface DoubtsBlockProps {
  doubts: Doubt[]
  title?: string
  showHeader?: boolean
  /** index expanded on mount; null = all collapsed */
  defaultOpen?: number | null
}

// Renders `backticks` as inline code and **text** as bold within a line.
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code
              key={i}
              className="font-mono text-xs bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300 px-1 py-0.5 rounded"
            >
              {p.slice(1, -1)}
            </code>
          )
        }
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
              {p.slice(2, -2)}
            </strong>
          )
        }
        return <React.Fragment key={i}>{p}</React.Fragment>
      })}
    </>
  )
}

// Answer text is lightweight markdown: blank-line-free paragraphs split on \n,
// consecutive lines starting with "- " become a bullet list.
export function AnswerBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = (key: number) => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={`ul-${key}`} className="space-y-1.5 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span className="text-violet-400 dark:text-violet-500 select-none">•</span>
            <span>
              <InlineText text={b} />
            </span>
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
      return
    }
    flushBullets(i)
    if (line.trim() === '') return
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        <InlineText text={line} />
      </p>
    )
  })
  flushBullets(lines.length)

  return <div className="space-y-2">{blocks}</div>
}

export default function DoubtsBlock({
  doubts,
  title = 'Common Doubts',
  showHeader = true,
  defaultOpen = 0,
}: DoubtsBlockProps) {
  const [open, setOpen] = useState<number | null>(defaultOpen)

  if (doubts.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 overflow-hidden">
      {showHeader && (
        <h3 className="font-medium text-violet-800 dark:text-violet-300 px-4 pt-4 pb-2 text-sm">
          🤔 {title}
        </h3>
      )}
      <div className="divide-y divide-violet-200/60 dark:divide-violet-800/40">
        {doubts.map((d, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-violet-900 dark:text-violet-200 hover:bg-violet-100/60 dark:hover:bg-violet-900/20 transition-colors"
            >
              <span>{d.q}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 mt-0.5 transition-transform ${open === i ? 'rotate-180' : ''}`}
              />
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm text-slate-700 dark:text-slate-300">
                <AnswerBody text={d.a} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
