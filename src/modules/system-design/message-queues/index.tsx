import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import DoubtsBlock from '@/components/shared/DoubtsBlock'

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

const DOUBTS = [
  {
    q: 'What does a queue actually buy between two services?',
    a: "A queue decouples producers from consumers in TIME and FAILURE, meaning they no longer need to be simultaneously alive, fast, or scaled together. Instead of a consumer outage causing dropped requests, messages pile in the queue and wait; when the consumer recovers or scales up, it drains them at its own pace.\nFor example, during Black Friday an e-commerce site might publish 10,000 orders/second — without a queue, downstream services (inventory, billing) would immediately hit CPU limits and reject requests, losing sales. With a queue, those 10,000 orders wait in Kafka or RabbitMQ; slow services are unaffected, and you simply scale up the consumer replicas or optimize them over time. Similarly, if a service redeploys, requests don't disappear — they queue until it restarts.\n**Key benefit:** Queues turn a synchronous dependency (service A must wait for service B to answer) into an asynchronous one (service B works at its own speed).",
  },
  {
    q: 'Is exactly-once delivery real?',
    a: 'Delivery is effectively at-least-once in practice — redelivery after an unacknowledged failure is unavoidable. True "exactly-once" semantics require guarantees from both the broker AND the consumer, which is expensive and often unnecessary. Instead, "exactly-once" is manufactured at the CONSUMER layer using idempotency: design every handler to detect and skip duplicate message IDs, or to produce the same output if run twice.\nFor example, a payment service consuming an "order.created" event should check if that order ID was already processed before charging the card again. If the consumer crashes after deducting $50 but before sending an ACK, the broker redelivers the message; an idempotent handler checks the transaction log and skips charging again. Similarly, Kafka can offer "exactly-once" in Streams by storing offsets and outputs together, but this adds latency and complexity — most teams just dedup in application code.\n**Common mistake:** Assuming the message broker guarantees exactly-once. Always design handlers to be safely re-runnable.',
  },
  {
    q: 'What happens when consumers cannot keep up?',
    a: "The queue absorbs backlog as growing lag (depth grows larger), but this cannot continue indefinitely — every broker has disk and memory limits. When the queue fills or latency becomes unacceptable, you must choose: scale consumers horizontally to drain faster, apply backpressure to publishers (reject or throttle their writes), expire old messages, or shed lower-priority messages.\nFor example, a video transcoding service might fall behind due to a bug, and the task queue grows from 1,000 to 100,000 jobs waiting for transcoding. If you can't fix the bug immediately, you scale up the transcoding workers from 5 to 50 replicas — but if the cost is too high, you might discard lower-priority jobs (e.g., thumbnails) to prioritize full videos. Poison messages — a single malformed job that crashes every worker — require special handling: route them to a dead-letter queue for manual inspection, so one bad message doesn't block the entire pipeline.\n**Rule of thumb:** Treat queue depth like a bank account balance; always have a policy for when the account shrinks.",
  },
  {
    q: 'How do I keep ordering AND scale out consumers?',
    a: "Global ordering and parallelism are fundamentally incompatible — if you require strict order on every message, you can only use one consumer at a time, and that’s your bottleneck. The standard compromise is key-based ordering: partition messages by a logical key (user ID, order ID, etc.), so each partition maintains strict ordering while different partitions run in parallel.\nFor example, Kafka partitions topics by key: if two events have the same user ID, they go to the same partition and process in order (user.login → user.profile_updated). But if a second event has a different user ID, it lands in a different partition and can be processed simultaneously by a different consumer. This means user A’s events stay ordered, user B’s events stay ordered, but their processing doesn’t block each other. If you used a single partition for the entire topic (global order), only one consumer could drain it — you’d get exactly-once ordering but the throughput cap is determined by one machine’s processing speed.\n**Key insight:** Use key partitioning when relative ordering matters (within a user or order), but global order is neither necessary nor scalable.",
  },
]

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

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          The waiter doesn't stand in the kitchen waiting for your burger. He clips the order to the ticket
          rail and goes back to serving tables; the kitchen pulls tickets at its own pace. A slammed kitchen
          just means a longer rail — never a frozen waiter. That rail is a message queue: it lets the fast part
          of a system and the slow part work without ever waiting on each other, and no order is lost even if
          the kitchen falls behind.
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

      <DoubtsBlock doubts={DOUBTS} />
    </div>
  )
}
