import { Cards, Example, Pre, Table, Takeaway } from './ui'

export default function LifetimeSection() {
  return (
    <div className="space-y-4">
      <p>An idle connection sends nothing — both sides just keep their records. But many parties can decide to end it, often <strong>without telling the other side</strong>:</p>
      <Cards cols={3} items={[
        { title: 'Your client', body: 'Closes idle pooled connections after its idle timeout.' },
        { title: 'The server', body: 'Closes idle keep-alive connections (e.g. Node.js after 5 s by default, nginx after 75 s).' },
        { title: 'Load balancers', body: 'Close connections idle longer than their limit (e.g. AWS ALB: 60 s by default).' },
        { title: 'NAT and firewalls', body: 'Silently forget idle flows. Home routers and mobile networks may do this after a few minutes.' },
        { title: 'Deploys and restarts', body: 'Every connection to a restarting server ends — all at once.' },
        { title: 'Network changes', body: 'A phone switching from Wi-Fi to 4G gets a new IP, which breaks every TCP connection it had.' },
      ]} />

      <Example title="The timeout rule, learned the hard way">
        <p>An AWS load balancer keeps connections to your Node.js servers open for up to <strong>60 s</strong> of idleness and reuses them. Node.js closes idle connections after <strong>5 s</strong>. Sometimes the load balancer sends a request on a connection Node closed a moment ago. The request fails and users see random <strong>502 errors</strong>.</p>
        <p><strong>Fix:</strong> set Node’s <code>server.keepAliveTimeout</code> to 65 s — longer than the load balancer’s 60 s.</p>
        <p className="font-semibold text-slate-900 dark:text-white">Rule: the side that reuses connections must give up on idle ones before the side that serves them does. Client idle timeout &lt; server idle timeout.</p>
      </Example>

      <Table caption="“Keepalive” means four different things" head={['Name', 'What it does', 'Use it for']} rows={[
        ['HTTP keep-alive', 'Don’t close the connection after a response; reuse it for the next request.', 'Always on by default — just make sure your client pools.'],
        ['TCP keepalive', 'The OS sends tiny probes on an idle connection to check the other side is still there. On Linux the first probe waits 2 hours by default.', 'Detecting dead peers on long-lived connections (tune the interval down).'],
        ['HTTP/2 PING · gRPC keepalive', 'A protocol-level ping on the connection every N seconds.', 'Keeping gRPC channels and streams alive through NATs and load balancers.'],
        ['WebSocket ping/pong · heartbeat', 'Small messages sent every N seconds on a WebSocket (servers send ping; browsers can only send app-level “heartbeat” messages).', 'Stopping idle WebSockets from being dropped; noticing dead clients.'],
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">Closing politely</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>TCP:</strong> each side sends FIN (“I’m done sending”). Clean and expected.</li>
            <li><strong>HTTP/2 / gRPC:</strong> GOAWAY — “finish what you have, start nothing new here”.</li>
            <li><strong>WebSocket:</strong> a close frame with a status code, then TCP close.</li>
            <li><strong>Abrupt:</strong> RST — the connection is killed. Your code sees <code>ECONNRESET</code>.</li>
          </ul>
          <p><strong>During deploys, drain:</strong> stop accepting new connections, let in-flight requests finish, then exit.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">Reconnecting safely</h3>
          <p>When a server restarts, all its clients lose their connection at the same moment. If 50,000 clients reconnect instantly, they knock it over again — a <strong>thundering herd</strong>.</p>
          <p>So wait before retrying, doubling the wait each time, with randomness (“exponential backoff with jitter”): ~1 s, ~2 s, ~4 s … up to a cap like 30 s.</p>
          <p>A new connection remembers nothing. After reconnecting: <strong>log in again, resubscribe, and fetch what you missed</strong> (e.g. “events since ID 1042”).</p>
        </div>
      </div>

      <Example title="The connection broke mid-request — did it happen?">
        <p>Your app sends “charge $50”. The server charges the card, but the connection breaks before the reply arrives. Your app only sees an error. <strong>You cannot know whether the charge happened.</strong></p>
        <p>Retrying blindly may charge twice. Safe options: only auto-retry requests that are harmless to repeat (GET, PUT of the same value), or send an <strong>idempotency key</strong> so the server can recognise a repeat:</p>
        <Pre>{`POST /payments
Idempotency-Key: 7f3c9a2e-order-1042
{ "amount": 50 }

# Retry with the SAME key → the server returns the first result
# instead of charging again.`}</Pre>
      </Example>

      <Takeaway>Persistent means reusable, never permanent. Assume any connection can disappear at any moment: set timeouts in the right order, reconnect with backoff, restore state after reconnecting, and make retries safe.</Takeaway>
    </div>
  )
}
