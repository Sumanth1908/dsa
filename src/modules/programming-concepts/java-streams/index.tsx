import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

type Tab = 'pipeline' | 'infinite' | 'continuous' | 'framing'

// ── Tab 1 data ────────────────────────────────────────────────────────────────

type TxnState = 'waiting' | 'at-filter' | 'filtered-out' | 'at-map' | 'collected'

interface PipelineStep {
  txnState: TxnState[]
  collected: number[]
  terminalFired: boolean
  message: string
}

const TXNS = [
  { id: 'TX#1', cat: 'FOOD',   amt: 450  },
  { id: 'TX#2', cat: 'TRAVEL', amt: 1200 },
  { id: 'TX#3', cat: 'FOOD',   amt: 80   },
  { id: 'TX#4', cat: 'FOOD',   amt: 950  },
  { id: 'TX#5', cat: 'TRAVEL', amt: 30   },
]

const PIPELINE_STEPS: PipelineStep[] = [
  {
    txnState: ['waiting','waiting','waiting','waiting','waiting'],
    collected: [], terminalFired: false,
    message: 'Stream created from the list — NOTHING has run yet. The pipeline is just a description. Zero CPU used. This is lazy evaluation.',
  },
  {
    txnState: ['at-filter','waiting','waiting','waiting','waiting'],
    collected: [], terminalFired: false,
    message: 'TX#1 ($450 FOOD) enters filter. category == "FOOD" → TRUE ✓ — passes through.',
  },
  {
    txnState: ['at-map','waiting','waiting','waiting','waiting'],
    collected: [], terminalFired: false,
    message: 'TX#1 moves to map. $450 × 1.1 = $495.0. TX#2–5 have not moved — each item fully traverses the pipeline before the next one starts.',
  },
  {
    txnState: ['collected','at-filter','waiting','waiting','waiting'],
    collected: [495], terminalFired: false,
    message: 'TX#1 → collected [$495.0]. TX#2 ($1200 TRAVEL) hits filter. category == "TRAVEL" ≠ "FOOD" → FALSE ✗ — eliminated here. Never reaches map.',
  },
  {
    txnState: ['collected','filtered-out','at-filter','waiting','waiting'],
    collected: [495], terminalFired: false,
    message: 'TX#2 is gone. TX#3 ($80 FOOD) passes filter → map → $80 × 1.1 = $88.0 → collected.',
  },
  {
    txnState: ['collected','filtered-out','collected','at-filter','waiting'],
    collected: [495, 88], terminalFired: false,
    message: 'TX#4 ($950 FOOD) passes filter → $950 × 1.1 = $1045.0. TX#5 ($30 TRAVEL) entering filter.',
  },
  {
    txnState: ['collected','filtered-out','collected','collected','filtered-out'],
    collected: [495, 88, 1045], terminalFired: false,
    message: 'TX#4 collected. TX#5 ($30 TRAVEL) eliminated. All items processed in a single pass.',
  },
  {
    txnState: ['collected','filtered-out','collected','collected','filtered-out'],
    collected: [495, 88, 1045], terminalFired: true,
    message: 'collect() is the TERMINAL operation — this is what triggered all of the above. Result: [$495.0, $88.0, $1045.0]. The stream is consumed and cannot be reused.',
  },
]

// ── Tab 2 data ────────────────────────────────────────────────────────────────

type ReadingState = 'pending' | 'rejected' | 'accepted' | 'limit-hit'

interface InfiniteStep {
  readings: { value: number; state: ReadingState }[]
  limitCount: number
  stopped: boolean
  message: string
}

const INFINITE_STEPS: InfiniteStep[] = [
  {
    readings: [],
    limitCount: 0, stopped: false,
    message: 'Stream.generate(sensor::read) is ready — but has produced NOTHING. It will call the supplier on demand, forever, until something stops it.',
  },
  {
    readings: [{ value: 22.1, state: 'rejected' }],
    limitCount: 0, stopped: false,
    message: '22.1°C generated. filter(t -> t > 23.0): 22.1 is NOT > 23.0 → rejected ✗. Generator is called again immediately.',
  },
  {
    readings: [{ value: 22.1, state: 'rejected' }, { value: 23.4, state: 'accepted' }],
    limitCount: 1, stopped: false,
    message: '23.4°C → passes filter ✓. limit() count: 1 / 3.',
  },
  {
    readings: [{ value: 22.1, state: 'rejected' }, { value: 23.4, state: 'accepted' }, { value: 21.8, state: 'rejected' }],
    limitCount: 1, stopped: false,
    message: '21.8°C → rejected ✗. limit() still 1 / 3.',
  },
  {
    readings: [
      { value: 22.1, state: 'rejected' }, { value: 23.4, state: 'accepted' },
      { value: 21.8, state: 'rejected' }, { value: 24.1, state: 'accepted' },
    ],
    limitCount: 2, stopped: false,
    message: '24.1°C → passes filter ✓. limit() count: 2 / 3.',
  },
  {
    readings: [
      { value: 22.1, state: 'rejected' }, { value: 23.4, state: 'accepted' },
      { value: 21.8, state: 'rejected' }, { value: 24.1, state: 'accepted' },
      { value: 22.7, state: 'rejected' },
    ],
    limitCount: 2, stopped: false,
    message: '22.7°C → rejected ✗.',
  },
  {
    readings: [
      { value: 22.1, state: 'rejected' }, { value: 23.4, state: 'accepted' },
      { value: 21.8, state: 'rejected' }, { value: 24.1, state: 'accepted' },
      { value: 22.7, state: 'rejected' }, { value: 25.0, state: 'limit-hit' },
    ],
    limitCount: 3, stopped: true,
    message: '25.0°C → passes filter ✓. limit() count: 3 / 3 → STOP. The generator is never called again. Result: [23.4, 24.1, 25.0]. Without limit(), this runs forever.',
  },
]

// ── Tab 3 data ────────────────────────────────────────────────────────────────

interface ContinuousStep {
  producerRate: number
  bufferPct: number
  backpressureActive: boolean
  signal: string | null
  message: string
}

const CONTINUOUS_STEPS: ContinuousStep[] = [
  {
    producerRate: 10000, bufferPct: 5,
    backpressureActive: false, signal: null,
    message: 'Kafka producer emits 10,000 events/sec. Consumer processes 1,000/sec. A 9,000/sec surplus starts filling the buffer. Java Streams cannot handle this — they need all data in memory upfront.',
  },
  {
    producerRate: 10000, bufferPct: 35,
    backpressureActive: false, signal: null,
    message: 'Buffer at 35% and rising fast. For continuous data we need Reactive Streams (Project Reactor / RxJava / Java 9 Flow API) — they have a built-in backpressure protocol.',
  },
  {
    producerRate: 10000, bufferPct: 72,
    backpressureActive: false, signal: null,
    message: 'Buffer at 72%. Without backpressure: overflow → OutOfMemoryError or silent data loss. Neither is acceptable.',
  },
  {
    producerRate: 10000, bufferPct: 88,
    backpressureActive: false, signal: '⚠ consumer → producer: "SLOW DOWN"',
    message: 'At 88% capacity the consumer sends a backpressure signal upstream. In Reactive Streams this is subscriber.request(n) — the subscriber controls how many items it is ready to receive.',
  },
  {
    producerRate: 1000, bufferPct: 88,
    backpressureActive: true, signal: 'Backpressure active',
    message: 'Producer throttles to 1,000/sec. Rates balanced — buffer stops growing. No crash, no data loss. The system stays stable under load.',
  },
  {
    producerRate: 1000, bufferPct: 48,
    backpressureActive: true, signal: 'Backpressure active',
    message: 'Buffer draining as consumer works through the backlog.',
  },
  {
    producerRate: 1000, bufferPct: 12,
    backpressureActive: false, signal: '✓ consumer → producer: "READY FOR MORE"',
    message: 'Buffer nearly empty. Consumer signals it can accept more data. This demand-driven, pull-based flow is the core of the Reactive Streams specification.',
  },
  {
    producerRate: 10000, bufferPct: 12,
    backpressureActive: false, signal: null,
    message: 'Producer ramps back up. The cycle repeats dynamically. Flux, Observable, and Flow.Publisher all implement this protocol so continuous data never crashes your app.',
  },
]

// ── Tab 4 data ────────────────────────────────────────────────────────────────
//
// The "framing" problem: a TCP stream is a raw byte flow with no message
// boundaries. The receiver must scan for delimiters and accumulate a buffer
// until a complete message is found.
//
// Network sends:  {id:1,event:order}\n{id:2,event:pay}\n{id:3,event:ref}\n
//
// TCP delivers it as three arbitrary chunks:
//   Chunk 1 (20 bytes): {id:1,event:order}\n{
//   Chunk 2 (20 bytes): id:2,event:pay}\n{id:3
//   Chunk 3 (12 bytes): ,event:ref}\n

interface FramingStep {
  // chars already in buffer before this step's chunk arrived
  leftover: string
  // bytes that just arrived in this step (null if no new chunk)
  arrived: string | null
  // label shown above the "arrived" chunk
  chunkLabel: string | null
  // index in the full buffer where \n was found (-1 = scanning / not yet found)
  delimPos: number
  // message being extracted (shown flying out to results column)
  extracting: string | null
  // messages fully processed so far
  complete: string[]
  message: string
}

// The three messages and how TCP actually delivers them
const FULL_STREAM = '{id:1,event:order}\n{id:2,event:pay}\n{id:3,event:ref}\n'
// chunk boundaries: 20 | 20 | 12
const CHUNK1 = '{id:1,event:order}\n{'         // 20 chars
const CHUNK2 = 'id:2,event:pay}\n{id:3'        // 20 chars
const CHUNK3 = ',event:ref}\n'                  // 12 chars

const MSG1 = '{id:1,event:order}'
const MSG2 = '{id:2,event:pay}'
const MSG3 = '{id:3,event:ref}'

const FRAMING_STEPS: FramingStep[] = [
  {
    leftover: '', arrived: null, chunkLabel: null,
    delimPos: -1, extracting: null, complete: [],
    message: 'The sender writes 3 complete events, each terminated with \\n. But TCP is a byte stream — it has zero concept of "messages". It will deliver these bytes in whatever chunks it pleases. The receiver must reconstruct boundaries from a formless river of bytes.',
  },
  {
    leftover: '', arrived: CHUNK1, chunkLabel: 'Chunk #1  (20 bytes)',
    delimPos: -1, extracting: null, complete: [],
    message: `Chunk #1 arrives — 20 raw bytes appended to the buffer. Notice it contains ALL of message 1 AND the opening brace of message 2. TCP split it here, not us. Scanner sweeps left-to-right looking for \\n...`,
  },
  {
    leftover: '', arrived: CHUNK1, chunkLabel: 'Chunk #1  (20 bytes)',
    delimPos: 18, extracting: null, complete: [],
    message: '\\n found at index 18! Everything to the LEFT of it is a complete message. Everything to the RIGHT stays in the buffer as leftover. Extracting...',
  },
  {
    leftover: '{', arrived: null, chunkLabel: null,
    delimPos: -1, extracting: MSG1, complete: [],
    message: `Message 1 extracted: "${MSG1}". The lone "{" after the \\n stays in the buffer — it is the beginning of message 2. We cannot process it yet because it is incomplete.`,
  },
  {
    leftover: '{', arrived: CHUNK2, chunkLabel: 'Chunk #2  (20 bytes)',
    delimPos: -1, extracting: null, complete: [MSG1],
    message: `Chunk #2 arrives — 20 bytes. Combined with the leftover "{", the buffer is now "${'{' + CHUNK2}". Scanner finds \\n...`,
  },
  {
    leftover: '{', arrived: CHUNK2, chunkLabel: 'Chunk #2  (20 bytes)',
    delimPos: 15 + 1, extracting: null, complete: [MSG1],
    message: '\\n found. Message 2 complete. Leftover after extraction: "{id:3" — the start of message 3.',
  },
  {
    leftover: '{id:3', arrived: null, chunkLabel: null,
    delimPos: -1, extracting: MSG2, complete: [MSG1],
    message: `Message 2 extracted: "${MSG2}". Buffer holds 5-byte fragment "{id:3". Waiting for more data...`,
  },
  {
    leftover: '{id:3', arrived: CHUNK3, chunkLabel: 'Chunk #3  (12 bytes)',
    delimPos: -1, extracting: null, complete: [MSG1, MSG2],
    message: `Chunk #3 arrives — 12 bytes. Buffer is now "${'{id:3' + CHUNK3}". \\n found immediately!`,
  },
  {
    leftover: '', arrived: null, chunkLabel: null,
    delimPos: -1, extracting: MSG3, complete: [MSG1, MSG2],
    message: `Message 3 extracted: "${MSG3}". Buffer is now empty. ✓ All 3 complete messages reassembled from 3 arbitrary TCP chunks. This buffer-and-scan loop is the universal solution to the stream framing problem.`,
  },
  {
    leftover: '', arrived: null, chunkLabel: null,
    delimPos: -1, extracting: null, complete: [MSG1, MSG2, MSG3],
    message: 'Done. The key insight: chunk boundaries are irrelevant. You always buffer incoming bytes and scan for your delimiter. Your message boundaries emerge from the data, not from how the network chose to split it.',
  },
]

// ── Code examples ─────────────────────────────────────────────────────────────

const CODE_EXAMPLES = [
  {
    lang: 'java' as const, label: 'Java',
    code: `// ── JAVA STREAMS: lazy pipeline on in-memory data ───────────────────
List<Transaction> txns = List.of(
    new Transaction("FOOD",   450.0),
    new Transaction("TRAVEL", 1200.0),
    new Transaction("FOOD",   80.0)
);

// Nothing executes until collect() — fully lazy
List<Double> result = txns.stream()
    .filter(t -> t.category().equals("FOOD"))   // intermediate (lazy)
    .map(t -> t.amount() * 1.1)                  // intermediate (lazy)
    .sorted()                                     // intermediate (lazy)
    .collect(Collectors.toList());               // TERMINAL → triggers all

// ── INFINITE STREAMS ─────────────────────────────────────────────────
// Stream.generate: calls supplier on demand, infinitely
List<Double> hotReadings = Stream.generate(sensor::read)
    .filter(temp -> temp > 23.0)
    .limit(3)                              // stop after 3 matches
    .collect(Collectors.toList());

// Stream.iterate: stateful, like a for-loop
List<Integer> first10 = Stream.iterate(0, n -> n + 1)
    .limit(10)
    .collect(Collectors.toList());         // [0,1,2,3,4,5,6,7,8,9]

// ── PARALLEL STREAMS ─────────────────────────────────────────────────
long count = txns.parallelStream()        // uses ForkJoinPool
    .filter(t -> t.amount() > 100)
    .count();                             // order not guaranteed

// ── REACTIVE STREAMS: continuous data with backpressure ──────────────
// Project Reactor — used by Spring WebFlux
Flux<SensorReading> readings = Flux
    .interval(Duration.ofMillis(100))            // emit every 100ms forever
    .map(tick -> sensor.read())
    .filter(r -> r.temperature() > 23.0)
    .bufferTimeout(100, Duration.ofSeconds(1))   // batch by count OR time
    .flatMap(batch -> persistBatch(batch));       // non-blocking

// Subscriber controls the rate — this IS backpressure
readings.subscribe(new BaseSubscriber<>() {
    protected void hookOnSubscribe(Subscription s) {
        request(10);        // "send me 10 to start"
    }
    protected void hookOnNext(List<SensorReading> batch) {
        process(batch);
        request(10);        // "ready for 10 more"
    }
});

// ── JAVA 9 FLOW API (standard, no extra dependency) ──────────────────
SubmissionPublisher<String> publisher = new SubmissionPublisher<>();
publisher.subscribe(new Flow.Subscriber<>() {
    private Flow.Subscription sub;
    public void onSubscribe(Flow.Subscription s) { sub=s; s.request(1); }
    public void onNext(String item) { process(item); sub.request(1); }
    public void onError(Throwable t) { t.printStackTrace(); }
    public void onComplete() { System.out.println("Done"); }
});
publisher.submit("event-1");
publisher.submit("event-2");`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# ── STREAM-LIKE PIPELINE: generator chains are lazy ─────────────────
transactions = [
    {"category": "FOOD",   "amount": 450.0},
    {"category": "TRAVEL", "amount": 1200.0},
    {"category": "FOOD",   "amount": 80.0},
]

# Nothing runs until list() — each step is a lazy generator
food   = (t for t in transactions if t["category"] == "FOOD")
taxed  = (t["amount"] * 1.1 for t in food)
result = list(taxed)    # triggers execution, like collect()
# [495.0, 88.0]

# ── INFINITE STREAMS ─────────────────────────────────────────────────
from itertools import islice, count

ids       = count(1)                    # 1, 2, 3 ... (never stops)
first_10  = list(islice(ids, 10))       # limit(10) equivalent

def sensor_stream():
    while True:
        yield read_sensor()             # infinite, lazy

hot = list(islice(
    (t for t in sensor_stream() if t > 23.0),
    3                                   # stop after 3 matches
))

# ── CONTINUOUS DATA: async generators ────────────────────────────────
import asyncio, aiohttp, json

async def kafka_events(url):
    async with aiohttp.ClientSession() as s:
        async with s.get(url) as resp:
            async for line in resp.content:     # never ends
                yield json.loads(line)

async def process():
    async for event in kafka_events("/api/stream"):
        if event["temp"] > 23.0:
            await save_to_db(event)
        # await naturally throttles — async is cooperative,
        # so the producer can't outrun the consumer

asyncio.run(process())`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// ── ARRAY METHODS: same mental model as Java Streams ────────────────
const txns = [
  { category: "FOOD",   amount: 450  },
  { category: "TRAVEL", amount: 1200 },
  { category: "FOOD",   amount: 80   },
]

// filter/map are eager (not lazy) but the shape is identical
const result = txns
  .filter(t => t.category === "FOOD")
  .map(t => t.amount * 1.1)
  .sort((a, b) => a - b)
// [88.0, 495.0]

// ── INFINITE STREAMS ─────────────────────────────────────────────────
function* idGenerator() {
  let i = 1
  while (true) yield i++           // infinite: 1, 2, 3 ...
}

function take(gen, n) {
  const out = []
  for (const val of gen) {
    out.push(val)
    if (out.length >= n) break      // short-circuit like limit()
  }
  return out
}
take(idGenerator(), 5)              // [1, 2, 3, 4, 5]

// ── CONTINUOUS DATA: Fetch ReadableStream ────────────────────────────
const resp   = await fetch('/api/sensor-stream')
const reader = resp.body.getReader()

async function* readChunks(reader) {
  const dec = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield dec.decode(value)         // one chunk as it arrives
  }
}

for await (const chunk of readChunks(reader)) {
  const event = JSON.parse(chunk)
  if (event.temperature > 23.0) await saveReading(event)
}

// ── RXJS: backpressure via operators ─────────────────────────────────
import { interval } from 'rxjs'
import { map, filter, throttleTime, bufferTime } from 'rxjs/operators'

interval(100).pipe(                 // emit every 100ms forever
  map(() => ({ temp: readSensor() })),
  filter(r => r.temp > 23.0),
  throttleTime(500),                // max 2/sec — backpressure
  bufferTime(1000),                 // collect into 1-second batches
).subscribe(batch => saveBatch(batch))`,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function JavaStreamsVisualizer() {
  const [tab, setTab] = useState<Tab>('pipeline')

  const pipeCtrl = useSteps(PIPELINE_STEPS.length)
  const infCtrl  = useSteps(INFINITE_STEPS.length)
  const conCtrl  = useSteps(CONTINUOUS_STEPS.length)
  const frmCtrl  = useSteps(FRAMING_STEPS.length)

  const pCur = PIPELINE_STEPS[pipeCtrl.step]
  const iCur = INFINITE_STEPS[infCtrl.step]
  const cCur = CONTINUOUS_STEPS[conCtrl.step]
  const fCur = FRAMING_STEPS[frmCtrl.step]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pipeline',   label: '1 — Stream Pipeline'    },
    { id: 'infinite',   label: '2 — Infinite Streams'   },
    { id: 'continuous', label: '3 — Continuous Data'    },
    { id: 'framing',    label: '4 — Stream Framing'     },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Java Streams & Continuous Data</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Lazy pipelines → infinite generators → reactive backpressure → stream framing (how to split a boundaryless byte flow)
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Stream Pipeline ── */}
      <div className={tab !== 'pipeline' ? 'hidden' : 'space-y-4'}>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">The Key Idea</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Java Streams are <strong>not data structures</strong> — they are <em>lazy pipelines</em>.
            You chain operations (<code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">filter</code>,{' '}
            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">map</code>, etc.) to describe what to do,
            but <strong>nothing runs until you call a terminal operation</strong> like{' '}
            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">collect()</code>.
            Think of it as an assembly line blueprint — it only activates when the factory starts.
          </p>
        </div>

        <div className="viz-container p-5 space-y-5">
          {/* Lazy indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
              pCur.terminalFired
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {pCur.terminalFired ? '▶ EXECUTING — terminal op called' : '⏸ LAZY — not executing yet'}
            </span>
            {pCur.collected.length > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                collected so far: [{pCur.collected.map(n => `$${n}`).join(', ')}]
              </span>
            )}
          </div>

          {/* Pipeline layout */}
          <div className="space-y-3">
            {/* Source row */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Source (list)</div>
              <div className="flex gap-2 flex-wrap">
                {TXNS.map((tx, i) => {
                  const state = pCur.txnState[i]
                  return (
                    <div key={tx.id} className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border-2 transition-all duration-300 ${
                      state === 'waiting'     ? 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800' :
                      state === 'at-filter'   ? 'border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 scale-105 shadow-md' :
                      state === 'at-map'      ? 'border-sky-400 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 scale-105 shadow-md' :
                      state === 'filtered-out'? 'border-rose-200 dark:border-rose-900 text-rose-400 dark:text-rose-600 bg-rose-50 dark:bg-rose-950/20 line-through opacity-50' :
                                                'border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}>
                      {tx.id} ${tx.amt} <span className={`ml-1 text-[9px] ${tx.cat === 'FOOD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{tx.cat}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <div className="w-4 h-4 flex items-center justify-center">↓</div>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Pipeline stages */}
            <div className="grid grid-cols-3 gap-3">
              {/* filter */}
              <div className={`rounded-xl border-2 p-3 transition-all duration-300 ${
                pCur.txnState.some(s => s === 'at-filter')
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Intermediate</div>
                <div className="font-mono text-xs text-sky-600 dark:text-sky-400">.filter(...)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">category == "FOOD"</div>
                <div className="text-[10px] text-rose-500 mt-0.5">removes TRAVEL ✗</div>
              </div>
              {/* map */}
              <div className={`rounded-xl border-2 p-3 transition-all duration-300 ${
                pCur.txnState.some(s => s === 'at-map')
                  ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Intermediate</div>
                <div className="font-mono text-xs text-sky-600 dark:text-sky-400">.map(...)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">amount × 1.1</div>
                <div className="text-[10px] text-sky-500 mt-0.5">transforms value</div>
              </div>
              {/* collect */}
              <div className={`rounded-xl border-2 p-3 transition-all duration-300 ${
                pCur.terminalFired
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Terminal ← triggers all</div>
                <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400">.collect(...)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">builds result list</div>
                {pCur.terminalFired && (
                  <div className="text-[10px] text-emerald-500 font-bold mt-0.5">FIRED ✓</div>
                )}
              </div>
            </div>

            {/* Result box */}
            {pCur.collected.length > 0 && (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Result List</div>
                <div className="flex gap-2 flex-wrap">
                  {pCur.collected.map((v, i) => (
                    <span key={i} className="font-mono text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded">
                      ${v.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step message */}
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5">
            {pCur.message}
          </div>
        </div>

        <StepControls ctrl={pipeCtrl} />

        {/* Quick reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Intermediate ops (lazy)</div>
            <div className="space-y-1 text-slate-500 dark:text-slate-400 font-mono">
              <div><span className="text-sky-500">filter</span>(pred)  — keep matching items</div>
              <div><span className="text-sky-500">map</span>(fn)       — transform each item</div>
              <div><span className="text-sky-500">flatMap</span>(fn)   — map + flatten one level</div>
              <div><span className="text-sky-500">sorted</span>()      — natural order sort</div>
              <div><span className="text-sky-500">distinct</span>()    — remove duplicates</div>
              <div><span className="text-sky-500">limit</span>(n)      — take first n items</div>
              <div><span className="text-sky-500">skip</span>(n)       — skip first n items</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Terminal ops (trigger execution)</div>
            <div className="space-y-1 text-slate-500 dark:text-slate-400 font-mono">
              <div><span className="text-emerald-500">collect</span>(toList())  — build a List</div>
              <div><span className="text-emerald-500">count</span>()            — count items</div>
              <div><span className="text-emerald-500">reduce</span>(0, Integer::sum)</div>
              <div><span className="text-emerald-500">findFirst</span>()        — first match (Optional)</div>
              <div><span className="text-emerald-500">anyMatch</span>(pred)     — short-circuits</div>
              <div><span className="text-emerald-500">forEach</span>(fn)        — consume each</div>
              <div><span className="text-emerald-500">toArray</span>()          — build array</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 2: Infinite Streams ── */}
      <div className={tab !== 'infinite' ? 'hidden' : 'space-y-4'}>
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
          <h3 className="font-semibold text-sky-800 dark:text-sky-300 mb-1">What if data never ends?</h3>
          <p className="text-sm text-sky-700 dark:text-sky-400">
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-xs">Stream.generate()</code> calls a supplier on demand, forever.{' '}
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-xs">Stream.iterate()</code> is like a stateful for-loop.
            Because streams are lazy, infinite sources are fine — you just need{' '}
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-xs">limit(n)</code> or a short-circuiting terminal op
            (<code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-xs">findFirst</code>,{' '}
            <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded text-xs">anyMatch</code>) to stop it.
          </p>
        </div>

        <div className="viz-container p-5 space-y-4">
          {/* Pipeline label */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">Stream.generate(sensor::read)</span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">.filter(t → t &gt; 23.0)</span>
            <span>→</span>
            <span className={`px-2 py-1 rounded transition-colors ${
              iCur.stopped
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}>.limit(3)</span>
            <span>→</span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">.collect(...)</span>
          </div>

          {/* limit progress */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">limit progress:</span>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  iCur.limitCount > i
                    ? 'border-emerald-400 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-300 dark:border-slate-600 text-slate-400'
                }`}>
                  {iCur.limitCount > i ? '✓' : i+1}
                </div>
              ))}
            </div>
            {iCur.stopped && (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">STOPPED — generator never called again</span>
            )}
          </div>

          {/* Readings */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">
              Sensor readings (generated on demand)
            </div>
            <div className="space-y-1.5">
              {iCur.readings.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 ${
                  r.state === 'accepted'  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20' :
                  r.state === 'rejected'  ? 'border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/10 opacity-60' :
                  r.state === 'limit-hit' ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-400' :
                                            'border-slate-200 dark:border-slate-700'
                }`}>
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 w-14">{r.value}°C</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.state === 'accepted' || r.state === 'limit-hit'
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400'
                  }`}>
                    {r.state === 'rejected'  ? 'filter ✗ (≤23.0)' :
                     r.state === 'accepted'  ? 'filter ✓ → collected' :
                     r.state === 'limit-hit' ? 'filter ✓ → limit hit! STOP' : ''}
                  </span>
                  {r.state === 'accepted' || r.state === 'limit-hit' ? (
                    <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-mono">{r.value}°C in result</span>
                  ) : null}
                </div>
              ))}
              {iCur.readings.length === 0 && (
                <div className="text-sm text-slate-400 italic px-3">No readings yet — generator is waiting for demand</div>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5">
            {iCur.message}
          </div>
        </div>

        <StepControls ctrl={infCtrl} />

        {/* generate vs iterate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">Stream.generate(supplier)</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>• Calls supplier with no args each time</div>
              <div>• Stateless (supplier doesn't know its position)</div>
              <div>• Good for: random values, sensor reads, UUIDs</div>
              <div className="font-mono bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 mt-2">
                Stream.generate(Math::random)
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">Stream.iterate(seed, fn)</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div>• Starts from seed, applies fn to get next value</div>
              <div>• Stateful — each value depends on the previous</div>
              <div>• Good for: counters, sequences, date ranges</div>
              <div className="font-mono bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 mt-2">
                Stream.iterate(0, n → n + 1)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 3: Continuous Data ── */}
      <div className={tab !== 'continuous' ? 'hidden' : 'space-y-4'}>
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
          <h3 className="font-semibold text-rose-800 dark:text-rose-300 mb-1">Java Streams are not enough for this</h3>
          <p className="text-sm text-rose-700 dark:text-rose-400">
            Java Streams still require data you already have. For truly continuous data — Kafka messages, IoT sensors,
            WebSocket events arriving at millions per second — you need <strong>Reactive Streams</strong> (Project Reactor /
            RxJava / Java 9 Flow API). The critical addition is <strong>backpressure</strong>: a protocol where the
            consumer tells the producer how fast it can go.
          </p>
        </div>

        <div className="viz-container p-5 space-y-5">
          {/* Signal banner */}
          {cCur.signal && (
            <div className={`text-center text-xs font-semibold px-3 py-1.5 rounded-full ${
              cCur.backpressureActive
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                : cCur.signal.includes('SLOW') || cCur.signal.includes('⚠')
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
            }`}>
              {cCur.signal}
            </div>
          )}

          {/* Producer → Buffer → Consumer diagram */}
          <div className="grid grid-cols-7 items-center gap-2">
            {/* Producer */}
            <div className={`col-span-2 rounded-xl border-2 p-3 text-center transition-all duration-500 ${
              cCur.backpressureActive
                ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30'
                : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
            }`}>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Producer</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Kafka / WebSocket</div>
              <div className={`text-lg font-bold mt-1 transition-colors ${
                cCur.backpressureActive ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {cCur.producerRate.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">events/sec</div>
            </div>

            {/* Arrow right */}
            <div className="text-center text-slate-400 text-lg">→</div>

            {/* Buffer */}
            <div className="col-span-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 p-3 text-center">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Buffer</div>
              <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-lg ${
                    cCur.bufferPct > 80 ? 'bg-rose-400 dark:bg-rose-600' :
                    cCur.bufferPct > 50 ? 'bg-amber-400 dark:bg-amber-600' :
                                          'bg-emerald-400 dark:bg-emerald-600'
                  }`}
                  style={{ height: `${cCur.bufferPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-bold ${cCur.bufferPct > 60 ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {cCur.bufferPct}%
                  </span>
                </div>
              </div>
              {cCur.bufferPct > 80 && (
                <div className="text-[10px] text-rose-500 font-semibold mt-1">DANGER ZONE</div>
              )}
            </div>

            {/* Arrow right */}
            <div className="text-center text-slate-400 text-lg">→</div>

            {/* Consumer */}
            <div className="col-span-1 rounded-xl border-2 border-violet-400 bg-violet-50 dark:bg-violet-950/30 p-3 text-center">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Consumer</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Your app</div>
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400 mt-1">1,000</div>
              <div className="text-[10px] text-slate-400">events/sec</div>
            </div>
          </div>

          {/* Backpressure indicator */}
          <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-all ${
            cCur.backpressureActive
              ? 'bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400'
              : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${cCur.backpressureActive ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'}`} />
            Backpressure: {cCur.backpressureActive ? 'ACTIVE — consumer is rate-limiting the producer' : 'inactive'}
          </div>

          {/* Message */}
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5">
            {cCur.message}
          </div>
        </div>

        <StepControls ctrl={conCtrl} />

        {/* Comparison table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="p-3 border-r border-slate-200 dark:border-slate-700">Concern</div>
            <div className="p-3 border-r border-slate-200 dark:border-slate-700">Java Streams</div>
            <div className="p-3">Reactive (Flux / Flow)</div>
          </div>
          {[
            ['Data source',    'In-memory collection',       'Anything — DB, Kafka, HTTP, time'],
            ['Data volume',    'Known, finite',               'Unknown, potentially infinite'],
            ['Backpressure',   'N/A — all in memory',        'Built-in (request(n) protocol)'],
            ['Threading',      'Sequential or parallel()',    'Non-blocking, schedulers'],
            ['Error handling', 'try / catch',                 '.onErrorResume() operator'],
            ['Reusable?',      'No — consumed once',         'Yes — subscribe multiple times'],
          ].map(([concern, streams, reactive]) => (
            <div key={concern} className="grid grid-cols-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              <div className="p-3 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">{concern}</div>
              <div className="p-3 border-r border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">{streams}</div>
              <div className="p-3 text-slate-500 dark:text-slate-400">{reactive}</div>
            </div>
          ))}
        </div>

        {/* Mental model */}
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4">
          <div className="font-semibold text-violet-800 dark:text-violet-300 text-sm mb-2">The Mental Model</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="font-mono bg-white dark:bg-slate-900 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
              <div className="text-violet-600 dark:text-violet-400 font-semibold mb-1">Java Streams</div>
              <div className="text-slate-500 dark:text-slate-400">Assembly line on a finite batch.</div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">All boxes arrive first.</div>
              <div className="text-slate-500 dark:text-slate-400">Then you process them.</div>
            </div>
            <div className="font-mono bg-white dark:bg-slate-900 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
              <div className="text-violet-600 dark:text-violet-400 font-semibold mb-1">Reactive / Flux</div>
              <div className="text-slate-500 dark:text-slate-400">Conveyor belt that never stops.</div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">+ a speed dial the worker controls.</div>
              <div className="text-slate-500 dark:text-slate-400">Worker says "send me 10 more."</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 4: Stream Framing ── */}
      <div className={tab !== 'framing' ? 'hidden' : 'space-y-4'}>
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <h3 className="font-semibold text-violet-800 dark:text-violet-300 mb-1">The chunking problem</h3>
          <p className="text-sm text-violet-700 dark:text-violet-400">
            TCP delivers a <em>byte stream</em> — it has no awareness of your messages.
            One <code className="bg-violet-100 dark:bg-violet-900 px-1 rounded text-xs">read()</code> call
            might give you half a message, or two and a half messages.
            The receiver must <strong>buffer incoming bytes and scan for a delimiter</strong> to know where each
            message ends. This is called <strong>framing</strong> (or message delimiting).
          </p>
        </div>

        <div className="viz-container p-5 space-y-4">
          {/* Three-column layout: Wire | Buffer | Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Left: Network wire / arriving chunk */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Network (TCP wire)</div>

              {/* Full stream label */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1">Full byte stream sent:</div>
                <div className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 rounded p-2 text-slate-500 dark:text-slate-400 break-all leading-5">
                  {FULL_STREAM.split('').map((ch, i) => (
                    <span key={i} className={ch === '\n' ? 'text-amber-500 font-bold' : ''}>{ch === '\n' ? '↵' : ch}</span>
                  ))}
                </div>
              </div>

              {/* Chunk that just arrived */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {fCur.chunkLabel ? `Just arrived — ${fCur.chunkLabel}:` : 'No new chunk this step'}
                </div>
                {fCur.arrived ? (
                  <div className="font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded p-2 text-emerald-700 dark:text-emerald-400 break-all leading-5">
                    {fCur.arrived.split('').map((ch, i) => (
                      <span key={i} className={ch === '\n' ? 'text-amber-500 font-bold' : ''}>{ch === '\n' ? '↵' : ch}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic px-2">—</div>
                )}
              </div>

              {/* Step counter */}
              <div className="text-[10px] text-slate-400">
                Step {frmCtrl.step + 1} / {FRAMING_STEPS.length}
              </div>
            </div>

            {/* Middle: Buffer */}
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Buffer (accumulator)</div>

              {/* Buffer contents */}
              <div className="min-h-[60px] font-mono text-[11px] bg-slate-900 rounded-lg p-3 leading-6 break-all">
                {(fCur.leftover + (fCur.arrived ?? '')).length === 0 ? (
                  <span className="text-slate-600 italic">empty</span>
                ) : (
                  <>
                    {/* leftover chars */}
                    {fCur.leftover.split('').map((ch, i) => {
                      const inExtraction = fCur.extracting !== null && i < fCur.leftover.length
                      const isDelim = ch === '\n'
                      return (
                        <span key={`l${i}`} className={
                          isDelim
                            ? 'text-amber-400 font-bold'
                            : inExtraction
                            ? 'text-slate-500'
                            : 'text-slate-400'
                        }>{isDelim ? '↵' : ch}</span>
                      )
                    })}
                    {/* newly arrived chars */}
                    {fCur.arrived && fCur.arrived.split('').map((ch, i) => {
                      const bufPos = fCur.leftover.length + i
                      const isDelim = ch === '\n'
                      const atDelim = fCur.delimPos === bufPos
                      return (
                        <span key={`a${i}`} className={
                          atDelim
                            ? 'text-amber-400 font-bold bg-amber-500/20 rounded px-0.5'
                            : isDelim
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400'
                        }>{isDelim ? '↵' : ch}</span>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Legend */}
              <div className="flex gap-3 flex-wrap text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400 inline-block" />leftover</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" />new bytes</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block" />delimiter ↵</span>
              </div>

              {/* Delimiter status */}
              {fCur.delimPos >= 0 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                  \\n found at index {fCur.delimPos} → extracting complete message
                </div>
              )}

              {/* Extracting animation */}
              {fCur.extracting && (
                <div className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded px-2 py-1.5 text-emerald-700 dark:text-emerald-400">
                  ✓ extracted: {fCur.extracting}
                </div>
              )}
            </div>

            {/* Right: Complete messages */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Processed messages ({fCur.complete.length} / 3)
              </div>
              {fCur.complete.length === 0 ? (
                <div className="text-[10px] text-slate-400 italic">none yet</div>
              ) : (
                <div className="space-y-2">
                  {fCur.complete.map((msg, i) => (
                    <div key={i} className="font-mono text-[10px] px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 break-all leading-5">
                      ✓ {msg}
                    </div>
                  ))}
                </div>
              )}
              {fCur.complete.length === 3 && (
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  All 3 messages reassembled ✓
                </div>
              )}
            </div>
          </div>

          {/* Step message */}
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5">
            {fCur.message}
          </div>
        </div>

        <StepControls ctrl={frmCtrl} />

        {/* Three framing strategies */}
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">The 3 universal framing strategies</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="font-semibold text-amber-800 dark:text-amber-300 text-xs mb-2">1. Delimiter-based</div>
              <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 mb-2 bg-white dark:bg-slate-900 rounded p-2">
                msg1\n msg2\n msg3\n
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                <div>Scan for <code>\n</code>, <code>\0</code>, or custom token</div>
                <div className="text-emerald-600 dark:text-emerald-400">✓ Simple, human-readable</div>
                <div className="text-rose-500">✗ Content must not contain delimiter</div>
                <div className="text-slate-400 mt-1">Used by: Redis, HTTP headers, NDJSON</div>
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/20 p-4">
              <div className="font-semibold text-sky-800 dark:text-sky-300 text-xs mb-2">2. Length-prefix</div>
              <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 mb-2 bg-white dark:bg-slate-900 rounded p-2 break-all">
                <span className="text-sky-500">[0x00,0x00,0x00,0x12]</span>msg_body_here
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                <div>First 4 bytes = uint32 length of what follows</div>
                <div className="text-emerald-600 dark:text-emerald-400">✓ Works with any content (binary safe)</div>
                <div className="text-rose-500">✗ Must know size before sending</div>
                <div className="text-slate-400 mt-1">Used by: gRPC, Kafka, database wire protocols</div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4">
              <div className="font-semibold text-violet-800 dark:text-violet-300 text-xs mb-2">3. Self-describing format</div>
              <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 mb-2 bg-white dark:bg-slate-900 rounded p-2">
                <span className="text-violet-500">{'{'}</span>...<span className="text-violet-500">{'}'}</span><span className="text-violet-500">{'{'}</span>...<span className="text-violet-500">{'}'}</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                <div>Count balanced <code>{'{}'}</code> / <code>{'[]'}</code> brackets</div>
                <div className="text-emerald-600 dark:text-emerald-400">✓ No extra framing layer needed</div>
                <div className="text-rose-500">✗ Must parse incrementally (more CPU)</div>
                <div className="text-slate-400 mt-1">Used by: JSON streams, XML, Netty's JsonObjectDecoder</div>
              </div>
            </div>
          </div>
        </div>

        {/* Code pattern */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-900 px-4 py-2 text-[10px] text-slate-400 font-mono border-b border-slate-800">
            The universal buffer-and-scan loop (delimiter strategy)
          </div>
          <div className="overflow-x-auto">
            <pre className="font-mono text-[11px] text-slate-300 p-4 leading-5 whitespace-pre overflow-x-auto">{`// Java (Netty / raw NIO)
public class FrameDecoder {
    private final ByteBuf buffer = Unpooled.buffer();

    public List<String> onBytesReceived(byte[] chunk) {
        buffer.writeBytes(chunk);                  // 1. append to accumulator
        List<String> messages = new ArrayList<>();

        int delimIdx;
        while ((delimIdx = indexOf(buffer, '\\n')) >= 0) {  // 2. scan for \\n
            byte[] msgBytes = new byte[delimIdx];
            buffer.readBytes(msgBytes);            // 3. extract up to delimiter
            buffer.skipBytes(1);                   // 4. skip the \\n itself
            messages.add(new String(msgBytes));    // 5. process complete message
        }
        // Anything left in buffer is an incomplete message — wait for more bytes
        return messages;
    }
}

// Python (asyncio StreamReader does this for you)
async def read_messages(reader: asyncio.StreamReader):
    while True:
        line = await reader.readline()    # blocks until \\n — handles buffer internally
        if not line:
            break
        msg = json.loads(line.decode())
        process(msg)

// Node.js (readline wraps net.Socket the same way)
const rl = readline.createInterface({ input: socket })
rl.on('line', (line) => {              // fires once per complete \\n-delimited line
    const msg = JSON.parse(line)
    process(msg)
})`}</pre>
          </div>
        </div>
      </div>

      {/* Code block (always visible) */}
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
