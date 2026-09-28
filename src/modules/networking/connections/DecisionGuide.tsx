import { useState } from 'react'
import { Pills, Table, Takeaway } from './ui'

type Caller = 'browser' | 'service' | 'public'
type Pattern = 'ask' | 'push' | 'both' | 'lossy'
type Rate = 'rare' | 'often'
type Tech = 'rest' | 'grpc' | 'grpcStream' | 'websocket' | 'sse' | 'polling' | 'webhooks' | 'broker' | 'udp' | 'sseRest'

const TECH: Record<Tech, { name: string; connection: string; watch: string[] }> = {
  rest: {
    name: 'REST over HTTP',
    connection: 'Short request/response exchanges over pooled keep-alive connections (or one multiplexed HTTP/2 connection). Each request stands alone, so any server behind the load balancer can answer it.',
    watch: ['Share one HTTP client per process so connections are pooled.', 'Each dependent call still costs a round trip — avoid long chains of calls.', 'Make writes safe to retry (idempotency keys).'],
  },
  grpc: {
    name: 'gRPC (unary calls)',
    connection: 'One long-lived HTTP/2 channel per target service; every call is a lightweight stream on it. No handshake per call, compact binary messages.',
    watch: ['Load balancers that balance connections (L4) pin a client to one backend — use client-side round-robin or an L7 proxy.', 'Set a deadline on every call.', 'Share one channel per target; never create one per call.'],
  },
  grpcStream: {
    name: 'gRPC streaming',
    connection: 'One long-lived stream on the shared HTTP/2 channel. HTTP/2 flow control slows the sender when the receiver falls behind.',
    watch: ['A broken connection ends the stream — resume from the last processed message ID.', 'Streams live for hours, so load balancing is even more uneven — rotate connections periodically.', 'Enable keepalive pings so idle streams are not silently dropped.'],
  },
  websocket: {
    name: 'WebSocket',
    connection: 'One upgraded, long-lived connection per client. Either side sends small frames at any time — no per-message HTTP headers or handshakes.',
    watch: ['Plan capacity by concurrent open connections (memory, file descriptors), not requests per second.', 'Each user is pinned to one server — use pub/sub (e.g. Redis) to deliver messages across servers.', 'Reconnect with backoff + jitter, then re-authenticate and resubscribe.', 'Send heartbeats so load balancers and NATs don’t drop idle connections.'],
  },
  sse: {
    name: 'Server-Sent Events (SSE)',
    connection: 'One long-lived HTTP response the server keeps writing events into. Plain HTTP; the browser reconnects automatically and resumes with Last-Event-ID.',
    watch: ['Server → client only; client actions go as normal requests.', 'Serve over HTTP/2 — HTTP/1.1 browsers allow ~6 connections per domain.', 'Disable response buffering in proxies for this route.'],
  },
  sseRest: {
    name: 'SSE for updates + REST for actions',
    connection: 'Two plain-HTTP paths: one long-lived SSE response for server → client, and normal pooled requests for client → server. Both can share one HTTP/2 connection.',
    watch: ['Simpler than WebSocket and works with ordinary HTTP tooling.', 'If client messages become frequent and latency-sensitive, move to WebSocket.', 'Serve over HTTP/2 to avoid the per-domain connection limit.'],
  },
  polling: {
    name: 'Polling (ask every N seconds)',
    connection: 'The client repeats a normal request on a reused keep-alive connection. Nothing long-lived to manage.',
    watch: ['Updates can be up to N seconds late.', 'Most polls return “nothing new” — at 1M clients every 10 s that is 100,000 requests/second.', 'Use ETag / If-None-Match so unchanged answers are a tiny 304.'],
  },
  webhooks: {
    name: 'Webhooks',
    connection: 'When an event happens, your server makes a normal outbound HTTPS request to the partner’s URL. Nobody keeps a connection open.',
    watch: ['Their endpoint will sometimes be down: retry with backoff and keep a record of failures.', 'Include an event ID so they can ignore duplicates caused by retries.', 'Sign each payload so they can verify it came from you.'],
  },
  broker: {
    name: 'Message broker (queue / pub-sub)',
    connection: 'Producers and consumers each keep a few long-lived pooled connections to the broker, not to each other. The broker stores messages while a consumer is down.',
    watch: ['One more system to run.', 'Delivery is usually “at least once” — consumers must handle duplicates.', 'Not for request/response where the caller waits for an answer.'],
  },
  udp: {
    name: 'UDP-based realtime (WebRTC / QUIC / custom UDP)',
    connection: 'No TCP handshake, and a lost packet does not hold up the ones behind it. The app (or WebRTC/QUIC) decides what to resend and what to drop.',
    watch: ['Some networks block UDP — keep a TCP/TLS fallback.', 'Browsers only get UDP through WebRTC, which needs STUN/TURN servers to get through NATs.', 'Loss, ordering and congestion become your problem (or your library’s).'],
  },
}

interface Advice { pick: Tech; why: string; alt?: { tech: Tech; when: string } }

function recommend(caller: Caller, pattern: Pattern, rate: Rate): Advice {
  if (pattern === 'lossy') {
    return {
      pick: 'udp',
      why: 'TCP resends every lost packet and makes later data wait for it. For live audio, video or game state, a packet that arrives late is useless — you would rather skip it and use the next one.',
      alt: { tech: 'websocket', when: 'if occasional delays are acceptable and you want the simplicity of TCP (e.g. turn-based games)' },
    }
  }
  if (pattern === 'ask') {
    if (caller === 'service') {
      return rate === 'often'
        ? { pick: 'grpc', why: 'Thousands of small internal calls per second benefit most from one reused multiplexed connection, compact messages, generated clients, and built-in deadlines.', alt: { tech: 'rest', when: 'if teams prefer JSON and plain HTTP tooling — use a pooled HTTP/2 client' } }
        : { pick: 'rest', why: 'At low call volume, connection costs are small either way. Plain HTTP + JSON is the simplest thing every team and tool understands.', alt: { tech: 'grpc', when: 'if you want a strict typed contract between teams or already run gRPC' } }
    }
    if (caller === 'public') {
      return { pick: 'rest', why: 'Every language and tool speaks HTTP + JSON. Responses can be cached by CDNs, and stateless requests scale behind any load balancer. Partners can debug with curl.', alt: { tech: 'grpc', when: 'as an additional option for partners making very high call volumes' } }
    }
    return { pick: 'rest', why: 'Browsers speak HTTP natively and reuse connections automatically; with HTTP/2 many small requests share one connection. Caching and CDNs work out of the box.', alt: { tech: 'grpc', when: 'via gRPC-Web only if your backend is already gRPC (needs a proxy)' } }
  }
  if (pattern === 'push') {
    if (caller === 'browser') {
      return rate === 'often'
        ? { pick: 'sse', why: 'Updates flow one way, often. One long-lived HTTP response delivers them instantly with less machinery than WebSocket, and reconnect/resume is built into the browser.', alt: { tech: 'websocket', when: 'if the page also sends frequent messages back' } }
        : { pick: 'polling', why: 'Updates are rare, and a few seconds of delay is usually fine (e.g. “order is out for delivery”). A normal request every 10–30 s on a reused connection is the simplest, most robust option.', alt: { tech: 'sse', when: 'if updates must appear instantly' } }
    }
    if (caller === 'service') {
      return rate === 'often'
        ? { pick: 'grpcStream', why: 'A continuous flow of typed events over the existing channel, with built-in backpressure.', alt: { tech: 'broker', when: 'if several services consume the same events, or events must survive consumer downtime' } }
        : { pick: 'broker', why: 'Occasional events are best published once and delivered reliably, even if the consumer is down at that moment — without services holding connections to each other.', alt: { tech: 'grpcStream', when: 'if one consumer needs events with the lowest possible delay' } }
    }
    return rate === 'often'
      ? { pick: 'websocket', why: 'Partners who need a live, high-volume feed (e.g. market data) connect once and receive a continuous stream.', alt: { tech: 'webhooks', when: 'for partners who only need to react to individual events' } }
      : { pick: 'webhooks', why: 'Third parties shouldn’t have to keep a connection open to you. You call their URL when something happens — a normal HTTPS request each time.', alt: { tech: 'polling', when: 'as a fallback so partners can catch up on events they missed' } }
  }
  if (caller === 'service') {
    return rate === 'often'
      ? { pick: 'grpcStream', why: 'Bidirectional streaming lets both services send messages on one long-lived call, with typed messages and flow control.', alt: { tech: 'broker', when: 'if the two sides don’t need to be connected at the same time' } }
      : { pick: 'grpc', why: 'If both sides only occasionally need each other, two ordinary APIs (one each way) are simpler than a long-lived stream.', alt: { tech: 'rest', when: 'if you prefer plain HTTP + JSON' } }
  }
  if (caller === 'public' && rate === 'rare') {
    return { pick: 'webhooks', why: 'Partners call your REST API when they need something, and you call their webhook URL when something happens. Nobody holds a connection open for occasional messages.', alt: { tech: 'websocket', when: 'if partners need a live two-way session' } }
  }
  if (caller === 'browser' && rate === 'rare') {
    return { pick: 'sseRest', why: 'The server pushes now and then, and the user acts now and then. SSE handles the push, normal requests handle the actions — all plain HTTP, no custom protocol.', alt: { tech: 'websocket', when: 'if messages in both directions become frequent (chat, collaboration)' } }
  }
  return { pick: 'websocket', why: 'Both sides send frequent small messages. One open connection carries them in both directions with a few bytes of overhead each — no request per message.', alt: { tech: 'sseRest', when: 'if client → server messages turn out to be rare' } }
}

const SCENARIOS = [
  { need: 'Public product catalog API used by partners and mobile apps', pick: 'REST', why: 'Stateless requests any server can answer; responses cached at the CDN; every client already speaks HTTP. Clients reuse keep-alive connections.' },
  { need: 'Checkout service calling inventory, pricing and payments thousands of times per second', pick: 'gRPC', why: 'Reused multiplexed channels remove per-call setup; typed contracts between teams; deadlines on every call. Use client-side load balancing so calls spread across all pods.' },
  { need: 'Customer-support chat in the browser', pick: 'WebSocket', why: 'Both sides send messages at any time. Plan for pub/sub across servers, heartbeats, and reconnect + resubscribe after drops.' },
  { need: 'Live sports scores or a stock ticker page', pick: 'SSE', why: 'Server → client only, many viewers. Plain HTTP, automatic reconnect with Last-Event-ID, and works through most proxies.' },
  { need: '“Your order is being prepared → out for delivery” status page', pick: 'Polling (or SSE)', why: 'A few updates over 30 minutes. A request every 15 s on a reused connection is simpler to run than thousands of open connections.' },
  { need: 'Tell merchants’ systems when a payment succeeds', pick: 'Webhooks', why: 'Merchants shouldn’t hold connections open to you. POST to their URL with retries, an event ID for de-duplication, and a signature.' },
  { need: 'Multiplayer game or voice call', pick: 'UDP (WebRTC / QUIC)', why: 'A late packet is worthless; TCP’s retransmission would add lag. Keep a TCP fallback for networks that block UDP.' },
  { need: 'Serverless functions querying PostgreSQL', pick: 'Reuse + a pooler', why: 'Create the database client outside the handler so warm invocations reuse it, and put RDS Proxy/PgBouncer in front — thousands of function instances would otherwise exhaust database connections.' },
  { need: 'Mobile app on unreliable networks', pick: 'REST over HTTP/2 or HTTP/3', why: 'Few connections, and HTTP/3 connections survive Wi-Fi ↔ 4G switches. Make writes idempotent because retries after drops are common.' },
]

export default function DecisionGuide() {
  const [caller, setCaller] = useState<Caller>('browser')
  const [pattern, setPattern] = useState<Pattern>('ask')
  const [rate, setRate] = useState<Rate>('often')
  const advice = recommend(caller, pattern, rate)
  const tech = TECH[advice.pick]

  return (
    <div className="space-y-5">
      <div className="viz-container p-4 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Answer three questions about your requirement</h3>
        <div className="space-y-2">
          <p className="font-medium">1. Who is on the other end?</p>
          <Pills label="Caller" value={caller} onChange={setCaller} options={[
            { id: 'browser', label: 'A browser or mobile app' },
            { id: 'service', label: 'Another backend service' },
            { id: 'public', label: 'Third-party developers' },
          ]} />
        </div>
        <div className="space-y-2">
          <p className="font-medium">2. Who sends data, and when?</p>
          <Pills label="Communication pattern" value={pattern} onChange={setPattern} options={[
            { id: 'ask', label: 'Client asks, server answers' },
            { id: 'push', label: 'Server pushes updates' },
            { id: 'both', label: 'Both sides send any time' },
            { id: 'lossy', label: 'Live audio/video/game — late data is useless' },
          ]} />
        </div>
        {pattern !== 'lossy' && (
          <div className="space-y-2">
            <p className="font-medium">3. How often is there something to send?</p>
            <Pills label="Message rate" value={rate} onChange={setRate} options={[
              { id: 'rare', label: 'Now and then (a few per minute or less)' },
              { id: 'often', label: 'Often (every second or faster)' },
            ]} />
          </div>
        )}

        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/30 space-y-3" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Recommended</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{tech.name}</p>
          <p><strong>Why:</strong> {advice.why}</p>
          <p><strong>What it does with connections:</strong> {tech.connection}</p>
          <div>
            <p className="font-semibold">Watch out for:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">{tech.watch.map(w => <li key={w}>{w}</li>)}</ul>
          </div>
          {advice.alt && (
            <p className="border-t border-emerald-200 pt-3 dark:border-emerald-800"><strong>Consider {TECH[advice.alt.tech].name} instead</strong> {advice.alt.when}.</p>
          )}
        </div>
      </div>

      <Table caption="Side-by-side comparison" head={['', 'Who starts a message', 'Connection', 'Cost per message', 'Browser support', 'Main scaling concern']} rows={[
        ['REST', 'Client', 'Short exchanges on pooled connections', 'Full HTTP request + headers, 1 round trip', 'Native', 'Request rate; round trips for chained calls'],
        ['gRPC', 'Client (then both, if streaming)', 'One long-lived HTTP/2 channel', 'Small binary frame, no setup', 'Needs gRPC-Web + proxy', 'Uneven load balancing of long-lived connections'],
        ['WebSocket', 'Either side', 'One long-lived connection per client', 'A few bytes of framing', 'Native', 'Number of concurrent connections; cross-server fan-out'],
        ['SSE', 'Server', 'One long-lived HTTP response per client', 'A small text event', 'Native (EventSource)', 'Concurrent connections; one direction only'],
        ['Polling', 'Client, on a timer', 'Reused keep-alive connection', 'Full request, even when nothing changed', 'Native', 'Wasted requests; delay up to the interval'],
        ['Webhooks', 'Your server calls theirs', 'New outbound request per event', 'Full HTTPS request', 'Not applicable', 'Retries and partner downtime'],
        ['UDP / WebRTC / QUIC', 'Either side', 'No TCP; app-managed or QUIC', 'Tiny, no retransmit wait', 'Only via WebRTC', 'NAT traversal, UDP blocked on some networks'],
      ]} />

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">Worked scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIOS.map(s => (
            <div key={s.need} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Requirement</p>
              <p className="font-medium text-slate-900 dark:text-white">{s.need}</p>
              <p><span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{s.pick}</span></p>
              <p>{s.why}</p>
            </div>
          ))}
        </div>
      </div>

      <Takeaway>Start from the requirement, not the technology: who talks, in which direction, how often, and whether late data is still useful. Then check the connection cost you are signing up for — short pooled requests, one shared channel, or one open connection per user.</Takeaway>
    </div>
  )
}
