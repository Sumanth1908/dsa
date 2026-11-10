import React from 'react'

export interface Actor {
  id: string
  label: string
  icon: string
  /** hex color for the actor chip and its outgoing arrows */
  color: string
  sub?: string
}

/**
 * front = travels through the user's browser (redirects, form posts) — visible, tamperable
 * back  = direct server-to-server call — never touches the browser
 * local = something an actor computes/checks on its own
 */
export type Channel = 'front' | 'back' | 'local'

export interface FlowMsg {
  from: string
  to: string
  label: string
  channel: Channel
  note: string
  /** raw HTTP / JSON / XML shown in the inspector */
  payload?: string
  danger?: boolean
}

interface FlowDiagramProps {
  actors: Actor[]
  msgs: FlowMsg[]
  /** 0 = intro (nothing sent yet), k = first k messages visible */
  step: number
  intro: string
}

const CHANNEL_BADGE: Record<Channel, { text: string; cls: string }> = {
  front: { text: 'front channel · via browser', cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  back: { text: 'back channel · server ↔ server', cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  local: { text: 'local check', cls: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
}

export default function FlowDiagram({ actors, msgs, step, intro }: FlowDiagramProps) {
  const n = actors.length
  const idx = (id: string) => actors.findIndex(a => a.id === id)
  const center = (i: number) => ((i + 0.5) / n) * 100
  const visible = msgs.slice(0, step)
  const active = step > 0 ? msgs[step - 1] : null

  return (
    <div className="viz-container p-4 sm:p-6 space-y-4">
      <div className="overflow-x-auto">
        <div style={{ minWidth: n * 128 }}>
          {/* Actor header */}
          <div className="grid mb-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {actors.map(a => (
              <div key={a.id} className="text-center px-1">
                <div
                  className="inline-flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: a.color, backgroundColor: `${a.color}1a`, color: a.color }}
                >
                  <span className="text-lg leading-none mb-1">{a.icon}</span>
                  {a.label}
                </div>
                {a.sub && <div className="text-[10px] text-slate-400 mt-1">{a.sub}</div>}
              </div>
            ))}
          </div>

          {/* Lifelines + messages */}
          <div className="relative" style={{ minHeight: Math.max(msgs.length, 4) * 44 }}>
            {actors.map((a, i) => (
              <div
                key={a.id}
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-200 dark:border-slate-800"
                style={{ left: `${center(i)}%` }}
              />
            ))}

            {visible.map((m, i) => {
              const isActive = i === step - 1
              const f = idx(m.from)
              const t = idx(m.to)
              const color = m.danger ? '#ef4444' : actors[f]?.color ?? '#64748b'
              const top = i * 44

              if (m.channel === 'local' || f === t) {
                return (
                  <div key={i} className="absolute flex justify-center" style={{ top, left: `${center(f)}%`, transform: 'translateX(-50%)' }}>
                    <span
                      className={`mt-2 inline-block whitespace-nowrap text-[11px] font-medium px-2 py-1 rounded-md border bg-white dark:bg-slate-900 transition-opacity ${isActive ? 'opacity-100 shadow-sm animate-fade-in' : 'opacity-70'}`}
                      style={{ borderColor: color, color }}
                    >
                      ⚙ {m.label}
                    </span>
                  </div>
                )
              }

              const left = Math.min(center(f), center(t))
              const width = Math.abs(center(t) - center(f))
              const rightward = t > f
              return (
                <div key={i} className={`absolute transition-opacity ${isActive ? 'opacity-100 animate-fade-in' : 'opacity-60'}`} style={{ top, left: `${left}%`, width: `${width}%`, height: 44 }}>
                  <div className="absolute inset-x-0 top-1 text-center px-2">
                    <span className={`text-[11px] font-semibold whitespace-nowrap px-1 rounded bg-white/80 dark:bg-slate-900/80 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                      {m.label}
                    </span>
                  </div>
                  <div
                    className="absolute inset-x-1 top-[30px]"
                    style={{ borderTop: `2px ${m.channel === 'front' ? 'dashed' : 'solid'} ${color}` }}
                  />
                  <div
                    className="absolute top-[25px] w-0 h-0"
                    style={{
                      [rightward ? 'right' : 'left']: 0,
                      borderTop: '6px solid transparent',
                      borderBottom: '6px solid transparent',
                      [rightward ? 'borderLeft' : 'borderRight']: `9px solid ${color}`,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-dashed border-slate-400" /> front channel (redirect through the browser)</span>
        <span className="flex items-center gap-1.5"><span className="w-6 border-t-2 border-solid border-slate-400" /> back channel (direct server call)</span>
        <span className="flex items-center gap-1.5"><span className="px-1 rounded border border-slate-400">⚙</span> local check</span>
      </div>

      {/* Inspector */}
      <div className={`border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 ${active?.danger ? 'text-rose-700 dark:text-rose-300' : ''}`}>
        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400">step {step}/{msgs.length}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_BADGE[active.channel].cls}`}>{CHANNEL_BADGE[active.channel].text}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{active.label}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{active.note}</p>
            {active.payload && (
              <pre className="text-xs font-mono bg-slate-950 text-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre">{active.payload}</pre>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">{intro}</p>
        )}
      </div>
    </div>
  )
}

/** Small segmented picker shared by the identity modules */
export function VariantPicker<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={o.id === value}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            o.id === value
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function StoryPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
      <div className="text-sm text-amber-700 dark:text-amber-400 space-y-2">{children}</div>
    </div>
  )
}

export function KeyIdea({ title = 'The key idea', children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
      <h3 className="font-medium text-emerald-900 dark:text-emerald-200">{title}</h3>
      {children}
    </div>
  )
}

export function InfoCards({ cards }: { cards: { title: string; body: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(c => (
        <div key={c.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-sm">{c.title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{c.body}</p>
        </div>
      ))}
    </div>
  )
}
