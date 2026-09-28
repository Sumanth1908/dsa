import { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import { Pills } from './ui'

type Actor = 'client' | 'dns' | 'server'
type Kind = 'dns' | 'tcp' | 'tls' | 'quic' | 'http'

interface Msg { from: Actor; to: Actor; label: string; kind: Kind }
interface Step { title: string; text: string; shown: number; active: number[]; rtt: number; client: string; server: string }
interface Scenario { id: string; label: string; messages: Msg[]; steps: Step[]; summary: string }

const COLOR: Record<Kind, string> = { dns: '#0ea5e9', tcp: '#8b5cf6', tls: '#10b981', quic: '#ec4899', http: '#f59e0b' }
const KIND_LABEL: Record<Kind, string> = { dns: 'DNS', tcp: 'TCP', tls: 'TLS', quic: 'QUIC', http: 'HTTP request' }
const X: Record<Actor, number> = { client: 90, dns: 320, server: 550 }
const RTT_MS = 50

const SCENARIOS: Scenario[] = [
  {
    id: 'new',
    label: 'Brand-new HTTPS connection',
    messages: [
      { from: 'client', to: 'dns', label: 'Where is shop.example?', kind: 'dns' },
      { from: 'dns', to: 'client', label: '203.0.113.20', kind: 'dns' },
      { from: 'client', to: 'server', label: 'SYN  (“can we talk?”)', kind: 'tcp' },
      { from: 'server', to: 'client', label: 'SYN-ACK  (“yes”)', kind: 'tcp' },
      { from: 'client', to: 'server', label: 'ACK + TLS ClientHello', kind: 'tls' },
      { from: 'server', to: 'client', label: 'ServerHello + certificate + Finished', kind: 'tls' },
      { from: 'client', to: 'server', label: 'Finished + GET /products/123', kind: 'http' },
      { from: 'server', to: 'client', label: '200 OK { product 123 }', kind: 'http' },
    ],
    steps: [
      { title: 'Your code calls fetch()', text: 'The app wants product 123 from https://shop.example. The HTTP client looks in its pool for an open connection to shop.example. There is none, so it must build one from scratch.', shown: 0, active: [], rtt: 0, client: 'no connection', server: 'listening on :443' },
      { title: 'Step 1 · Find the address (DNS)', text: 'The client asks a DNS resolver for shop.example’s IP address. One round trip — or zero if the answer is already cached.', shown: 2, active: [0, 1], rtt: 1, client: 'knows the IP', server: 'listening on :443' },
      { title: 'Step 2 · TCP handshake: “Can we talk?”', text: 'The client picks a free local port and sends SYN. Nothing useful can be sent yet — the client is just asking permission.', shown: 3, active: [2], rtt: 1, client: 'SYN_SENT', server: 'listening on :443' },
      { title: 'Step 2 · TCP handshake: “Yes”', text: 'The server replies SYN-ACK and sets aside memory for this new connection. Second round trip complete.', shown: 4, active: [3], rtt: 2, client: 'ESTABLISHED', server: 'SYN_RECEIVED' },
      { title: 'Step 3 · TLS handshake starts', text: 'The client finishes TCP (ACK) and, in the same flight, starts TLS: “these are the ciphers I support, and here is my half of a key exchange.”', shown: 5, active: [4], rtt: 2, client: 'TLS handshaking', server: 'TLS handshaking' },
      { title: 'Step 3 · The server proves who it is', text: 'The server sends its half of the key exchange and its certificate. The client checks the certificate really belongs to shop.example. This is the CPU-heavy part: public-key math on both sides. Third round trip complete.', shown: 6, active: [5], rtt: 3, client: 'verifying certificate', server: 'keys ready' },
      { title: 'Step 4 · Finally, the real request', text: 'Both sides now share secret keys. The client sends its TLS “Finished” and the encrypted GET /products/123 together.', shown: 7, active: [6], rtt: 3, client: 'waiting for response', server: 'working on request' },
      { title: 'Step 4 · The response arrives', text: 'The server does the real work and replies. Four round trips in total — and only the last one was the request you actually cared about.', shown: 8, active: [7], rtt: 4, client: 'ESTABLISHED (encrypted)', server: 'ESTABLISHED (encrypted)' },
      { title: 'Step 5 · Save it for later', text: 'Instead of closing, the client marks the connection “idle” and keeps it in its pool for shop.example — socket, TLS keys and all. The next request can skip steps 1–3.', shown: 8, active: [], rtt: 4, client: 'idle in pool', server: 'idle, waiting' },
    ],
    summary: '4 round trips = 1 DNS + 1 TCP + 1 TLS + 1 useful. At 50 ms each, that is 200 ms — and 150 ms of it is pure setup.',
  },
  {
    id: 'reuse',
    label: 'Reusing a saved connection',
    messages: [
      { from: 'client', to: 'server', label: 'GET /products/456', kind: 'http' },
      { from: 'server', to: 'client', label: '200 OK { product 456 }', kind: 'http' },
    ],
    steps: [
      { title: 'Your code calls fetch() again', text: 'The client looks in its pool and finds the idle, healthy connection to shop.example that it saved last time.', shown: 0, active: [], rtt: 0, client: 'idle connection found', server: 'idle, waiting' },
      { title: 'Send the request immediately', text: 'No DNS lookup, no TCP handshake, no TLS handshake. The request is encrypted with the keys agreed last time and sent straight away.', shown: 1, active: [0], rtt: 0, client: 'waiting for response', server: 'working on request' },
      { title: 'The response arrives', text: 'One round trip in total. Same work as before, a quarter of the waiting.', shown: 2, active: [1], rtt: 1, client: 'ESTABLISHED (encrypted)', server: 'ESTABLISHED (encrypted)' },
      { title: 'Back into the pool', text: 'The connection returns to idle and stays reusable — until an idle timeout, a server restart, or a network change closes it.', shown: 2, active: [], rtt: 1, client: 'idle in pool', server: 'idle, waiting' },
    ],
    summary: '1 round trip. At 50 ms each, that is 50 ms instead of 200 ms.',
  },
  {
    id: 'quic',
    label: 'New connection with HTTP/3 (QUIC)',
    messages: [
      { from: 'client', to: 'dns', label: 'Where is shop.example?', kind: 'dns' },
      { from: 'dns', to: 'client', label: '203.0.113.20 (supports HTTP/3)', kind: 'dns' },
      { from: 'client', to: 'server', label: 'QUIC Initial + TLS ClientHello', kind: 'quic' },
      { from: 'server', to: 'client', label: 'ServerHello + certificate + Finished', kind: 'quic' },
      { from: 'client', to: 'server', label: 'Finished + GET /products/123', kind: 'http' },
      { from: 'server', to: 'client', label: '200 OK { product 123 }', kind: 'http' },
    ],
    steps: [
      { title: 'Your code calls fetch()', text: 'This time the browser knows shop.example supports HTTP/3, which runs on QUIC over UDP instead of TCP.', shown: 0, active: [], rtt: 0, client: 'no connection', server: 'listening on UDP :443' },
      { title: 'Step 1 · Find the address (DNS)', text: 'Same as before: one round trip unless cached.', shown: 2, active: [0, 1], rtt: 1, client: 'knows the IP', server: 'listening on UDP :443' },
      { title: 'Step 2 · Connect and secure in one message', text: 'There is no separate TCP handshake. QUIC’s very first packet already carries the TLS ClientHello.', shown: 3, active: [2], rtt: 1, client: 'handshaking', server: 'handshaking' },
      { title: 'Step 2 · Server answers both at once', text: 'Connection and encryption are set up together — one round trip instead of two.', shown: 4, active: [3], rtt: 2, client: 'keys ready', server: 'keys ready' },
      { title: 'Step 3 · The real request', text: 'The encrypted request goes out with the client’s Finished message.', shown: 5, active: [4], rtt: 2, client: 'waiting for response', server: 'working on request' },
      { title: 'Step 3 · The response arrives', text: 'Three round trips instead of four.', shown: 6, active: [5], rtt: 3, client: 'connected', server: 'connected' },
      { title: 'Bonus · Repeat visits can skip even more', text: 'With “0-RTT resumption”, a returning client can put its request in the very first packet. Only safe, repeatable requests (like GET) should use it, because an attacker could replay that packet. QUIC connections can also survive a network switch (Wi-Fi → 4G) without a new handshake.', shown: 6, active: [], rtt: 3, client: 'idle in pool', server: 'idle, waiting' },
    ],
    summary: '3 round trips = 1 DNS + 1 combined setup + 1 useful. At 50 ms each, that is 150 ms.',
  },
]

function Arrow({ msg, index, active }: { msg: Msg; index: number; active: boolean }) {
  const y = 78 + index * 46
  const x1 = X[msg.from]
  const x2 = X[msg.to]
  const dir = x2 > x1 ? 1 : -1
  const tip = x2 - dir * 4
  const color = COLOR[msg.kind]
  return (
    <g opacity={active ? 1 : 0.4}>
      <line x1={x1 + dir * 4} y1={y} x2={tip - dir * 8} y2={y} stroke={color} strokeWidth={active ? 3 : 2} />
      <polygon points={`${tip},${y} ${tip - dir * 10},${y - 6} ${tip - dir * 10},${y + 6}`} fill={color} />
      <text x={(x1 + x2) / 2} y={y - 9} textAnchor="middle" fontSize="12" fontWeight={active ? 700 : 500} className="fill-slate-700 dark:fill-slate-200">{msg.label}</text>
    </g>
  )
}

function Diagram({ scenario }: { scenario: Scenario }) {
  const ctrl = useSteps(scenario.steps.length)
  const step = scenario.steps[ctrl.step]
  const usesDns = scenario.messages.some(m => m.from === 'dns' || m.to === 'dns')
  const height = 78 + scenario.messages.length * 46
  const kinds = Array.from(new Set(scenario.messages.map(m => m.kind)))

  return (
    <div className="space-y-4">
      <div className="viz-container p-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">Round trips so far: {step.rtt}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">Waiting time at {RTT_MS} ms per round trip: {step.rtt * RTT_MS} ms</span>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 640 ${height}`} className="w-full min-w-[560px] h-auto" role="img" aria-label={`Sequence diagram: ${step.title}`}>
            {(['client', 'dns', 'server'] as Actor[]).map(actor => (
              <g key={actor} opacity={actor === 'dns' && !usesDns ? 0.3 : 1}>
                <line x1={X[actor]} y1={44} x2={X[actor]} y2={height} strokeDasharray="4 4" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth={1.5} />
                <rect x={X[actor] - 62} y={6} width={124} height={34} rx={8} className={actor === 'client' ? 'fill-violet-100 dark:fill-violet-950' : actor === 'server' ? 'fill-amber-100 dark:fill-amber-950' : 'fill-sky-100 dark:fill-sky-950'} />
                <text x={X[actor]} y={28} textAnchor="middle" fontSize="13" fontWeight={700} className="fill-slate-800 dark:fill-slate-100">
                  {actor === 'client' ? 'Your app' : actor === 'server' ? 'shop.example' : usesDns ? 'DNS resolver' : 'DNS (not needed)'}
                </text>
              </g>
            ))}
            {scenario.messages.slice(0, step.shown).map((msg, i) => (
              <Arrow key={i} msg={msg} index={i} active={step.active.includes(i)} />
            ))}
          </svg>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {kinds.map(k => (
            <span key={k} className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{ backgroundColor: COLOR[k] }} />{KIND_LABEL[k]}</span>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <p className="rounded-lg bg-violet-50 px-3 py-2 dark:bg-violet-950/40"><strong>Your app:</strong> {step.client}</p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/40"><strong>Server:</strong> {step.server}</p>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3" aria-live="polite">
          <h3 className="font-semibold text-slate-900 dark:text-white">{step.title}</h3>
          <p className="mt-1">{step.text}</p>
        </div>
      </div>
      <StepControls ctrl={ctrl} />
      {ctrl.step === scenario.steps.length - 1 && (
        <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><strong>Total:</strong> {scenario.summary}</p>
      )}
    </div>
  )
}

export default function SetupStepper() {
  const [id, setId] = useState('new')
  const scenario = SCENARIOS.find(s => s.id === id)!
  return (
    <div className="space-y-4">
      <Pills label="Connection scenario" value={id} onChange={setId} options={SCENARIOS.map(s => ({ id: s.id, label: s.label }))} />
      <Diagram key={scenario.id} scenario={scenario} />
    </div>
  )
}
