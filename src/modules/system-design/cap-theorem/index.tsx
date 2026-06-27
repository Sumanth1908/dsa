import React, { useState } from 'react'

type CAPChoice = 'CP' | 'AP' | 'CA'

const CAP_DATA: Record<CAPChoice, {
  title: string; color: string; bgColor: string; borderColor: string
  description: string
  tradeoff: string
  examples: string[]
  scenario: string
}> = {
  CP: {
    title: 'Consistent + Partition Tolerant',
    color: 'text-violet-700 dark:text-violet-300',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    borderColor: 'border-violet-300 dark:border-violet-700',
    description: 'System stays consistent even during network partitions — but may become unavailable.',
    tradeoff: 'During a partition, some nodes refuse requests rather than risk returning stale data.',
    examples: ['MongoDB (default)', 'Redis (cluster mode)', 'HBase', 'Zookeeper'],
    scenario: 'Bank transactions, inventory management — wrong data is worse than no data.',
  },
  AP: {
    title: 'Available + Partition Tolerant',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    description: 'System stays available during partitions — but data may be temporarily inconsistent.',
    tradeoff: 'During a partition, nodes continue serving possibly stale reads. Eventual consistency.',
    examples: ['Cassandra', 'DynamoDB', 'CouchDB', 'Riak'],
    scenario: 'Social media likes, shopping carts — slightly stale data is acceptable.',
  },
  CA: {
    title: 'Consistent + Available',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-300 dark:border-amber-700',
    description: 'Consistent and available, but cannot handle network partitions.',
    tradeoff: 'Partitions will occur in real networks — so CA only works in single-node or non-distributed systems.',
    examples: ['PostgreSQL (single node)', 'MySQL (single node)', 'SQLite'],
    scenario: 'Only viable in single-datacenter setups with reliable internal networks.',
  },
}

const VERTICES = {
  C: { x: 300, y: 40, label: 'C\nConsistency' },
  A: { x: 500, y: 340, label: 'A\nAvailability' },
  P: { x: 100, y: 340, label: 'P\nPartition\nTolerance' },
}

export default function CAPTheoremVisualizer() {
  const [selected, setSelected] = useState<CAPChoice>('CP')
  const data = CAP_DATA[selected]

  const midpoints: Record<CAPChoice, { x: number; y: number }> = {
    CP: { x: (VERTICES.C.x + VERTICES.P.x) / 2, y: (VERTICES.C.y + VERTICES.P.y) / 2 },
    AP: { x: (VERTICES.A.x + VERTICES.P.x) / 2 + 30, y: (VERTICES.A.y + VERTICES.P.y) / 2 + 10 },
    CA: { x: (VERTICES.C.x + VERTICES.A.x) / 2, y: (VERTICES.C.y + VERTICES.A.y) / 2 },
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CAP Theorem</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          A distributed system can guarantee at most 2 of 3: Consistency, Availability, Partition Tolerance
        </p>
      </div>

      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm">
        <strong className="text-rose-700 dark:text-rose-400">Key insight:</strong>
        <span className="text-rose-600 dark:text-rose-400"> Network partitions WILL happen. So the real choice is between Consistency (CP) and Availability (AP).</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triangle */}
        <div className="viz-container">
          <svg width={600} height={420} viewBox="0 0 600 420" className="block w-full">
            {/* Triangle edges */}
            <line x1={VERTICES.C.x} y1={VERTICES.C.y} x2={VERTICES.A.x} y2={VERTICES.A.y} stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />
            <line x1={VERTICES.C.x} y1={VERTICES.C.y} x2={VERTICES.P.x} y2={VERTICES.P.y} stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />
            <line x1={VERTICES.A.x} y1={VERTICES.A.y} x2={VERTICES.P.x} y2={VERTICES.P.y} stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-700" />

            {/* Edge labels (choice buttons) */}
            {(Object.entries(midpoints) as [CAPChoice, { x: number; y: number }][]).map(([choice, pos]) => (
              <g key={choice} transform={`translate(${pos.x},${pos.y})`} onClick={() => setSelected(choice)} style={{ cursor: 'pointer' }}>
                <ellipse rx={35} ry={20} className={selected === choice ? 'fill-violet-500' : 'fill-slate-200 dark:fill-slate-700'} />
                <text textAnchor="middle" dy="0.35em" fontSize={13} fontWeight="700"
                  className={selected === choice ? 'fill-white' : 'fill-slate-600 dark:fill-slate-300'}>
                  {choice}
                </text>
              </g>
            ))}

            {/* Vertices */}
            {(Object.entries(VERTICES) as [string, { x: number; y: number; label: string }][]).map(([key, v]) => (
              <g key={key} transform={`translate(${v.x},${v.y})`}>
                <circle r={38} className="fill-slate-800 dark:fill-slate-200" />
                <text textAnchor="middle" dy="-0.5em" fontSize={16} fontWeight="800" className="fill-white dark:fill-slate-900">{key}</text>
                <text textAnchor="middle" dy="1em" fontSize={9} className="fill-slate-300 dark:fill-slate-600">
                  {v.label.split('\n')[1]}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        <div className={`rounded-2xl border ${data.borderColor} ${data.bgColor} p-6 space-y-4`}>
          <div>
            <div className="flex gap-2 mb-2">
              {(['CP', 'AP', 'CA'] as CAPChoice[]).map(c => (
                <button key={c} onClick={() => setSelected(c)}
                  className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                    selected === c ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
            <h3 className={`text-lg font-bold ${data.color}`}>{data.title}</h3>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300">{data.description}</p>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Trade-off</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">{data.tradeoff}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Real-world examples</h4>
            <div className="flex flex-wrap gap-1">
              {data.examples.map(e => (
                <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/50 rounded-xl p-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Best for</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">{data.scenario}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
