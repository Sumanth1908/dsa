import MemoryTip from '@/components/shared/MemoryTip'
import SetupStepper from './SetupStepper'
import CostSection from './CostSection'
import ReuseSection from './ReuseSection'
import LifetimeSection from './LifetimeSection'
import ProtocolExplorer from './ProtocolExplorer'
import DecisionGuide from './DecisionGuide'
import LayerExplorer from './LayerExplorer'
import ConnectionDeepDive from './ConnectionDeepDive'
import { Cards, Example, Pre, Section, Table, Takeaway } from './ui'

const TOC = [
  { id: 'basics', title: 'What a connection is' },
  { id: 'create', title: 'Creating a connection, step by step' },
  { id: 'cost', title: 'Why connections are expensive' },
  { id: 'reuse', title: 'Saving and reusing connections' },
  { id: 'lifetime', title: 'Keeping them alive, closing, reconnecting' },
  { id: 'protocols', title: 'How REST, gRPC, WebSocket and SSE use connections' },
  { id: 'choose', title: 'Choosing the right one for your requirement' },
  { id: 'mistakes', title: 'Common mix-ups and a checklist' },
  { id: 'under-the-hood', title: 'Appendix: under the hood' },
]

function jumpTo(id: string) {
  const el = document.getElementById(id)
  el?.focus({ preventScroll: true })
  el?.scrollIntoView({ block: 'start' })
}

export default function ConnectionsVisualizer() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connections &amp; Channels</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">What happens when two programs connect, why it costs so much, how to reuse connections — and how that decides between REST, gRPC, WebSocket, SSE and UDP.</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
        <h3 className="font-medium text-amber-800 dark:text-amber-300">The Story</h3>
        <p className="text-amber-700 dark:text-amber-400">You want to ask a shop a question by phone. First you look up its number (<strong>DNS</strong>). You dial and wait for “hello?” (<strong>TCP handshake</strong>). You check it’s really the shop and agree on a private code so nobody can listen in (<strong>TLS</strong>). Only then do you ask your question (<strong>the request</strong>).</p>
        <p className="text-amber-700 dark:text-amber-400">If you have ten questions, hanging up and redialing after each one would be silly — so you stay on the line (<strong>keep-alive / reuse</strong>). But the shop only has so many phone lines, and an unused line eventually gets cut (<strong>limits and timeouts</strong>).</p>
        <p className="text-amber-700 dark:text-amber-400">And there are different ways to talk: texting one question at a time (<strong>REST</strong>), an intercom that stays on all day between two offices (<strong>gRPC</strong>), an open phone line where both people talk freely (<strong>WebSocket</strong>), a radio station you just listen to (<strong>SSE</strong>), or shouting across a noisy room where a missed word isn’t repeated (<strong>UDP</strong>).</p>
      </div>

      <MemoryTip>Look up, dial, verify, talk — and don’t hang up if you’re going to call again.</MemoryTip>

      <nav aria-label="On this page" className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <p className="font-semibold text-slate-900 dark:text-white">On this page</p>
        <ol className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {TOC.map((item, i) => (
            <li key={item.id}>
              <button type="button" onClick={() => jumpTo(item.id)} className="text-left text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
                {i < TOC.length - 1 ? `${i + 1}. ` : ''}{item.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="basics" part="Part 1" title="What a connection is" lead="Not a wire, not your Wi-Fi, not a login — just an agreement and some notes.">
        <p>A <strong>connection</strong> is an agreement between two programs that they are in a conversation, plus the notes each side keeps about it. There is no private wire: packets share the network with everyone else’s traffic. The connection exists only as those notes at the two ends.</p>
        <Pre>{`Your app's notes                        Server's notes
talking to: 203.0.113.20:443            talking to: 198.51.100.7:53001
bytes I've sent: up to #1042            bytes I've received: up to #1042
bytes I've received: up to #5310        bytes I've sent: up to #5310
encryption keys: k3y…                   encryption keys: k3y…
state: ESTABLISHED                      state: ESTABLISHED`}</Pre>
        <Cards cols={3} items={[
          { title: 'Not the network', body: 'Your laptop is on Wi-Fi with zero connections open. Opening a website creates connections through that network. One Wi-Fi link carries hundreds of connections.' },
          { title: 'Not a login', body: 'A connection only means “we can exchange bytes”. Who the user is gets checked separately, with a cookie or token on each request.' },
          { title: 'Not permanent', body: 'Because it’s just notes at both ends, either side — or anything in between — can drop it. Everything in Part 5 follows from this.' },
        ]} />

        <h3 className="font-semibold text-slate-900 dark:text-white pt-2">Three questions that are easy to mix up</h3>
        <Table head={['Question', 'Terms', 'REST', 'gRPC', 'WebSocket', 'UDP']} rows={[
          ['Do we agree to talk before sending data?', 'connection-oriented vs connectionless', 'Yes (TCP)', 'Yes (TCP)', 'Yes (TCP)', 'No'],
          ['Do we keep it open for more?', 'persistent vs short-lived', 'Yes, pooled and reused', 'Yes, one long-lived channel', 'Yes, for the whole session', '—'],
          ['Must the server remember earlier messages to understand this one?', 'stateful vs stateless', 'No — each request stands alone', 'No for simple calls', 'Usually yes (who you are, which room)', 'Up to the app'],
        ]} />
        <Example title="All three answers at once">
          <p>You send <code>GET /products/123</code> and then <code>GET /products/456</code> over the same kept-open TCP connection. That is <strong>connection-oriented</strong> (TCP handshake first), <strong>persistent</strong> (reused), and <strong>stateless</strong> (the second request doesn’t need the first to make sense). “What about the other one?” would be stateful — the server would need to remember your previous question.</p>
        </Example>

        <h3 className="font-semibold text-slate-900 dark:text-white pt-2">Five words used throughout this page</h3>
        <Cards items={[
          { title: 'Connection', body: 'One live conversation between two endpoints (TCP, or QUIC for HTTP/3).' },
          { title: 'Pool', body: 'A client’s collection of open connections, kept for reuse and grouped by destination.' },
          { title: 'Channel (gRPC)', body: 'A long-lived object that manages connections to one service and reconnects on its own.' },
          { title: 'Stream (HTTP/2)', body: 'One numbered request/response conversation inside a connection. Many streams share one connection.' },
          { title: 'Request / message', body: 'What you actually say. Sending another one does not mean opening another connection.' },
        ]} />
        <Takeaway>A connection is shared state at two ends. Creating it takes work; keeping it costs a little; it can vanish at any time.</Takeaway>
      </Section>

      <Section id="create" part="Part 2" title="Creating a connection, step by step" lead="Step through every message that crosses the network before your request gets an answer.">
        <p>Pick a scenario, then press play or use ← → to step. Watch the round-trip counter: that is the time your user spends waiting.</p>
        <SetupStepper />
        <Takeaway>A brand-new HTTPS request needs about 4 round trips (DNS, TCP, TLS, request). A reused connection needs 1. HTTP/3 merges the TCP and TLS steps.</Takeaway>
      </Section>

      <Section id="cost" part="Part 3" title="Why connections are expensive" lead="Time, CPU, memory, and warm-up — and how to measure which one hurts you.">
        <CostSection />
      </Section>

      <Section id="reuse" part="Part 4" title="Saving and reusing connections" lead="Pools, keep-alive, and multiplexing — and the bugs that silently turn them off.">
        <ReuseSection />
      </Section>

      <Section id="lifetime" part="Part 5" title="Keeping connections alive, closing them, and reconnecting" lead="Persistent never means permanent.">
        <LifetimeSection />
      </Section>

      <Section id="protocols" part="Part 6" title="How REST, gRPC, WebSocket and SSE use connections" lead="Same TCP underneath — very different ways of using it. Pick one to see its message flow, connection behavior, and code.">
        <ProtocolExplorer />
      </Section>

      <Section id="choose" part="Part 7" title="Choosing the right one for your requirement" lead="Turn requirements into a decision, and know the connection cost you’re signing up for.">
        <DecisionGuide />
      </Section>

      <Section id="mistakes" part="Part 8" title="Common mix-ups and a checklist" lead="Quick corrections, then the questions to ask before you pick a technology.">
        <Table head={['Easy to believe', 'What’s actually true']} rows={[
          ['A new request means a new connection', 'Clients reuse pooled connections; with HTTP/2 many requests share one.'],
          ['Stateless means connectionless', 'Stateless is about request context; REST requests still travel over TCP connections, usually reused.'],
          ['Only WebSocket keeps connections open', 'HTTP keep-alive and gRPC channels keep connections open too. WebSocket’s difference is that either side can send at any time.'],
          ['An open connection means the request will work', 'The connection can break a moment later, and the server can still reject the request.'],
          ['One gRPC channel = one TCP connection', 'A channel may hold zero, one or many connections and replaces them as needed.'],
          ['A timeout means the server was slow', 'The request may have waited in your own pool and never left.'],
          ['If the call failed, nothing happened', 'The server may have done the work before the connection broke. Retry only with idempotency.'],
          ['More connections = more throughput', 'Only up to a point. Each connection costs a handshake and memory, and can overload the server (especially databases).'],
        ]} />
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">Before you choose, answer these</h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Who is the client?</strong> Browser, internal service, or third party? (Browsers can’t do native gRPC or raw UDP.)</li>
            <li><strong>Who starts messages?</strong> Only the client, the server too, or both freely?</li>
            <li><strong>How often, and how many clients at once?</strong> This decides between short pooled requests and one open connection per client.</li>
            <li><strong>Is late data still useful?</strong> If not, TCP’s retransmission works against you.</li>
            <li><strong>How far away are clients?</strong> The farther, the more every round trip and handshake costs.</li>
            <li><strong>What happens when the connection drops?</strong> Reconnect, resume, and safe retries must be designed in.</li>
            <li><strong>What sits in between?</strong> CDNs, proxies and load balancers change timeouts, caching and how long-lived connections are balanced.</li>
          </ol>
        </div>
      </Section>

      <Section id="under-the-hood" part="Appendix" title="Under the hood" lead="Optional depth: the layers underneath, sockets, framing, load balancers, and debugging.">
        <LayerExplorer />
        <ConnectionDeepDive />
      </Section>

      <details className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
        <summary className="cursor-pointer font-medium">Sources and further reading</summary>
        <ul className="mt-3 space-y-2 list-disc pl-4 text-violet-700 dark:text-violet-300">
          {[
            ['MDN: Connection management in HTTP/1.x', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x'],
            ['RFC 9293: TCP', 'https://datatracker.ietf.org/doc/html/rfc9293'],
            ['RFC 8446: TLS 1.3 handshake', 'https://www.rfc-editor.org/rfc/rfc8446.html#section-2'],
            ['RFC 9113: HTTP/2 streams and multiplexing', 'https://www.rfc-editor.org/rfc/rfc9113.html#section-5'],
            ['RFC 9000: QUIC', 'https://www.rfc-editor.org/rfc/rfc9000.html'],
            ['gRPC: core concepts', 'https://grpc.io/docs/what-is-grpc/core-concepts/'],
            ['gRPC: performance best practices (channel reuse)', 'https://grpc.io/docs/guides/performance/'],
            ['gRPC: load balancing', 'https://grpc.io/blog/grpc-load-balancing/'],
            ['gRPC: keepalive', 'https://grpc.io/docs/guides/keepalive/'],
            ['RFC 6455: WebSocket', 'https://www.rfc-editor.org/rfc/rfc6455.html'],
            ['MDN: Server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
            ['Fielding: REST and statelessness', 'https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm'],
          ].map(([label, href]) => <li key={href}><a className="underline" href={href} target="_blank" rel="noreferrer">{label}</a></li>)}
        </ul>
      </details>
    </div>
  )
}
