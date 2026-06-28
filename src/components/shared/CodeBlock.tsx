import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeExample {
  lang: 'javascript' | 'python' | 'java'
  label: string
  code: string
}

interface CodeBlockProps {
  examples: CodeExample[]
}

const LANG_COLORS: Record<string, string> = {
  javascript: 'text-yellow-500',
  python: 'text-blue-400',
  java: 'text-orange-400',
}

function highlight(code: string, lang: string): React.ReactNode[] {
  const lines = code.split('\n')
  return lines.map((line, i) => (
    <div key={i} className="table-row">
      <span className="table-cell pr-4 text-slate-600 dark:text-slate-600 select-none text-right w-8 text-xs">
        {i + 1}
      </span>
      <span className="table-cell whitespace-pre">
        <SyntaxLine line={line} lang={lang} />
      </span>
    </div>
  ))
}

const KEYWORDS_JS = /\b(const|let|var|function|return|if|else|for|while|class|new|this|null|undefined|true|false|import|export|default|typeof|instanceof|of|in|async|await|=>)\b/g
const KEYWORDS_PY = /\b(def|return|if|else|elif|for|while|class|import|from|in|not|and|or|True|False|None|self|yield|with|as|try|except|finally|lambda|pass|break|continue|raise)\b/g
const KEYWORDS_JAVA = /\b(public|private|protected|class|interface|extends|implements|return|if|else|for|while|new|this|null|true|false|void|int|long|double|boolean|String|static|final|import|package|try|catch|throw|throws|super)\b/g

function SyntaxLine({ line, lang }: { line: string; lang: string }) {
  const pattern = lang === 'python' ? KEYWORDS_PY : lang === 'java' ? KEYWORDS_JAVA : KEYWORDS_JS

  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null

  const re = new RegExp(pattern.source, 'g')

  const commentStart = lang === 'python' ? '#' : '//'
  const commentIdx = line.indexOf(commentStart)
  const codepart = commentIdx >= 0 ? line.slice(0, commentIdx) : line
  const commentpart = commentIdx >= 0 ? line.slice(commentIdx) : ''

  while ((m = re.exec(codepart)) !== null) {
    if (m.index > last) {
      parts.push(<span key={last}>{colorLiterals(codepart.slice(last, m.index))}</span>)
    }
    parts.push(<span key={m.index} className="text-sky-400 dark:text-sky-400">{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < codepart.length) {
    parts.push(<span key={last}>{colorLiterals(codepart.slice(last))}</span>)
  }
  if (commentpart) {
    parts.push(<span key="cmt" className="text-slate-500 italic">{commentpart}</span>)
  }

  return <>{parts}</>
}

function colorLiterals(text: string): React.ReactNode {
  const strMatch = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g
  const numMatch = /\b(\d+\.?\d*)\b/g
  const parts: React.ReactNode[] = []
  let last = 0

  const combined = new RegExp(`${strMatch.source}|${numMatch.source}`, 'g')
  let m: RegExpExecArray | null

  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index))
    }
    if (m[1]) {
      parts.push(<span key={m.index} className="text-emerald-400 dark:text-emerald-400">{m[1]}</span>)
    } else if (m[2]) {
      parts.push(<span key={m.index} className="text-amber-400 dark:text-amber-400">{m[2]}</span>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

export default function CodeBlock({ examples }: CodeBlockProps) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const current = examples[active]

  const copy = async () => {
    await navigator.clipboard.writeText(current.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900">
        <div className="flex">
          {examples.map((ex, i) => (
            <button
              key={ex.lang}
              onClick={() => setActive(i)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                i === active
                  ? `${LANG_COLORS[ex.lang]} border-current bg-slate-950`
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="ml-auto mr-3 p-1.5 rounded text-slate-500 hover:text-slate-300 transition-colors"
          title="Copy"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-auto max-h-80 p-4">
        <div className="table min-w-max text-xs font-mono leading-6 text-slate-300">
          {highlight(current.code, current.lang)}
        </div>
      </div>
    </div>
  )
}
