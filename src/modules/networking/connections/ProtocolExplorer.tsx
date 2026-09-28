import { useState } from 'react'
import CodeTabs from '@/components/shared/CodeTabs'
import { CODE, DOUBTS, type ProtocolId } from './content'
import { Pills } from './ui'

interface Arrow { dir: 'right' | 'left'; label: string; color?: string }
interface Band { from: number; to: number; label: string }

interface Protocol {
  name: string
  story: string
  arrows: Arrow[]
  band?: Band
  divider?: { after: number; label: string }
  caption: string
  facts: [string, string][]
  first: { title: string; detail: string }[]
  again: { title: string; detail: string }[]
}

const S1 = '#8b5cf6'
const S3 = '#f59e0b'
const S5 = '#10b981'

const PROTOCOLS: Record<ProtocolId, Protocol> = {
  rest: {
    name: 'REST (HTTP)',
    story: 'Like texting a shop: every message is a complete question, and you get exactly one reply. The shop never texts you first.',
    arrows: [
      { dir: 'right', label: 'GET /products/123' },
      { dir: 'left', label: '200 OK  { product }' },
      { dir: 'right', label: 'GET /cart' },
      { dir: 'left', label: '200 OK  { cart }' },
      { dir: 'right', label: 'POST /orders' },
      { dir: 'left', label: '201 Created' },
    ],
    band: { from: 0, to: 5, label: 'one pooled keep-alive connection' },
    caption: 'The client always speaks first. One request → one response. Each request stands alone, so the next one could go to a different server.',
    facts: [
      ['Who can send first', 'Only the client. The server can only answer.'],
      ['Connection lifetime', 'Short exchanges over pooled, reused keep-alive connections.'],
      ['Message format', 'Usually JSON over HTTP/1.1, HTTP/2 or HTTP/3.'],
      ['Works from browsers', 'Yes, natively.'],
      ['Great for', 'Public APIs, CRUD, anything cacheable (CDNs, ETags), easy debugging with curl.'],
      ['Watch out for', 'Chains of dependent calls (each costs a round trip), no server push, chatty clients.'],
    ],
    first: [
      { title: 'Ask for a resource', detail: 'Your code calls fetch("/products/123"). The HTTP client handles connections for you.' },
      { title: 'Check the pool', detail: 'No open connection to this server yet.' },
      { title: 'Connect', detail: 'DNS → TCP handshake → TLS handshake. 2–3 round trips before the request leaves.' },
      { title: 'Send, receive, keep', detail: 'Request and response. After the body is read, the connection goes back to the pool instead of closing.' },
    ],
    again: [
      { title: 'Ask for another resource', detail: 'fetch("/products/456") using the same client.' },
      { title: 'Take an idle connection', detail: 'HTTP/1.1 takes an idle one from the pool. HTTP/2 adds a new stream to the existing connection, even if it is busy.' },
      { title: 'Send straight away', detail: 'No DNS, TCP or TLS. One round trip.' },
      { title: 'Still stateless', detail: 'The request carries its own context (product ID, auth token). Reusing the connection does not make the server remember anything.' },
    ],
  },
  grpc: {
    name: 'gRPC',
    story: 'Like an intercom line between two offices that stays on all day. Anyone can pick up and ask a question, and dozens of conversations can share the line at once.',
    arrows: [
      { dir: 'right', label: 'GetStock(123)  · stream 1', color: S1 },
      { dir: 'right', label: 'GetPrice(123)  · stream 3', color: S3 },
      { dir: 'left', label: 'Price: $20  · stream 3', color: S3 },
      { dir: 'left', label: 'Stock: 7  · stream 1', color: S1 },
      { dir: 'right', label: 'WatchOrders()  · stream 5', color: S5 },
      { dir: 'left', label: 'order shipped  · stream 5', color: S5 },
      { dir: 'left', label: 'order delivered  · stream 5', color: S5 },
    ],
    band: { from: 0, to: 6, label: 'one long-lived HTTP/2 connection (the channel)' },
    caption: 'Many calls share one connection at the same time. Each call is a numbered stream, so replies can come back in any order. Streaming calls (stream 5) keep sending messages.',
    facts: [
      ['Who can send first', 'The client starts each call. With streaming, both sides can then send many messages on that call.'],
      ['Connection lifetime', 'One long-lived HTTP/2 channel per target service, reused for every call.'],
      ['Message format', 'Binary Protocol Buffers. A .proto contract generates typed client and server code.'],
      ['Works from browsers', 'Not directly — needs gRPC-Web plus a proxy (e.g. Envoy).'],
      ['Great for', 'Service-to-service calls, high call volume, strict contracts across teams and languages, streaming.'],
      ['Watch out for', 'Load balancing (long-lived connections stick to one backend), harder to debug by hand, no HTTP caching.'],
    ],
    first: [
      { title: 'Create a channel and a stub', detail: 'At startup. The channel manages connections; the stub gives you methods like GetStock(). Creating them does not connect yet.' },
      { title: 'First call triggers the connection', detail: 'The channel resolves the address, opens TCP, does TLS, and sets up HTTP/2.' },
      { title: 'The call becomes a stream', detail: 'GetStock(123) travels as stream 1 on that connection.' },
      { title: 'Keep the channel', detail: 'The call finishes, the stream closes — the connection stays open for the next call.' },
    ],
    again: [
      { title: 'Call again on the same stub', detail: 'GetStock(456).' },
      { title: 'New stream, same connection', detail: 'No handshake. Hundreds of calls can be in flight at once on one connection.' },
      { title: 'Channel full?', detail: 'If the server’s stream limit is reached, calls wait. Deadlines stop them waiting forever.' },
      { title: 'Connection lost?', detail: 'The channel reconnects by itself. Calls in flight fail and need a (safe) retry.' },
    ],
  },
  websocket: {
    name: 'WebSocket',
    story: 'Like an open phone line: once connected, either person can speak whenever they want, without dialing again.',
    arrows: [
      { dir: 'right', label: 'GET /live  Upgrade: websocket' },
      { dir: 'left', label: '101 Switching Protocols' },
      { dir: 'right', label: 'join room “support”', color: S1 },
      { dir: 'left', label: 'Asha: “Hi!”', color: S5 },
      { dir: 'left', label: 'Asha is typing…', color: S5 },
      { dir: 'right', label: '“Hello, I need help”', color: S1 },
      { dir: 'left', label: 'delivered ✓', color: S5 },
    ],
    divider: { after: 1, label: 'same connection now speaks WebSocket' },
    caption: 'It starts as a normal HTTP request, then the same connection is “upgraded”. After that, either side sends small frames whenever it wants — no request/response pattern.',
    facts: [
      ['Who can send first', 'Either side, at any time.'],
      ['Connection lifetime', 'One long-lived connection per client, open for minutes or hours.'],
      ['Message format', 'Your own messages (JSON or binary) in small frames. You design the protocol.'],
      ['Works from browsers', 'Yes, natively.'],
      ['Great for', 'Chat, collaborative editing, multiplayer, trading screens — fast messages both ways.'],
      ['Watch out for', 'Capacity = concurrent connections; users pinned to one server; reconnect and resync; no HTTP caching or standard errors.'],
    ],
    first: [
      { title: 'Open the socket', detail: 'new WebSocket("wss://chat.example/live"). It starts in CONNECTING — wait for “open” before sending.' },
      { title: 'Connect', detail: 'DNS → TCP → TLS, like any HTTPS request.' },
      { title: 'Upgrade', detail: 'The browser sends an HTTP request asking to switch protocols. The server answers 101 Switching Protocols.' },
      { title: 'Talk', detail: 'The “open” event fires. Both sides can now send messages freely.' },
    ],
    again: [
      { title: 'Keep the same socket', detail: 'Every message uses the already-open connection.' },
      { title: 'No per-message cost', detail: 'No handshake, no HTTP headers — just a few bytes of framing per message.' },
      { title: 'Server pushes too', detail: 'The server sends updates without being asked.' },
      { title: 'If it closes, start over', detail: 'Browsers do not reconnect automatically. Your code must reconnect, log in again, and resubscribe.' },
    ],
  },
  sse: {
    name: 'Server-Sent Events (SSE)',
    story: 'Like tuning into a radio station: you ask once, then the station keeps talking and you just listen.',
    arrows: [
      { dir: 'right', label: 'GET /live/scores  Accept: text/event-stream' },
      { dir: 'left', label: '200 OK  (response stays open)' },
      { dir: 'left', label: 'event: goal  (id 41)', color: S5 },
      { dir: 'left', label: 'event: score 2–1  (id 42)', color: S5 },
      { dir: 'left', label: 'event: full-time  (id 43)', color: S5 },
    ],
    band: { from: 1, to: 4, label: 'one HTTP response that never ends' },
    caption: 'One normal HTTP request, then the server keeps writing events into the response. If the client needs to send something, it makes a separate normal request.',
    facts: [
      ['Who can send first', 'Only the server pushes. Client actions go as normal HTTP requests.'],
      ['Connection lifetime', 'One long-lived HTTP response per client.'],
      ['Message format', 'Text events (“data: …”) with optional IDs.'],
      ['Works from browsers', 'Yes (EventSource), with automatic reconnect built in.'],
      ['Great for', 'Live feeds, notifications, progress bars, streaming AI answers — one-way push.'],
      ['Watch out for', 'One direction only; text only; ~6 connections per domain on HTTP/1.1 (use HTTP/2); proxies that buffer responses.'],
    ],
    first: [
      { title: 'Open an EventSource', detail: 'new EventSource("/live/scores").' },
      { title: 'A normal HTTPS request', detail: 'Uses an existing HTTP/2 connection if there is one; otherwise DNS → TCP → TLS.' },
      { title: 'The response never finishes', detail: 'The server replies with Content-Type: text/event-stream and keeps it open.' },
      { title: 'Events arrive as they happen', detail: 'Each “data:” block fires an event in the browser.' },
    ],
    again: [
      { title: 'Keep listening', detail: 'Nothing to do — events keep arriving on the same response.' },
      { title: 'Connection drops', detail: 'Network change, server restart, or proxy timeout.' },
      { title: 'Browser reconnects by itself', detail: 'After a short delay it re-sends the request with Last-Event-ID: 42.' },
      { title: 'Server resumes', detail: 'It sends everything after event 42, so nothing is missed.' },
    ],
  },
}

function MessageDiagram({ p }: { p: Protocol }) {
  const top = 60
  const row = 40
  const yOf = (i: number) => top + i * row + (p.divider && i > p.divider.after ? 24 : 0)
  const height = yOf(p.arrows.length - 1) + 30
  const CX = 110
  const SX = 530
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 640 ${height}`} className="w-full min-w-[520px] h-auto" role="img" aria-label={`${p.name} message pattern`}>
        {p.band && (
          <g>
            <rect x={CX} y={yOf(p.band.from) - 26} width={SX - CX} height={yOf(p.band.to) - yOf(p.band.from) + 52} rx={10} className="fill-slate-100 dark:fill-slate-800/60" />
            <text x={(CX + SX) / 2} y={yOf(p.band.to) + 20} textAnchor="middle" fontSize="11" fontStyle="italic" className="fill-slate-500 dark:fill-slate-400">{p.band.label}</text>
          </g>
        )}
        {[{ x: CX, label: 'Client', cls: 'fill-violet-100 dark:fill-violet-950' }, { x: SX, label: 'Server', cls: 'fill-amber-100 dark:fill-amber-950' }].map(a => (
          <g key={a.label}>
            <line x1={a.x} y1={38} x2={a.x} y2={height} strokeDasharray="4 4" strokeWidth={1.5} className="stroke-slate-300 dark:stroke-slate-700" />
            <rect x={a.x - 50} y={4} width={100} height={30} rx={8} className={a.cls} />
            <text x={a.x} y={24} textAnchor="middle" fontSize="13" fontWeight={700} className="fill-slate-800 dark:fill-slate-100">{a.label}</text>
          </g>
        ))}
        {p.divider && (
          <text x={(CX + SX) / 2} y={yOf(p.divider.after) + 28} textAnchor="middle" fontSize="11" fontWeight={700} className="fill-emerald-600 dark:fill-emerald-400">— {p.divider.label} —</text>
        )}
        {p.arrows.map((a, i) => {
          const y = yOf(i)
          const color = a.color ?? '#64748b'
          const [x1, x2] = a.dir === 'right' ? [CX + 4, SX - 4] : [SX - 4, CX + 4]
          const d = a.dir === 'right' ? 1 : -1
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2 - d * 8} y2={y} stroke={color} strokeWidth={2} />
              <polygon points={`${x2},${y} ${x2 - d * 10},${y - 5} ${x2 - d * 10},${y + 5}`} fill={color} />
              <text x={(CX + SX) / 2} y={y - 7} textAnchor="middle" fontSize="12" fontWeight={600} className="fill-slate-700 dark:fill-slate-200">{a.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function ProtocolExplorer() {
  const [id, setId] = useState<ProtocolId>('rest')
  const [journey, setJourney] = useState<'first' | 'again'>('first')
  const p = PROTOCOLS[id]
  const steps = journey === 'first' ? p.first : p.again

  return (
    <div className="space-y-4">
      <Pills label="Protocol" value={id} onChange={setId} options={(Object.keys(PROTOCOLS) as ProtocolId[]).map(k => ({ id: k, label: PROTOCOLS[k].name }))} />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story · {p.name}</h3>
        <p className="text-amber-700 dark:text-amber-400">{p.story}</p>
      </div>

      <div className="viz-container p-4 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">How messages flow</h3>
        <MessageDiagram p={p} />
        <p>{p.caption}</p>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {p.facts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="mt-1 text-slate-800 dark:text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">What happens to the connection</h3>
        <Pills label="Journey" value={journey} onChange={setJourney} options={[{ id: 'first', label: 'First time' }, { id: 'again', label: 'Every time after' }]} />
        <ol className="space-y-2" aria-live="polite">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{i + 1}</span>
              <p><strong className="text-slate-900 dark:text-white">{s.title}.</strong> {s.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      <CodeTabs codeLabel={`{ } ${p.name} code`} doubtsLabel="🤔 Common Doubts" examples={CODE[id]} doubts={DOUBTS} />
    </div>
  )
}
