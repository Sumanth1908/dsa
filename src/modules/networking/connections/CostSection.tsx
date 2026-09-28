import { useState } from 'react'
import { Cards, Example, Pills, Table, Takeaway } from './ui'

type Setup = 'tls13' | 'tls12' | 'quic' | 'plain'

const SETUP: Record<Setup, { label: string; rtts: number }> = {
  tls13: { label: 'TCP + TLS 1.3 (2 round trips)', rtts: 2 },
  tls12: { label: 'TCP + TLS 1.2 (3 round trips)', rtts: 3 },
  quic: { label: 'HTTP/3 over QUIC (1 round trip)', rtts: 1 },
  plain: { label: 'Plain TCP, no TLS (1 round trip)', rtts: 1 },
}

const DISTANCES = [
  { label: 'Same data center', rtt: 1 },
  { label: 'Same region', rtt: 10 },
  { label: 'Across a continent', rtt: 70 },
  { label: 'Other side of the world', rtt: 200 },
]

function Calculator() {
  const [rtt, setRtt] = useState(70)
  const [requests, setRequests] = useState(10)
  const [serverMs, setServerMs] = useState(20)
  const [setup, setSetup] = useState<Setup>('tls13')
  const [dns, setDns] = useState(true)

  const setupMs = SETUP[setup].rtts * rtt
  const dnsMs = dns ? rtt : 0
  const perRequest = rtt + serverMs
  const rows = [
    { label: 'New connection for every request', total: dnsMs + requests * (setupMs + perRequest), handshakes: requests, setupMs: requests * setupMs, color: 'bg-rose-500' },
    { label: 'One reused connection, requests one after another', total: dnsMs + setupMs + requests * perRequest, handshakes: 1, setupMs, color: 'bg-amber-500' },
    { label: 'One reused connection, requests in parallel (HTTP/2 or HTTP/3)', total: dnsMs + setupMs + perRequest, handshakes: 1, setupMs, color: 'bg-emerald-500' },
  ]
  const max = Math.max(...rows.map(r => r.total))
  const saved = rows[0].total - rows[1].total

  return (
    <div className="viz-container p-4 space-y-5">
      <h3 className="font-semibold text-slate-900 dark:text-white">Try it: how much does reuse save?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label htmlFor="rtt" className="block font-medium">Round-trip time to the server: <strong>{rtt} ms</strong></label>
          <input id="rtt" type="range" min={1} max={300} value={rtt} onChange={e => setRtt(Number(e.target.value))} className="w-full accent-violet-600" />
          <div className="flex flex-wrap gap-1">
            {DISTANCES.map(d => (
              <button key={d.label} type="button" onClick={() => setRtt(d.rtt)} aria-pressed={rtt === d.rtt}
                className={`rounded px-2 py-1 text-xs ${rtt === d.rtt ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {d.label} (~{d.rtt} ms)
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="requests" className="block font-medium">Requests to make: <strong>{requests}</strong></label>
          <input id="requests" type="range" min={1} max={50} value={requests} onChange={e => setRequests(Number(e.target.value))} className="w-full accent-violet-600" />
          <label htmlFor="server" className="block font-medium">Server work per request: <strong>{serverMs} ms</strong></label>
          <input id="server" type="range" min={0} max={200} value={serverMs} onChange={e => setServerMs(Number(e.target.value))} className="w-full accent-violet-600" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-medium">Connection setup type</p>
        <Pills label="Connection setup type" value={setup} onChange={setSetup} options={(Object.keys(SETUP) as Setup[]).map(k => ({ id: k, label: SETUP[k].label }))} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dns} onChange={e => setDns(e.target.checked)} className="accent-violet-600" />
          Include one DNS lookup (uncheck if the address is cached)
        </label>
      </div>
      <div className="space-y-4" aria-live="polite">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium text-slate-900 dark:text-white">{r.label}</span>
              <span className="font-mono tabular-nums">{r.total.toLocaleString()} ms</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${r.color} transition-all duration-300`} style={{ width: `${Math.max(2, (r.total / max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {r.handshakes} connection setup{r.handshakes === 1 ? '' : 's'} · {Math.round((r.setupMs / r.total) * 100)}% of the time spent on setup
            </p>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        Reusing one connection saves <strong>{saved.toLocaleString()} ms</strong> here, and the server performs <strong>{requests - 1}</strong> fewer handshakes.
        {rtt <= 2 && ' Inside one data center the time saved is small — but the CPU, sockets, and TIME_WAIT savings below still apply.'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">A simplified model: it ignores bandwidth, TCP slow start, and HTTP/2 stream limits. Real numbers vary, but the shape of the result does not.</p>
    </div>
  )
}

export default function CostSection() {
  return (
    <div className="space-y-4">
      <p>A new connection is paid for in four different currencies. Knowing which one hurts in your situation tells you what to fix.</p>
      <Cards items={[
        {
          title: '1. Time — round trips',
          body: <>Every handshake message has to reach the server and come back before the next step can start. Distance sets the price: light in fiber travels about 200 km per millisecond, so New York ↔ London can never be faster than ~56 ms per round trip. A new HTTPS connection needs 2–3 of those before your request even leaves.</>,
        },
        {
          title: '2. CPU — cryptography',
          body: <>The TLS handshake uses public-key cryptography to agree on keys and check the certificate. That is far more expensive than the fast encryption used for data afterwards. A server doing thousands of new handshakes per second burns real CPU on them; with reuse it does that work once per connection.</>,
        },
        {
          title: '3. Memory and OS limits',
          body: <>Each open connection holds kernel buffers, TLS state, and a file descriptor. Closed ones linger too: the side that closes first keeps a <code>TIME_WAIT</code> entry for about a minute. Open and close fast enough and you run out of ports (example below).</>,
        },
        {
          title: '4. Warm-up — TCP slow start',
          body: <>A new TCP connection doesn’t know how fast the network is, so it starts carefully — roughly 14 KB in the first round trip — and speeds up each round trip after. A reused connection is already “warm”; a new one pays the ramp-up again, which hurts larger responses.</>,
        },
      ]} />

      <Table caption="What setup costs at different distances (new HTTPS connection, TCP + TLS 1.3)" head={['Where the server is', 'Typical round trip', 'Setup before the request can leave']} rows={[
        ['Same data center', '~0.5–1 ms', '~1–2 ms — time is cheap here; CPU and sockets are the real cost'],
        ['Same cloud region', '~2–10 ms', '~4–20 ms'],
        ['Across a continent', '~60–80 ms', '~120–160 ms — users notice this'],
        ['Phone on a mobile network', '~50–150 ms and jumpy', '~100–300 ms, plus retries on bad signal'],
        ['Other side of the world', '~150–250 ms', '~300–500 ms'],
      ]} />

      <Calculator />

      <Example title="Running out of ports">
        <p>A service calls another service at <code>10.0.0.5:443</code>, opening a new connection for each call and closing it afterwards. Each closed connection keeps its local port busy in <code>TIME_WAIT</code> for about 60 seconds.</p>
        <p>Linux gives a client roughly 28,000 local ports by default. 28,000 ports ÷ 60 seconds ≈ <strong>470 new connections per second</strong> to that one address before new connections start failing with “cannot assign requested address” — even though both machines are nearly idle.</p>
        <p><strong>Fix:</strong> reuse connections. With a pool of 20 kept-alive connections, the same service can make thousands of calls per second without touching new ports.</p>
      </Example>

      <Example title="Why every backend uses a database connection pool">
        <p>PostgreSQL starts a separate server process for each connection (several MB of memory each) and allows only 100 connections by default. A database connection also runs authentication and session setup, on top of TCP and TLS.</p>
        <p>Opening one connection per query would add all of that to every query. And 200 app servers each opening 50 connections would ask for 10,000. So each app keeps a small pool (often 5–20 connections), and large fleets put a pooler such as PgBouncer or RDS Proxy in front of the database.</p>
      </Example>

      <Takeaway>Setup is a fixed cost per connection; the request itself is a cost per request. Reuse spreads the fixed cost over many requests. The farther away the server, the more requests you make, and the busier the server, the more reuse matters.</Takeaway>
    </div>
  )
}
