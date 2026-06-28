import React, { useState } from 'react'

type Phase = 'requirements' | 'scale' | 'api' | 'architecture' | 'tradeoffs'

const PHASES: { id: Phase; label: string; icon: string }[] = [
  { id: 'requirements', label: 'Requirements', icon: '📋' },
  { id: 'scale', label: 'Scale', icon: '📈' },
  { id: 'api', label: 'API Design', icon: '🔌' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'tradeoffs', label: 'Trade-offs', icon: '⚖️' },
]

const EXAMPLE_SYSTEM = 'Chat Application (e.g. Slack / WhatsApp)'

const FUNCTIONAL_REQS = [
  'Users can send text messages to other users (1-to-1)',
  'Users can send messages in group channels',
  'Users can attach files (images, docs) to messages',
  'Users can use multiple clients simultaneously',
  'Messages are delivered in order',
  'Users see online/offline status of other users',
]

const NONFUNCTIONAL_REQS = [
  { label: 'Latency', value: '< 100ms message delivery (P99)' },
  { label: 'Scale', value: '100K concurrent users, 10M messages/day' },
  { label: 'Availability', value: '99.9% uptime (< 8.7 hrs downtime/year)' },
  { label: 'Storage', value: '7-year message retention' },
  { label: 'Consistency', value: 'Eventual — brief out-of-order acceptable' },
]

const SCALE_CALCS = [
  { label: 'Daily Active Users (DAU)', value: '100,000', formula: 'Given' },
  { label: 'Messages per user / day', value: '100', formula: 'Assumption' },
  { label: 'Total messages / day', value: '10M', formula: '100K × 100' },
  { label: 'Write QPS (peak 3×)', value: '~350 req/s', formula: '10M ÷ 86,400 × 3' },
  { label: 'Avg message size', value: '1 KB', formula: 'text + metadata' },
  { label: 'Storage / day', value: '10 GB', formula: '10M × 1KB' },
  { label: 'Storage / year', value: '3.65 TB', formula: '10GB × 365' },
  { label: '7-year retention', value: '25.5 TB', formula: '3.65TB × 7' },
]

const API_ENDPOINTS = [
  { method: 'POST', path: '/messages', description: 'Send a message', body: '{ to: userId, content: string, attachmentUrl? }', response: '{ messageId, timestamp }' },
  { method: 'GET', path: '/messages/:channelId', description: 'Fetch channel history', body: '?before=cursor&limit=50', response: '[Message]' },
  { method: 'GET', path: '/users/:userId/status', description: 'Check online status', body: '—', response: '{ status: "online"|"offline", lastSeen }' },
  { method: 'WS', path: 'ws://chat/connect', description: 'Real-time stream', body: 'JWT in header', response: 'Bidirectional message frames' },
]

const BUILDING_BLOCKS = [
  { name: 'WebSocket Server', reason: 'Real-time bidirectional — HTTP polling too slow for chat', icon: '⚡' },
  { name: 'Message Queue (Kafka)', reason: 'Decouple ingestion from delivery, buffer spikes, replay', icon: '📨' },
  { name: 'DB: Cassandra', reason: 'Wide-column, write-optimized, scales horizontally, TTL for retention', icon: '🗄️' },
  { name: 'Redis', reason: 'Online presence cache, session store, pub/sub for cross-server delivery', icon: '⚡' },
  { name: 'Object Storage (S3)', reason: 'Cheap, durable storage for file attachments', icon: '📦' },
  { name: 'CDN', reason: 'Serve file attachments from edge — low latency downloads', icon: '🌐' },
  { name: 'Load Balancer (L7)', reason: 'Sticky WebSocket sessions, route by userId hash', icon: '⚖️' },
]

const TRADEOFFS = [
  {
    decision: 'SQL vs NoSQL for messages',
    chose: 'NoSQL (Cassandra)',
    reason: 'Write-heavy workload, need horizontal scale, time-series query pattern (messages by channel + time). SQL joins across 10M rows/day would be slow.',
    tradeoff: 'Lose ACID transactions — eventual consistency on reads',
  },
  {
    decision: 'WebSocket vs HTTP polling',
    chose: 'WebSocket',
    reason: '< 100ms latency requirement. HTTP polling at 1s interval would mean 100K×1 = 100K req/s just for polling — 10× more load for worse UX.',
    tradeoff: 'Stateful connections — load balancer must maintain sticky sessions',
  },
  {
    decision: 'Fanout on write vs read',
    chose: 'Fanout on write (async via Kafka)',
    reason: 'Most reads are recent messages in small groups. Writing to each member\'s inbox at message time makes reads cheap. Groups > 1000 members switch to fanout-on-read.',
    tradeoff: 'Extra storage. Celebrity/large-group edge case needs separate handling',
  },
  {
    decision: 'Message ordering guarantee',
    chose: 'Per-channel ordering (not global)',
    reason: 'Global ordering requires distributed consensus (too slow). Per-channel is sufficient — users only care about order within a conversation.',
    tradeoff: 'Cross-channel ordering not guaranteed — acceptable for chat',
  },
]

export default function SystemDesignApproachViz() {
  const [phase, setPhase] = useState<Phase>('requirements')
  const [checkedFn, setCheckedFn] = useState<Set<number>>(new Set())
  const [checkedNfn, setCheckedNfn] = useState<Set<number>>(new Set())

  const toggleFn = (i: number) => setCheckedFn(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const toggleNfn = (i: number) => setCheckedNfn(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Design Approach</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          A repeatable 5-phase framework for any system design interview — with a worked <strong>{EXAMPLE_SYSTEM}</strong> example throughout
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          System design questions are intentionally vague ("Design WhatsApp"). Your job is to drive the conversation — ask clarifying questions, make assumptions explicit, and justify every decision with trade-offs. Interviewers want to see <em>how you think</em>, not just the final diagram.
        </p>
      </div>

      {/* Phase tabs */}
      <div className="flex flex-wrap gap-2">
        {PHASES.map((p, i) => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              phase === p.id
                ? 'bg-violet-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            <span>{p.icon}</span>
            <span className="hidden sm:inline">{i + 1}.</span>
            {p.label}
          </button>
        ))}
      </div>

      <div className="viz-container p-6">
        {phase === 'requirements' && (
          <div className="space-y-5">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Worked example: <span className="text-violet-600 dark:text-violet-400">{EXAMPLE_SYSTEM}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Functional Requirements <span className="text-slate-400 font-normal">(what the system does)</span>
                </div>
                <div className="space-y-2">
                  {FUNCTIONAL_REQS.map((req, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={checkedFn.has(i)} onChange={() => toggleFn(i)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                      <span className={`text-sm transition-colors ${checkedFn.has(i) ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{req}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Non-Functional Requirements <span className="text-slate-400 font-normal">(how well it does it)</span>
                </div>
                <div className="space-y-2">
                  {NONFUNCTIONAL_REQS.map((req, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={checkedNfn.has(i)} onChange={() => toggleNfn(i)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                      <span className={`text-sm ${checkedNfn.has(i) ? 'text-slate-400 line-through' : ''}`}>
                        <strong className="text-slate-700 dark:text-slate-300">{req.label}:</strong>
                        <span className="text-slate-500 dark:text-slate-400"> {req.value}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-3 text-xs text-violet-700 dark:text-violet-300">
              💡 Tip: Tick off each requirement as you address it during the design. Unticked items at the end = gaps to explain.
            </div>
          </div>
        )}

        {phase === 'scale' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Back-of-envelope estimation</div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Metric</th>
                    <th className="px-4 py-2.5 text-right">Value</th>
                    <th className="px-4 py-2.5 text-left hidden sm:table-cell">Derivation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {SCALE_CALCS.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-violet-700 dark:text-violet-400">{row.value}</td>
                      <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">{row.formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-400">
              Key storage insight: 25.5 TB over 7 years fits in a mid-size Cassandra cluster (3–5 nodes). For 10× scale, just add nodes — no schema changes.
            </div>
          </div>
        )}

        {phase === 'api' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Core API endpoints — base path <code className="text-violet-600 dark:text-violet-400">/api/v1</code></div>
            <div className="space-y-3">
              {API_ENDPOINTS.map((ep, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                      ep.method === 'GET' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' :
                      ep.method === 'POST' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400' :
                      'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    }`}>{ep.method}</span>
                    <code className="text-sm text-slate-700 dark:text-slate-300">{ep.path}</code>
                    <span className="text-xs text-slate-400 ml-auto">{ep.description}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
                    <div className="px-4 py-2.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Request</div>
                      <code className="text-xs text-slate-600 dark:text-slate-400">{ep.body}</code>
                    </div>
                    <div className="px-4 py-2.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Response</div>
                      <code className="text-xs text-slate-600 dark:text-slate-400">{ep.response}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'architecture' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Building blocks — and why each one</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUILDING_BLOCKS.map((b, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{b.icon}</span>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{b.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{b.reason}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300 block mb-1">High-level flow:</strong>
              Client → L7 LB (sticky by userId) → WebSocket Server → Kafka (write message) → Consumer → Cassandra (persist) + Redis pub/sub (notify online recipients) → WebSocket push to recipients
            </div>
          </div>
        )}

        {phase === 'tradeoffs' && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Key design decisions — and the trade-offs accepted</div>
            {TRADEOFFS.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono flex-shrink-0">#{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.decision}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pl-8">
                  <div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1">✓ Chose: {t.chose}</div>
                    <p className="text-slate-600 dark:text-slate-400">{t.reason}</p>
                  </div>
                  <div>
                    <div className="text-amber-600 dark:text-amber-400 font-semibold mb-1">↳ Trade-off accepted</div>
                    <p className="text-slate-500 dark:text-slate-500">{t.tradeoff}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
