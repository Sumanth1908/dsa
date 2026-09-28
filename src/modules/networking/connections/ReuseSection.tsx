import { useState } from 'react'
import { Example, Pills, Pre, Table, Takeaway } from './ui'

type Mode = 'none' | 'one' | 'pool' | 'h2'
interface Block { start: number; len: number; label: string; setup?: boolean }

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const SCALE = 18

const MODES: Record<Mode, { label: string; lanes: Block[][]; explain: string; tradeoff: string }> = {
  none: {
    label: 'New connection per request',
    lanes: LETTERS.map((l, i) => [
      { start: i * 3, len: 2, label: 'setup', setup: true },
      { start: i * 3 + 2, len: 1, label: l },
    ]),
    explain: 'Every request builds its own connection (2 round trips), uses it once, then closes it.',
    tradeoff: '18 round trips, 6 handshakes, 6 sockets left in TIME_WAIT. This is what happens when code creates a new HTTP client for every call.',
  },
  one: {
    label: 'Keep-alive: 1 connection (HTTP/1.1)',
    lanes: [[{ start: 0, len: 2, label: 'setup', setup: true }, ...LETTERS.map((l, i) => ({ start: 2 + i, len: 1, label: l }))]],
    explain: 'One connection is set up once and kept open. HTTP/1.1 sends one request at a time on it, so B waits for A’s response, C waits for B, and so on.',
    tradeoff: '8 round trips, 1 handshake. Cheap, but requests queue behind each other (head-of-line blocking).',
  },
  pool: {
    label: 'Pool of 3 connections (HTTP/1.1)',
    lanes: [0, 1, 2].map(i => [
      { start: 0, len: 2, label: 'setup', setup: true },
      { start: 2, len: 1, label: LETTERS[i] },
      { start: 3, len: 1, label: LETTERS[i + 3] },
    ]),
    explain: 'The client opens up to 3 connections to the same server and spreads requests across them. Browsers do this on HTTP/1.1 — about 6 connections per host.',
    tradeoff: '4 round trips, but 3 handshakes and 3 sets of buffers. Parallelism is bought with extra connections.',
  },
  h2: {
    label: 'HTTP/2: 1 connection, multiplexed',
    lanes: [[{ start: 0, len: 2, label: 'setup', setup: true }, { start: 2, len: 1, label: 'A–F' }]],
    explain: 'One connection, and all six requests travel at the same time as separate streams (each frame is tagged with a stream ID so replies don’t get mixed up).',
    tradeoff: '3 round trips, 1 handshake. This is why HTTP/2, HTTP/3 and gRPC need so few connections.',
  },
}

function Timeline() {
  const [mode, setMode] = useState<Mode>('none')
  const m = MODES[mode]
  const end = Math.max(...m.lanes.flat().map(b => b.start + b.len))
  const handshakes = m.lanes.length
  return (
    <div className="viz-container p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 dark:text-white">Six requests (A–F), four ways to send them</h3>
      <Pills label="Reuse strategy" value={mode} onChange={setMode} options={(Object.keys(MODES) as Mode[]).map(k => ({ id: k, label: MODES[k].label }))} />
      <div className="overflow-x-auto">
        <div className="min-w-[520px] space-y-2">
          {m.lanes.map((lane, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">Connection {i + 1}</span>
              <div className="relative h-8 flex-1 rounded bg-slate-100 dark:bg-slate-800">
                {lane.map(b => (
                  <div key={`${b.label}-${b.start}`} title={b.setup ? 'TCP + TLS setup (2 round trips)' : `Request ${b.label} (1 round trip)`}
                    className={`absolute top-0.5 bottom-0.5 flex items-center justify-center overflow-hidden whitespace-nowrap rounded text-xs font-semibold ${b.setup
                      ? 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100'
                      : 'bg-violet-500 text-white'}`}
                    style={{ left: `${(b.start / SCALE) * 100}%`, width: `calc(${(b.len / SCALE) * 100}% - 2px)` }}>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0" />
            <div className="relative h-5 flex-1 text-[10px] text-slate-400">
              {[0, 3, 6, 9, 12, 15, 18].map(t => (
                <span key={t} className={`absolute ${t === 0 ? '' : t === SCALE ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${(t / SCALE) * 100}%` }}>{t}</span>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">time, in round trips →</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">Finished after {end} round trips</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium dark:bg-slate-800">{handshakes} handshake{handshakes === 1 ? '' : 's'}</span>
      </div>
      <p>{m.explain}</p>
      <p className="font-medium text-slate-900 dark:text-white">{m.tradeoff}</p>
    </div>
  )
}

export default function ReuseSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">“Saving” a connection means…</h3>
          <p>After a response has been <strong>fully read</strong>, the client does not close the socket. It keeps the socket and its TLS keys, marks it <em>idle</em>, and stores it in a <strong>pool</strong> — a list of open connections grouped by destination (scheme + host + port, e.g. <code>https://shop.example:443</code>).</p>
          <p>The server does the same on its side: it keeps the socket open and waits for another request. In HTTP/1.1 and HTTP/2 this “keep-alive” behavior is the default.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">“Reusing” a connection means…</h3>
          <p>The next request to the same destination asks the pool for a connection (“acquires” one):</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Idle one available?</strong> Take it and send immediately — no handshakes.</li>
            <li><strong>None idle, but under the limit?</strong> Open a new one (pay setup once).</li>
            <li><strong>At the limit?</strong> Wait in line for one to be released. Wait too long → “pool timeout” error.</li>
          </ol>
          <p>When the response is read, the connection is <strong>released</strong> back to the pool — not closed.</p>
        </div>
      </div>

      <Timeline />

      <Table caption="The four pool settings that matter" head={['Setting', 'What it controls', 'Too low', 'Too high']} rows={[
        ['Max connections per destination', 'How many requests can run in parallel to one server', 'Requests queue in your app; you see timeouts while the server is idle', 'You can overwhelm the server (especially databases)'],
        ['Idle timeout', 'How long an unused connection is kept', 'Connections are closed and rebuilt too often', 'You keep connections the server has already closed → reset errors (see Part 5)'],
        ['Acquire (wait) timeout', 'How long a request waits for a free connection', 'Requests fail during short bursts', 'Requests hang for a long time when the pool is stuck'],
        ['Max lifetime', 'Forces old connections to be replaced', 'Constant reconnect churn', 'Traffic stays pinned to old backends after scaling or deploys'],
      ]} />

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">The five most common reuse bugs</h3>
        <Example title="1 · A new client for every request">
          <Pre>{`// ❌ Every call builds a new pool → every call pays DNS + TCP + TLS
async function getUser(id) {
  const client = new HttpClient()
  return client.get(\`https://users.internal/users/\${id}\`)
}

// ✅ One client per process, shared by everyone
const client = new HttpClient()
async function getUser(id) {
  return client.get(\`https://users.internal/users/\${id}\`)
}`}</Pre>
          <p>The same applies to gRPC channels, database pools, and SDK clients (AWS, Stripe, …). In serverless functions, create the client <em>outside</em> the handler so warm invocations reuse it.</p>
        </Example>
        <Example title="2 · Not reading the response body">
          <p>A connection can only go back to the pool after the whole response has been read. If you check <code>status</code> and ignore the body, many clients cannot reuse that connection — it stays busy or gets closed. Always read or explicitly discard the body.</p>
        </Example>
        <Example title="3 · Pool too small">
          <p>The pool allows 10 connections, but 200 requests arrive at once. 190 wait inside <em>your</em> app. Your logs say “timeout”, yet the server’s logs show nothing — the requests never left. Look at pool wait time, not just response time.</p>
        </Example>
        <Example title="4 · Pool too big">
          <p>50 app servers × pool size 100 = 5,000 database connections. The database spends its memory on connections instead of queries. Size pools from what the <em>server</em> can handle, divided across all clients.</p>
        </Example>
        <Example title="5 · Reusing a connection the server already closed">
          <p>Your pool keeps idle connections for 120 s, but the server closes them after 60 s. The next request picks a dead connection and fails with <code>ECONNRESET</code>. Covered in the next part.</p>
        </Example>
      </div>

      <Takeaway>Create clients once and share them. Read every response fully. Size the pool from what the server can take. With HTTP/2 and gRPC, one connection carries many requests at once, so you need far fewer connections.</Takeaway>
    </div>
  )
}
