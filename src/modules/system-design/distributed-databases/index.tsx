import React, { useState } from 'react'
import DoubtsBlock from '@/components/shared/DoubtsBlock'
import MemoryTip from '@/components/shared/MemoryTip'

type Scenario = 'healthy' | 'replica-down' | 'leader-down' | 'partition'
type Topic = 'replication' | 'sharding' | 'election' | 'routing'
type FailureTolerance = 0 | 1 | 2

interface NodeView {
  id: string
  role: 'Leader' | 'Replica'
  state: 'healthy' | 'down' | 'isolated' | 'promoted'
  lag: string
}

const SCENARIOS: Record<Scenario, {
  title: string
  subtitle: string
  result: string
  writePath: string
  readPath: string
  availability: string
  tone: string
}> = {
  healthy: {
    title: 'Everything healthy',
    subtitle: 'Leaders accept writes; replicas serve safe-to-stale reads.',
    result: 'All traffic is served. Every committed write is copied to the replicas.',
    writePath: 'Router → shard leader → replication log',
    readPath: 'Router → a healthy replica (or leader for a strict read)',
    availability: 'Reads ✓  Writes ✓',
    tone: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
  },
  'replica-down': {
    title: 'One read replica is gone',
    subtitle: 'Health checks remove A3 from the read pool.',
    result: 'No election is needed: A1 is still leader. Reads shift to A2 and capacity drops, but correctness is unchanged.',
    writePath: 'Router → A1; A1 replicates to the remaining A2',
    readPath: 'A3 is ejected → new reads go to A2 or A1',
    availability: 'Reads ✓ (less capacity)  Writes ✓',
    tone: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  },
  'leader-down': {
    title: 'The shard leader is gone',
    subtitle: 'A majority elects A2 and the router learns the new leader.',
    result: 'Writes pause during detection and election. Once A2 is promoted, retries use the new route; A1 must be fenced before it can rejoin.',
    writePath: 'A1 fails → election → router refresh → A2',
    readPath: 'Reads may continue from an eligible replica, subject to the chosen consistency level',
    availability: 'Reads usually ✓  Writes pause briefly',
    tone: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30',
  },
  partition: {
    title: 'A network partition isolates A3',
    subtitle: 'A3 is alive, but it cannot reach a majority.',
    result: 'The majority side keeps A1 as leader. The isolated node cannot become leader or accept writes, preventing split brain.',
    writePath: 'Router → majority-side A1; A3 rejects or redirects writes',
    readPath: 'Strong reads avoid A3; stale reads may use it only if the product explicitly allows that',
    availability: 'Majority side ✓  Minority writes ✕',
    tone: 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30',
  },
}

const TOPICS: Record<Topic, {
  title: string
  question: string
  summary: string
  points: Array<{ label: string; text: string }>
  warning: string
}> = {
  replication: {
    title: 'Replication',
    question: 'Why keep copies?',
    summary: 'Replication puts the same shard on multiple failure domains. It improves availability and read capacity; it does not divide the dataset.',
    points: [
      { label: 'Availability', text: 'A replica can be promoted when the leader dies, so one machine is not the database.' },
      { label: 'Read scale', text: 'Read-only traffic can be spread across followers, keeping leader CPU and connections available for writes.' },
      { label: 'Disaster tolerance', text: 'Copies in another availability zone survive a rack or zone failure.' },
      { label: 'The price', text: 'Synchronous copies add write latency; asynchronous copies can lag and lose recent acknowledged writes.' },
    ],
    warning: 'A replica is not a backup. Bad deletes and corrupt writes replicate too; backups preserve older, recoverable state.',
  },
  sharding: {
    title: 'Sharding',
    question: 'Why split the dataset?',
    summary: 'Sharding assigns different key ranges or hash buckets to different replica groups. It scales storage and write throughput beyond one leader.',
    points: [
      { label: 'Shard key', text: 'The router derives a shard from tenant_id, user_id, region, or another stable key.' },
      { label: 'Range sharding', text: 'Great for range scans, but sequential keys can create one hot shard.' },
      { label: 'Hash sharding', text: 'Spreads keys evenly, but scatter-gather queries and range scans become harder.' },
      { label: 'Rebalancing', text: 'Virtual shards or consistent hashing reduce how much data moves when capacity changes.' },
    ],
    warning: 'Choose the shard key from access patterns, not just cardinality. Cross-shard joins, transactions, and aggregations are expensive.',
  },
  election: {
    title: 'Leader election',
    question: 'Who is allowed to write?',
    summary: 'Nodes exchange heartbeats. After a timeout, an eligible replica asks a majority for votes in a newer term; only a sufficiently up-to-date candidate wins.',
    points: [
      { label: 'Majority', text: 'In a 3-node group, 2 votes are required. Two disconnected sides cannot both obtain a majority.' },
      { label: 'Terms / epochs', text: 'Every leadership generation has a larger number, so nodes reject commands from an old leader.' },
      { label: 'Log freshness', text: 'A stale replica should not win and overwrite writes it never received.' },
      { label: 'Fencing', text: 'Leases, epochs, or storage tokens stop a recovered old leader from continuing to write.' },
    ],
    warning: 'Failure detection is suspicion, not proof. Timeouts must balance fast recovery against false elections caused by pauses or slow networks.',
  },
  routing: {
    title: 'Read / write routing',
    question: 'Why isolate traffic?',
    summary: 'Writes usually go to one leader for ordering. Safe-to-stale reads can go to replicas so large queries cannot starve the write path.',
    points: [
      { label: 'Write isolation', text: 'One ordered write path simplifies conflicts, constraints, transactions, and replication.' },
      { label: 'Read isolation', text: 'Replica pools absorb search, feeds, dashboards, and analytics without consuming leader capacity.' },
      { label: 'Read-your-writes', text: 'After a mutation, pin that user to the leader or wait until a replica reaches the returned log position.' },
      { label: 'Strict reads', text: 'Balances, permissions, inventory, and lock decisions should read from the leader or use a quorum/linearizable read.' },
    ],
    warning: 'Read replicas trade freshness for scale. “Successful write, then old value” is expected unless the application asks for a stronger guarantee.',
  },
}

const FAILOVER_STEPS: Record<Scenario, string[]> = {
  healthy: ['Health checks pass', 'Router uses current shard map', 'Writes replicate', 'Replicas report their applied position'],
  'replica-down': ['Health checks fail for A3', 'A3 leaves the read pool', 'Traffic shifts to A2', 'Operator replaces A3 and catches it up from the log'],
  'leader-down': ['Heartbeats from A1 stop', 'Election timeout expires', 'A2 wins a majority in a new term', 'Shard map points writes to A2', 'Clients retry safe/idempotent operations'],
  partition: ['A3 loses contact with A1 and A2', 'A3 cannot collect 2 votes', 'A1 retains majority leadership', 'Router avoids A3 for strong operations', 'A3 catches up after the link heals'],
}

const REPLACEMENT_STEPS = [
  { title: 'Healthy replica group', node: 'A3', nodeState: 'serving reads', progress: 100, detail: 'A1 leads; A2 and A3 are caught up and available for reads or failover.' },
  { title: 'A3 stops responding', node: 'A3', nodeState: 'offline', progress: 0, detail: 'Health checks eject A3. Reads shift to A2 while writes continue through A1.' },
  { title: 'Automation provisions A4', node: 'A4', nodeState: 'empty · non-voting', progress: 5, detail: 'A cloud service or operator creates a fresh machine in a healthy failure domain.' },
  { title: 'A4 receives a snapshot', node: 'A4', nodeState: 'seeding snapshot', progress: 55, detail: 'A base copy comes from A1, A2, or object storage. A4 still serves no traffic.' },
  { title: 'A4 replays the log', node: 'A4', nodeState: 'catching up', progress: 92, detail: 'WAL/oplog entries close the gap between the snapshot and the current leader position.' },
  { title: 'Redundancy restored', node: 'A4', nodeState: 'voting · read ready', progress: 100, detail: 'After validation, A4 joins the voting set and may re-enter the read pool.' },
]

const DOUBTS = [
  {
    q: 'What exactly happens to traffic when a database node disappears?',
    a: 'There are two different paths. If a **replica** fails, health checks eject it from the read pool and the load balancer sends new reads to the remaining replicas; writes keep using the existing leader. If the **leader** fails, writes pause while a majority elects a replacement. The database driver, proxy, or shard router then refreshes its topology and retries eligible operations against the new leader. Requests already in flight are ambiguous: the client may not know whether a timed-out write committed. Use idempotency keys or read the result before retrying—blind retries can duplicate payments or orders.',
  },
  {
    q: 'Why do production replica groups usually have 3 nodes instead of 2?',
    a: 'Election safety requires a majority. With 2 nodes, losing either one leaves only 1 of 2 votes, so the survivor cannot safely distinguish “peer failed” from “network split.” With 3 nodes, any 2 form a majority and tolerate 1 failure. Five nodes tolerate 2 failures but cost more and add coordination latency. An even-numbered voting member rarely increases failure tolerance: 4 nodes still require 3 votes and tolerate only 1 failure.',
  },
  {
    q: 'Does every replica serve application traffic?',
    a: 'No. The **leader replica** normally receives writes and may also receive strict reads. Healthy follower replicas may receive stale-tolerant reads if read scaling is enabled, but they can instead be voting-only, hidden, delayed, analytics-only, or reserved for disaster recovery. Even a follower with no client traffic still replays the replication log, acknowledges writes when configured, participates in elections, and can be promoted. A lagging or unhealthy follower is removed from the read pool until it catches up.',
  },
  {
    q: 'Where does a replacement node come from after one fails?',
    a: 'A cloud database service, Kubernetes operator, or infrastructure automation provisions a **new empty machine**. It is not a magical copy of the failed machine. The database seeds it with a base snapshot from a healthy replica or object storage, replays WAL/oplog entries produced after that snapshot, and follows the leader until fully caught up. It normally joins as non-voting and receives no reads during this process. After validation it enters the voting and read pools. If every replica is lost, recovery must use a backup or cross-region copy instead.',
  },
  {
    q: 'Why not accept writes on every replica?',
    a: 'Multi-leader and leaderless databases can, but conflict resolution becomes part of the data model. Two nodes may update the same row during a partition, so the system needs last-write-wins, vector clocks, CRDTs, or application merge logic. A single leader provides one order for writes, which makes uniqueness, foreign keys, counters, and transactions much easier to reason about. Use multi-leader only when accepting local writes across regions is worth the conflict complexity.',
  },
  {
    q: 'Can a read replica always return the latest value?',
    a: 'No. With asynchronous replication, a replica replays the leader’s log later, so it may return an older value. Common fixes are: read the leader for strict operations; pin a user to the leader briefly after their write; pass the commit log position and wait until a replica has applied it; or use a quorum read in databases that support it. Each stronger guarantee costs latency, capacity, or availability.',
  },
  {
    q: 'How are sharding and replication different?',
    a: '**Sharding** stores different data on different groups: shard A might own users 0–49 and shard B users 50–99. It increases total storage and write throughput. **Replication** stores copies of each shard: A1, A2, and A3 contain the same shard A data. It increases availability and read throughput. Large systems usually combine them: every shard is itself a replicated group.',
  },
  {
    q: 'What do N, W, and R mean in a quorum system?',
    a: '`N` is the number of replicas, `W` is how many must acknowledge a write, and `R` is how many participate in a read. When `W + R > N`, the read and write sets overlap, so at least one contacted replica has the latest acknowledged version—assuming version comparison and repair are implemented correctly. With N=3, W=2, R=2 is a common balanced choice. W=1/R=3 favors write latency; W=3/R=1 favors read latency but makes writes less available.',
  },
  {
    q: 'What happens if every replica of one shard is unavailable?',
    a: 'Only that shard’s keys become unavailable; other shards can continue serving traffic if routing and dependencies are isolated. This is called a partial outage. The service should return an explicit retryable error instead of silently routing to the wrong shard. Recovery needs a surviving replica, a cross-region copy, or a backup restore. Replicas protect against machine failures; backups protect against total replica loss, corruption, and operator mistakes.',
  },
  {
    q: 'How do I choose a shard key and avoid hot shards?',
    a: 'Start from the highest-volume queries and pick a key that routes most requests to exactly one shard while spreading load evenly. Tenant ID is useful for tenant-scoped data, but one giant tenant can dominate a shard. Timestamp ranges are good for scans but funnel all new writes to the newest range. Hashing distributes writes but harms range queries. Common remedies are composite keys, hash prefixes, virtual shards, dedicated placement for large tenants, and continuous per-shard load monitoring.',
  },
]

function nodesFor(scenario: Scenario): NodeView[] {
  if (scenario === 'leader-down') {
    return [
      { id: 'A1', role: 'Leader', state: 'down', lag: 'offline' },
      { id: 'A2', role: 'Leader', state: 'promoted', lag: 'new term' },
      { id: 'A3', role: 'Replica', state: 'healthy', lag: '18 ms' },
    ]
  }
  return [
    { id: 'A1', role: 'Leader', state: 'healthy', lag: 'source' },
    { id: 'A2', role: 'Replica', state: 'healthy', lag: '12 ms' },
    {
      id: 'A3',
      role: 'Replica',
      state: scenario === 'replica-down' ? 'down' : scenario === 'partition' ? 'isolated' : 'healthy',
      lag: scenario === 'replica-down' ? 'offline' : scenario === 'partition' ? 'unknown' : '31 ms',
    },
  ]
}

function DatabaseNode({ node }: { node: NodeView }) {
  const styles = {
    healthy: node.role === 'Leader'
      ? 'border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40'
      : 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30',
    promoted: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/40 dark:ring-emerald-900',
    down: 'border-slate-300 bg-slate-100 opacity-55 dark:border-slate-700 dark:bg-slate-800',
    isolated: 'border-violet-400 bg-violet-50 border-dashed dark:border-violet-700 dark:bg-violet-950/30',
  }
  const stateLabel = node.state === 'healthy' ? node.lag : node.state === 'promoted' ? 'promoted' : node.state

  return (
    <div className={`rounded-lg border p-3 min-w-0 transition-all ${styles[node.state]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{node.id}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${node.state === 'down' ? 'bg-slate-400' : node.state === 'isolated' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{node.role}</div>
      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{stateLabel}</div>
    </div>
  )
}

function ReplicaGroup({ title, range, nodes, quiet = false }: { title: string; range: string; nodes: NodeView[]; quiet?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${quiet ? 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60' : 'border-indigo-200 bg-white dark:border-indigo-900 dark:bg-slate-900'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h4>
          <p className="text-xs text-slate-500">{range}</p>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">replica group</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {nodes.map(node => <DatabaseNode key={node.id} node={node} />)}
      </div>
    </div>
  )
}

export default function DistributedDatabasesVisualizer() {
  const [scenario, setScenario] = useState<Scenario>('healthy')
  const [topic, setTopic] = useState<Topic>('replication')
  const [failureTolerance, setFailureTolerance] = useState<FailureTolerance>(1)
  const [replacementStep, setReplacementStep] = useState(0)
  const data = SCENARIOS[scenario]
  const topicData = TOPICS[topic]
  const replacement = REPLACEMENT_STEPS[replacementStep]
  const votingNodes = failureTolerance * 2 + 1
  const shardANodes = nodesFor(scenario)
  const shardBNodes: NodeView[] = [
    { id: 'B1', role: 'Leader', state: 'healthy', lag: 'source' },
    { id: 'B2', role: 'Replica', state: 'healthy', lag: '9 ms' },
    { id: 'B3', role: 'Replica', state: 'healthy', lag: '26 ms' },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Distributed Databases</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">How sharding, replicas, elections, and routing keep data scalable and available</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <h3 className="mb-1 font-medium text-amber-800 dark:text-amber-300">The two independent problems</h3>
        <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
          One database eventually runs out of disk or write capacity, so we <strong>shard</strong>: split different rows across machines.
          But each shard is now a single point of failure, so we <strong>replicate</strong>: keep copies of every shard and elect one copy to lead writes.
          Sharding answers “where does this key live?” Replication answers “what if that machine disappears?”
        </p>
      </div>

      <MemoryTip>Shard for capacity. Replicate for survival. Elect for one safe writer.</MemoryTip>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">First, fix the mental model</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Replicas are not extra machines attached to each node—the nodes are the replicas of that shard.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Shard A · one logical slice</h3>
                <p className="mt-0.5 text-xs text-slate-500">All three nodes contain copies of the same Shard A data</p>
              </div>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">3 nodes total</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-center dark:border-rose-800 dark:bg-rose-950/30">
                <div className="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">A1</div>
                <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Leader replica</div>
                <div className="mt-1 text-[11px] text-slate-500">writes + strict reads</div>
              </div>
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-center dark:border-sky-800 dark:bg-sky-950/30">
                <div className="font-mono text-sm font-bold text-sky-700 dark:text-sky-300">A2</div>
                <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Follower replica</div>
                <div className="mt-1 text-[11px] text-slate-500">reads + failover</div>
              </div>
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-center dark:border-sky-800 dark:bg-sky-950/30">
                <div className="font-mono text-sm font-bold text-sky-700 dark:text-sky-300">A3</div>
                <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Follower replica</div>
                <div className="mt-1 text-[11px] text-slate-500">standby or reads</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              “3 nodes per shard” means <strong>1 leader replica + 2 follower replicas</strong>, not 3 primary nodes plus another set of replicas.
            </div>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/30">
            <h3 className="font-bold text-violet-900 dark:text-violet-200">How many voting nodes?</h3>
            <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">Choose simultaneous failures the shard must tolerate.</p>
            <div className="mt-3 flex gap-2" role="group" aria-label="Failure tolerance">
              {([0, 1, 2] as FailureTolerance[]).map(count => (
                <button
                  key={count}
                  onClick={() => setFailureTolerance(count)}
                  aria-pressed={failureTolerance === count}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${failureTolerance === count ? 'bg-violet-600 text-white' : 'border border-violet-200 bg-white text-violet-700 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300'}`}
                >
                  {count} failure{count === 1 ? '' : 's'}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-white p-4 text-center dark:bg-slate-900/70" aria-live="polite">
              <div className="font-mono text-sm text-slate-500">2f + 1 = 2({failureTolerance}) + 1</div>
              <div className="mt-1 text-3xl font-black text-violet-700 dark:text-violet-300">{votingNodes} node{votingNodes === 1 ? '' : 's'} / shard</div>
              <div className="mt-1 text-xs text-slate-500">majority = {Math.floor(votingNodes / 2) + 1}</div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-violet-700 dark:text-violet-400">Extra non-voting read replicas can be added for traffic capacity without changing the election majority.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Failure & traffic-routing lab</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Change the failure and follow both the data role and the request path.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Failure scenario">
          {(Object.keys(SCENARIOS) as Scenario[]).map(key => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              aria-pressed={scenario === key}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${scenario === key ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
            >
              {key === 'healthy' ? 'Healthy' : key === 'replica-down' ? 'Replica fails' : key === 'leader-down' ? 'Leader fails' : 'Network partition'}
            </button>
          ))}
        </div>

        <div className="viz-container p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[180px_1fr] lg:items-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/60">
              <div className="text-xl">👤</div>
              <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">Client / API</div>
              <div className="mt-1 text-xs text-slate-500">user_id = 42</div>
              <div className="my-2 text-slate-400 lg:hidden">↓</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[160px_1fr] lg:items-center">
              <div className="relative rounded-xl border border-violet-300 bg-violet-50 p-4 text-center dark:border-violet-800 dark:bg-violet-950/30">
                <div className="text-sm font-bold text-violet-800 dark:text-violet-300">Shard router</div>
                <div className="mt-1 font-mono text-xs text-violet-600 dark:text-violet-400">hash(42) → A</div>
              </div>
              <div className="space-y-3">
                <ReplicaGroup title="Shard A" range="users 0–49 · selected" nodes={shardANodes} />
                <ReplicaGroup title="Shard B" range="users 50–99" nodes={shardBNodes} quiet />
              </div>
            </div>
          </div>

          <div className={`mt-4 rounded-xl border p-4 ${data.tone}`} aria-live="polite">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{data.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{data.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">{data.availability}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{data.result}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg bg-white/70 p-3 text-xs text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"><strong>WRITE:</strong> {data.writePath}</div>
              <div className="rounded-lg bg-white/70 p-3 text-xs text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"><strong>READ:</strong> {data.readPath}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          {FAILOVER_STEPS[scenario].map((step, index) => (
            <div key={step} className="relative rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-indigo-500">Step {index + 1}</div>
              <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Node replacement simulation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Step through a replica failure to see how traffic continues while a new node is rebuilt.</p>
        </div>
        <div className="viz-container p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-indigo-500">Stage {replacementStep + 1} of {REPLACEMENT_STEPS.length}</div>
              <h3 className="mt-1 font-bold text-slate-900 dark:text-white" aria-live="polite">{replacement.title}</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReplacementStep(0)}
                disabled={replacementStep === 0}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setReplacementStep(step => Math.min(step + 1, REPLACEMENT_STEPS.length - 1))}
                disabled={replacementStep === REPLACEMENT_STEPS.length - 1}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-emerald-600"
              >
                {replacementStep === 0 ? 'Fail A3' : replacementStep === REPLACEMENT_STEPS.length - 1 ? 'Replacement complete' : 'Next step'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-center dark:border-rose-800 dark:bg-rose-950/30">
              <div className="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">A1</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">leader · writes</div>
            </div>
            <span className="text-slate-300 dark:text-slate-600">↔</span>
            <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-center dark:border-sky-800 dark:bg-sky-950/30">
              <div className="font-mono text-sm font-bold text-sky-700 dark:text-sky-300">A2</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">replica · reads</div>
            </div>
            <span className="text-slate-300 dark:text-slate-600">↔</span>
            <div className={`rounded-xl border p-3 text-center transition-all ${replacementStep === 1 ? 'border-slate-300 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-800' : replacementStep === REPLACEMENT_STEPS.length - 1 ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30' : 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30'}`}>
              <div className="font-mono text-sm font-bold text-violet-700 dark:text-violet-300">{replacement.node}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">{replacement.nodeState}</div>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`Replacement progress ${replacement.progress}%`}>
            <div className={`h-full rounded-full transition-all duration-500 ${replacementStep === REPLACEMENT_STEPS.length - 1 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${replacement.progress}%` }} />
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" aria-live="polite">{replacement.detail}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"><strong>Traffic:</strong> A2 absorbs eligible reads throughout the rebuild; A1 continues writes. A4 receives no client requests until caught up.</div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><strong>Total loss:</strong> if A1, A2, and A3 are all lost, recover from backup or a cross-region copy instead.</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">The four building blocks</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Each solves a different bottleneck or failure mode.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="Database concepts">
          {(Object.keys(TOPICS) as Topic[]).map(key => (
            <button
              key={key}
              role="tab"
              aria-selected={topic === key}
              onClick={() => setTopic(key)}
              className={`rounded-xl border p-3 text-left transition-colors ${topic === key ? 'border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40' : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{TOPICS[key].title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{TOPICS[key].question}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-violet-200 bg-white p-5 dark:border-violet-900 dark:bg-slate-900" role="tabpanel">
          <h3 className="text-base font-bold text-violet-800 dark:text-violet-300">{topicData.title}: {topicData.question}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{topicData.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topicData.points.map(point => (
              <div key={point.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{point.label}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{point.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <strong>Watch out:</strong> {topicData.warning}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Consistency is chosen per operation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Do not give every endpoint the strongest—or weakest—guarantee by default.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
              <tr><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Route</th><th className="px-4 py-3">Why</th><th className="px-4 py-3">Trade-off</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
              <tr><td className="px-4 py-3 font-medium">Create order / transfer money</td><td className="px-4 py-3">Leader</td><td className="px-4 py-3">Needs ordering and constraints</td><td className="px-4 py-3">Less write scale per shard</td></tr>
              <tr><td className="px-4 py-3 font-medium">Read balance / permission</td><td className="px-4 py-3">Leader or quorum</td><td className="px-4 py-3">Stale data can be unsafe</td><td className="px-4 py-3">Higher latency / leader load</td></tr>
              <tr><td className="px-4 py-3 font-medium">Product feed / search</td><td className="px-4 py-3">Nearest replica</td><td className="px-4 py-3">Small staleness is acceptable</td><td className="px-4 py-3">May miss a recent update</td></tr>
              <tr><td className="px-4 py-3 font-medium">User reads after own write</td><td className="px-4 py-3">Leader or caught-up replica</td><td className="px-4 py-3">Provides read-your-writes</td><td className="px-4 py-3">Temporary routing complexity</td></tr>
              <tr><td className="px-4 py-3 font-medium">Analytics / exports</td><td className="px-4 py-3">Dedicated replica / warehouse</td><td className="px-4 py-3">Isolates long, heavy scans</td><td className="px-4 py-3">Data is delayed</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
          <h3 className="font-bold text-sky-800 dark:text-sky-300">Quorum example: N=3, W=2, R=2</h3>
          <p className="mt-2 text-sm leading-relaxed text-sky-700 dark:text-sky-400">A write is acknowledged by 2 replicas and a read consults 2. Because W + R = 4 &gt; N = 3, the sets overlap at least once. Quorums trade latency and availability for stronger coordination; they do not remove the need for versioning and repair.</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Production design checklist</h3>
          <ul className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
            <li>• Spread replicas across failure domains.</li>
            <li>• Monitor lag, election count, hot shards, and rejected writes.</li>
            <li>• Make retries idempotent and use bounded timeouts.</li>
            <li>• Test leader loss, partitions, and restore from backup.</li>
            <li>• Document consistency per endpoint.</li>
          </ul>
        </div>
      </section>

      <DoubtsBlock doubts={DOUBTS} />
    </div>
  )
}
