import type { ReactNode } from 'react'

export function Section({ id, part, title, lead, children }: { id: string; part: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="space-y-4 outline-none">
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{part}</p>
        <h2 id={`${id}-title`} className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{lead}</p>
      </div>
      {children}
    </section>
  )
}

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-violet-50 p-3 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
      <strong>Takeaway:</strong> {children}
    </p>
  )
}

export function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/30 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Example · {title}</p>
      <div className="space-y-2 text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  )
}

export function Cards({ items, cols = 2 }: { items: { title: string; body: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  const grid = cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : cols === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <div className={`grid grid-cols-1 ${grid} gap-3`}>
      {items.map(item => (
        <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
          <div className="mt-1 text-slate-600 dark:text-slate-400">{item.body}</div>
        </div>
      ))}
    </div>
  )
}

export function Pre({ children }: { children: string }) {
  return <pre className="overflow-x-auto whitespace-pre rounded-lg bg-slate-900 p-3 text-xs leading-6 text-slate-100">{children}</pre>
}

export function Table({ caption, head, rows }: { caption?: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[560px] text-left text-sm">
        {caption && <caption className="p-3 text-left font-semibold text-slate-900 dark:text-white">{caption}</caption>}
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>{head.map(h => <th key={h} scope="col" className="p-3 font-semibold text-slate-700 dark:text-slate-200">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => c === 0
                ? <th key={c} scope="row" className="p-3 align-top font-medium text-slate-900 dark:text-white">{cell}</th>
                : <td key={c} className="p-3 align-top">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pills<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${value === o.id
            ? 'bg-violet-600 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
