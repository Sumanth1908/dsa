import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'

interface Step {
  publisherActive: number[]
  queueMessages: string[]
  subscriberActive: number[]
  processing: string | null
  message: string
}

function pubSubSteps(): Step[] {
  const steps: Step[] = [{ publisherActive: [], queueMessages: [], subscriberActive: [], processing: null, message: 'Pub/Sub system idle. Publishers will send messages to the broker.' }]
  const msgs: string[] = []

  steps.push({ publisherActive: [0], queueMessages: [...msgs], subscriberActive: [], processing: null, message: 'Publisher A: Publish "user.signup" event' })
  msgs.push('user.signup')
  steps.push({ publisherActive: [0], queueMessages: [...msgs], subscriberActive: [], processing: null, message: '"user.signup" added to queue (persisted)' })
  steps.push({ publisherActive: [], queueMessages: [...msgs], subscriberActive: [], processing: null, message: 'Publisher A done. Queue has 1 message.' })

  steps.push({ publisherActive: [1], queueMessages: [...msgs], subscriberActive: [], processing: null, message: 'Publisher B: Publish "order.created" event' })
  msgs.push('order.created')
  steps.push({ publisherActive: [1], queueMessages: [...msgs], subscriberActive: [], processing: null, message: '"order.created" added. Queue now has 2 messages.' })

  steps.push({ publisherActive: [0, 1], queueMessages: [...msgs], subscriberActive: [], processing: null, message: 'Both publishers published. Broker holds 2 messages for delivery.' })

  const m1 = msgs.shift()!
  steps.push({ publisherActive: [], queueMessages: [...msgs], subscriberActive: [0], processing: m1, message: `Subscriber 1 consumes "${m1}" — sends ACK after processing` })
  steps.push({ publisherActive: [], queueMessages: [...msgs], subscriberActive: [], processing: null, message: `"${m1}" acknowledged and removed from queue.` })

  const m2 = msgs.shift()!
  steps.push({ publisherActive: [], queueMessages: [...msgs], subscriberActive: [1], processing: m2, message: `Subscriber 2 consumes "${m2}"` })
  steps.push({ publisherActive: [], queueMessages: [...msgs], subscriberActive: [], processing: null, message: `"${m2}" acknowledged. Queue empty.` })

  return steps
}

const PUBLISHERS = [
  { id: 0, label: 'Service A', x: 60, y: 100 },
  { id: 1, label: 'Service B', x: 60, y: 240 },
]
const SUBSCRIBERS = [
  { id: 0, label: 'Email Svc', x: 540, y: 100 },
  { id: 1, label: 'Analytics', x: 540, y: 240 },
]
const BROKER = { x: 300, y: 170 }

export default function MessageQueuesVisualizer() {
  const steps = pubSubSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Message Queues & Pub/Sub</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Decouple producers from consumers via an async message broker
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { title: 'At-most-once', desc: 'Fire and forget — messages may be lost but never duplicated', color: 'amber' },
          { title: 'At-least-once', desc: 'ACK required — messages may be duplicated on retry', color: 'violet' },
          { title: 'Exactly-once', desc: 'Idempotency + dedup — hardest to achieve, highest cost', color: 'emerald' },
        ].map(g => (
          <div key={g.title} className={`bg-${g.color}-50 dark:bg-${g.color}-950/30 border border-${g.color}-200 dark:border-${g.color}-800 rounded-xl p-3`}>
            <div className={`font-semibold text-${g.color}-700 dark:text-${g.color}-400 text-xs mb-1`}>{g.title}</div>
            <div className={`text-xs text-${g.color}-600 dark:text-${g.color}-500`}>{g.desc}</div>
          </div>
        ))}
      </div>

      <div className="viz-container">
        <svg width={620} height={350} className="block w-full max-w-2xl mx-auto" viewBox="0 0 620 350">
          {/* Publishers → Broker */}
          {PUBLISHERS.map(p => (
            <line key={p.id} x1={p.x + 50} y1={p.y} x2={BROKER.x - 80} y2={BROKER.y}
              stroke="currentColor" strokeWidth={2} strokeDasharray="5,4" className="text-slate-300 dark:text-slate-700" />
          ))}

          {/* Broker → Subscribers */}
          {SUBSCRIBERS.map(s => (
            <line key={s.id} x1={BROKER.x + 80} y1={BROKER.y} x2={s.x - 50} y2={s.y}
              stroke="currentColor" strokeWidth={2} strokeDasharray="5,4" className="text-slate-300 dark:text-slate-700" />
          ))}

          {/* Publishers */}
          {PUBLISHERS.map(p => (
            <g key={p.id} transform={`translate(${p.x},${p.y})`}>
              <rect x={-50} y={-28} width={100} height={56} rx={10}
                className={cur.publisherActive.includes(p.id) ? 'fill-violet-500' : 'fill-slate-100 dark:fill-slate-800'}
                stroke={cur.publisherActive.includes(p.id) ? '#6366f1' : '#94a3b8'} strokeWidth={2} />
              <text textAnchor="middle" dy={-8} fontSize={10} fontWeight="600"
                className={cur.publisherActive.includes(p.id) ? 'fill-white' : 'fill-slate-600 dark:fill-slate-300'}>
                Publisher
              </text>
              <text textAnchor="middle" dy={8} fontSize={11} fontWeight="700"
                className={cur.publisherActive.includes(p.id) ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                {p.label}
              </text>
            </g>
          ))}

          {/* Broker */}
          <g transform={`translate(${BROKER.x},${BROKER.y})`}>
            <rect x={-80} y={-60} width={160} height={120} rx={12} className="fill-rose-500" />
            <text textAnchor="middle" dy={-30} fontSize={11} fill="white" fontWeight="700">Message Broker</text>
            {/* Queue messages */}
            <rect x={-60} y={-18} width={120} height={36} rx={6} fill="white" fillOpacity={0.2} />
            {cur.queueMessages.length === 0 ? (
              <text textAnchor="middle" dy="0.35em" fontSize={10} fill="white" fillOpacity={0.7}>[empty queue]</text>
            ) : (
              cur.queueMessages.slice(0, 2).map((m, i) => (
                <text key={i} textAnchor="middle" y={i === 0 && cur.queueMessages.length > 1 ? -6 : i === 1 ? 10 : 0} fontSize={9} fill="white" fontWeight="600">
                  {m}
                </text>
              ))
            )}
            <text textAnchor="middle" dy={50} fontSize={10} fill="white" fillOpacity={0.7}>
              {cur.queueMessages.length} msg{cur.queueMessages.length !== 1 ? 's' : ''}
            </text>
          </g>

          {/* Subscribers */}
          {SUBSCRIBERS.map(s => (
            <g key={s.id} transform={`translate(${s.x},${s.y})`}>
              <rect x={-50} y={-28} width={100} height={56} rx={10}
                className={cur.subscriberActive.includes(s.id) ? 'fill-emerald-500' : 'fill-slate-100 dark:fill-slate-800'}
                stroke={cur.subscriberActive.includes(s.id) ? '#22c55e' : '#94a3b8'} strokeWidth={2} />
              <text textAnchor="middle" dy={-8} fontSize={10} fontWeight="600"
                className={cur.subscriberActive.includes(s.id) ? 'fill-white' : 'fill-slate-600 dark:fill-slate-300'}>
                Subscriber
              </text>
              <text textAnchor="middle" dy={8} fontSize={11} fontWeight="700"
                className={cur.subscriberActive.includes(s.id) ? 'fill-white' : 'fill-slate-700 dark:fill-slate-200'}>
                {s.label}
              </text>
            </g>
          ))}

          {/* Processing label */}
          {cur.processing && (
            <text x={310} y={300} textAnchor="middle" fontSize={12} className="fill-amber-500 dark:fill-amber-400" fontWeight="600">
              Processing: "{cur.processing}"
            </text>
          )}
        </svg>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
    </div>
  )
}
