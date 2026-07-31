import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import DoubtsBlock from '@/components/shared/DoubtsBlock'

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

const DOUBTS = [
  {
    q: 'Why can I not just have all three?',
    a: 'Partitions are inevitable — they will split your network regardless of intentions. When replicas are stranded on separate sides, you face an unavoidable forced choice: you cannot guarantee both consistency and availability simultaneously. For example, consider a two-datacenter Kafka setup where the west-east link fails. The west cluster must choose: accept writes locally (staying available but risking stale reads) or reject all requests (staying consistent but becoming unavailable). CAP theorem codifies this dilemma — real systems choose CP (MongoDB default: stop accepting writes if quorum is lost) or AP (Cassandra: both sides keep writing and reconcile later). The "P" for partition tolerance is non-negotiable because partitions happen; the real engineering choice is always between C and A.\n**Rule of thumb:** during a real partition, you cannot have your cake and eat it too.',
  },
  {
    q: 'What does "choosing availability" look like concretely?',
    a: 'Choosing availability means the system continues answering client requests during a partition, even though some answers are stale. For example, DNS during a split: root nameservers on both sides of the partition keep responding with the last-known IP they cached, even though the actual service may have moved. Conflicting writes (the same item updated on both sides) are reconciled later using strategies like last-write-wins, CRDTs, or application-specific merge logic. Shopping carts exemplify this: if the network partitions, both sides accept additions to your cart, you see slightly different totals on different devices, and once the partition heals, a merge strategy picks the final state. **Common mistake:** assuming eventual consistency means "close to instant" — clients actually see divergence until the system explicitly reconciles.',
  },
  {
    q: 'Is the C in CAP the same as the C in ACID?',
    a: 'No — they are completely different concepts despite sharing the letter "C". CAP consistency (linearizability) means every read always observes the most recent write across the entire system; all nodes agree on state instantly. For example, in Redis Cluster, a read from any node should return the same value unless a write just occurred. ACID consistency, by contrast, means database transactions maintain application-level invariants: if a foreign key constraint exists, no transaction can violate it; if a trigger updates related rows, it does so atomically. Same letter, entirely unrelated semantics. **Rule of thumb:** CAP consistency is about replication and visibility across nodes, while ACID consistency is about transaction integrity and rule enforcement within a single database.',
  },
  {
    q: 'What is PACELC?',
    a: 'PACELC extends CAP by addressing what happens when the network is healthy. It states: if a partition occurs, choose between Availability and Consistency; **else** (on a healthy network), choose between Latency and Consistency. For example, even when your Postgres cluster is fully connected, achieving instant consistency across all replicas requires synchronous replication — every write must wait for acknowledgment from all replicas, which adds latency. Most production systems default to eventual consistency because low latency is often more valuable than immediate consistency: DynamoDB, Cassandra, and MongoDB all accept this trade-off by default. **Common mistake:** assuming CAP choices only matter during failures — in reality, healthy networks also force you to pick, and most teams optimize for speed over sync guarantees.',
  },
]

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

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A bank has two branches that sync every transaction over a phone line — and today the line is dead.
          A customer walks into EACH branch to withdraw the same last $100. Now the impossible choice: keep
          serving customers (stay available — and risk paying out the $100 twice), or lock the counters until
          the line is fixed (stay consistent — and turn away everyone). You cannot have both while the line is
          down. That, in one broken phone line, is the CAP theorem.
        </p>
      </div>

      <MemoryTip>When the network splits, choose correct answers or continued answers.</MemoryTip>

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

      <DoubtsBlock doubts={DOUBTS} />
    </div>
  )
}
