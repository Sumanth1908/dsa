import React from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import { Link } from 'react-router-dom'

interface Step {
  messages: { from: 'client' | 'server'; type: string; content: string; color: string }[]
  clientState: string
  serverState: string
  message: string
  active: number | null
}

function wsSteps(): Step[] {
  const steps: Step[] = [{ messages: [], clientState: 'CLOSED', serverState: 'LISTENING', message: 'Classic HTTP/1.1 WebSocket lifecycle. Before the upgrade below, the browser resolves the server name, connects TCP, and uses TLS for wss://.', active: null }]
  const msgs: { from: 'client' | 'server'; type: string; content: string; color: string }[] = []

  const push = (from: 'client' | 'server', type: string, content: string, color: string, cState: string, sState: string, msg: string) => {
    msgs.push({ from, type, content, color })
    steps.push({ messages: [...msgs], clientState: cState, serverState: sState, message: msg, active: msgs.length - 1 })
  }

  push('client', 'HTTP GET', 'Upgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: dGhlIH...', '#6366f1',
    'CONNECTING', 'LISTENING', 'Client sends HTTP Upgrade request. Requests protocol switch to WebSocket.')
  push('server', 'HTTP 101', 'Switching Protocols\nUpgrade: websocket\nSec-WebSocket-Accept: s3pPL...', '#22c55e',
    'OPEN', 'OPEN', '101 Switching Protocols — handshake complete! Connection upgraded to WebSocket.')
  push('client', 'WS Frame', 'TEXT: {"type":"join","room":"chat"}', '#6366f1',
    'OPEN', 'OPEN', 'Client sends a text frame over the persistent connection.')
  push('server', 'WS Frame', 'TEXT: {"type":"welcome","users":42}', '#f59e0b',
    'OPEN', 'OPEN', 'Server responds with a text frame. Full-duplex — no request needed.')
  push('server', 'WS Frame', 'TEXT: {"type":"message","from":"Alice"}', '#f59e0b',
    'OPEN', 'OPEN', 'Server pushes a message to client without waiting for a request.')
  push('client', 'WS Frame', 'PING (heartbeat)', '#8b5cf6',
    'OPEN', 'OPEN', 'A protocol-level client sends PING to check liveness. Browser JavaScript cannot send these control frames directly; it can send an application heartbeat message.')
  push('server', 'WS Frame', 'PONG', '#8b5cf6',
    'OPEN', 'OPEN', 'Server responds with PONG. Connection alive!')
  push('client', 'WS Frame', 'BINARY: [frame data, 1024 bytes]', '#6366f1',
    'OPEN', 'OPEN', 'WebSocket also supports binary frames (images, audio).')
  push('client', 'WS Frame', 'CLOSE (1000 Normal)', '#ef4444',
    'CLOSING', 'OPEN', 'Client initiates close handshake with status code 1000 (Normal).')
  push('server', 'WS Frame', 'CLOSE (1000)', '#ef4444',
    'CLOSED', 'CLOSED', 'Server echoes CLOSE. Connection terminated. TCP then tears down.')

  return steps
}

const TYPE_COLORS: Record<string, string> = {
  'HTTP GET': 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  'HTTP 101': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  'WS Frame': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

const STATE_COLORS: Record<string, string> = {
  CLOSED: 'bg-slate-200 dark:bg-slate-700 text-slate-600',
  CONNECTING: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  OPEN: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  CLOSING: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  LISTENING: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
}

const DOUBTS = [
  {
    q: 'Why not just poll with HTTP every second?',
    a: 'Each poll costs an HTTP request and response, including when no new data exists. It does not necessarily cost a new TCP or TLS handshake: HTTP clients can reuse persistent connections. With a one-second short-poll interval, an update arriving at a random time waits about half a second on average before the next check, plus network and processing time. A WebSocket lets the server send updates as they occur over its existing connection. At one poll per second, a continuously connected user makes 86,400 polls per day; how many are empty depends on the application. WebSocket avoids those repeated checks, although heartbeats may still use traffic.',
  },
  {
    q: 'How does a WebSocket start out as HTTP?',
    a: 'In the classic HTTP/1.1 handshake, the browser sends a GET with Upgrade, Connection, Sec-WebSocket-Key, and version headers. The server validates the request and, if accepting, responds with 101 Switching Protocols and Sec-WebSocket-Accept. The same connection now carries WebSocket frames. The key checks the protocol handshake, not user identity. Browser code supplies the URL to new WebSocket(); the browser handles these headers. Secure wss:// adds TLS. Proxies must support the handshake and suitable timeouts. WebSocket over HTTP/2 uses extended CONNECT instead of this HTTP/1.1 upgrade.',
  },
  {
    q: 'WebSocket vs Server-Sent Events?',
    a: 'SSE (Server-Sent Events) and WebSocket both solve the polling problem, but for different patterns. SSE is one-directional: the server pushes data to clients over a normal HTTP connection, with automatic browser-level reconnect if the connection drops. It\'s perfect for feeds, notifications, stock tickers, or dashboard updates where the server just broadcasts and clients only listen. WebSocket is bidirectional: both client and server can initiate messages at any time, so it\'s essential for chat, multiplayer games, or collaborative editing where users must exchange quick messages in both directions. Implementation-wise, SSE is simpler — just `EventSource(\'url\')`in the browser and standard HTTP streaming. WebSocket requires a framed protocol layer. **Rule of thumb:** if your use case is "server pushes to many clients" (dashboards, feeds), use SSE. If clients and servers frequently send to each other (chat, games), use WebSocket. If you\'re unsure, WebSocket is the safer choice.',
  },
  {
    q: 'What is hard about scaling WebSockets?',
    a: 'An established WebSocket stays associated with the backend that accepted it. A load balancer must support long-lived WebSocket traffic, but separate sticky-session configuration is not inherently required for an already-open connection. On reconnect, the client may reach another backend, so shared session state or application-specific affinity may be needed. Each connection consumes server resources. To deliver a chat message to users connected to different servers, a pub-sub backbone such as Redis can distribute the event, and each server forwards it to its local clients. Restoring room subscriptions and recovering missed messages after reconnect are application responsibilities.',
  },
]

export default function WebSocketVisualizer() {
  const steps = wsSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WebSocket</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Two-way messaging over a persistent connection — explore the classic HTTP/1.1 upgrade
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Think of ordinary HTTP requests as questions at a shop counter: you ask, the assistant answers,
          and you can ask again without leaving. The connection can stay open between questions.
          WebSocket is an ongoing conversation where either person can speak when something happens.
          A chat update can arrive immediately, without repeatedly asking “anything new?”
        </p>
      </div>

      <MemoryTip>HTTP and WebSocket can both keep a connection open. WebSocket lets either side send the next message.</MemoryTip>

      <aside className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400 space-y-2">
        <p>HTTP and WebSocket can both reuse connections. Connection setup, connection lifetime, and application state are separate ideas.</p>
        <Link to="/networking/connections" className="inline-block font-medium text-violet-700 dark:text-violet-300 underline underline-offset-4">
          Learn Connections &amp; Channels →
        </Link>
      </aside>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Ordinary HTTP polling repeatedly asks “any new messages yet?”, even when nothing has changed. These requests can reuse a connection. WebSocket establishes a persistent two-way conversation where the <strong>server can send a message without a new client request</strong>. HTTP streaming, such as SSE, can also deliver updates inside a response kept open.</p>
        <p>In the HTTP/1.1 flow shown here, the handshake is an HTTP GET with special <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">Upgrade: websocket</code> headers. The server's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">101 Switching Protocols</code> response signals the switch. The same TCP connection then carries WebSocket frames containing text or binary data. Frame headers use 2–10 bytes, plus 4 masking bytes on client frames; TLS and network overhead are additional.</p>
        <p><strong>When to use WebSocket vs alternatives:</strong> Use WebSocket for true bidirectional real-time (chat, live collaboration, multiplayer games). Use <strong>SSE (Server-Sent Events)</strong> for one-way server push (live dashboards, news feeds) — simpler, HTTP-native, auto-reconnects. Use HTTP polling when real-time isn't critical and simplicity matters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { icon: '🔄', title: 'Full-duplex', desc: 'Client and server can send messages simultaneously — no polling' },
          { icon: '⚡', title: 'Low latency', desc: 'No HTTP overhead after handshake — just lightweight frames' },
          { icon: '🔗', title: 'Persistent', desc: 'Reused for messages until closure, timeout, or network failure' },
        ].map(f => (
          <div key={f.title} className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-cyan-700 dark:text-cyan-300 text-xs mb-1">{f.title}</div>
            <div className="text-xs text-cyan-600 dark:text-cyan-400">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* State indicators */}
      <div className="flex justify-between">
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-1">Client State</div>
          <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold ${STATE_COLORS[cur.clientState] || ''}`}>
            {cur.clientState}
          </span>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500 mb-1">Server State</div>
          <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold ${STATE_COLORS[cur.serverState] || ''}`}>
            {cur.serverState}
          </span>
        </div>
      </div>

      {/* Message log */}
      <div className="viz-container">
        {/* Column headers */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-center py-2">
          <div className="text-sm font-bold text-violet-600 dark:text-violet-400">CLIENT</div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400">SERVER</div>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {cur.messages.length === 0 && (
            <div className="text-center text-slate-400 py-4 text-sm">Press play to start the WebSocket lifecycle</div>
          )}
          {cur.messages.map((msg, i) => {
            const isActive = cur.active === i
            const isClient = msg.from === 'client'
            return (
              <div key={i} className={`flex ${isClient ? 'justify-start' : 'justify-end'} ${isActive ? 'animate-fade-in' : ''}`}>
                <div className={`max-w-[70%] rounded-xl p-3 border-2 transition-all ${
                  isActive
                    ? isClient ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/40' : 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[msg.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                      {msg.type}
                    </span>
                    {isClient ? <span className="text-xs text-violet-500">→</span> : <span className="text-xs text-amber-500">←</span>}
                  </div>
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto leading-4">
                    {msg.content}
                  </pre>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />

      {/* WS vs HTTP comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm">WebSocket vs HTTP Polling</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-medium text-cyan-600 dark:text-cyan-400 mb-1">WebSocket</div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>✓ Single persistent connection</li>
              <li>✓ Server can push anytime</li>
              <li>✓ Small frame headers (plus client masking)</li>
              <li>✓ True real-time</li>
              <li>✗ Not HTTP cache-able</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-slate-600 dark:text-slate-400 mb-1">HTTP Polling</div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-500">
              <li>✓ Can reuse persistent HTTP connections</li>
              <li>✗ Client must always initiate</li>
              <li>✗ Large HTTP header overhead</li>
              <li>✗ Short polling waits until the next check</li>
              <li>✓ Uses ordinary HTTP infrastructure</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">Long polling holds a request open until data arrives or a timeout occurs, then issues another request. It reduces the waiting gap of short polling and can also reuse connections.</p>

      <CodeTabs doubts={DOUBTS} examples={[
        {
          lang: 'javascript' as const, label: 'JavaScript (ws server + native client)',
          code: `// npm install ws
const WebSocket = require('ws')

// ─── SERVER ────────────────────────────────────────────────────
const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress
    console.log(\`Client connected from \${clientIp}\`)

    // Send a welcome message immediately (server-push — no request needed)
    ws.send(JSON.stringify({ type: 'welcome', msg: 'Connected!' }))

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())
        console.log('Received:', msg)

        // Broadcast to ALL connected clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'broadcast', data: msg }))
            }
        })
    })

    // Heartbeat — detect stale connections
    ws.on('pong', () => { ws.isAlive = true })
    ws.on('close', () => console.log('Client disconnected'))
})

// Ping every 30s to detect dead connections
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate()
        ws.isAlive = false
        ws.ping()
    })
}, 30_000)

// ─── BROWSER CLIENT ────────────────────────────────────────────
const socket = new WebSocket('ws://localhost:8080')

socket.addEventListener('open', () => {
    console.log('WebSocket OPEN')
    socket.send(JSON.stringify({ type: 'chat', text: 'Hello everyone!' }))
})

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data)
    console.log('Server pushed:', data)
})

socket.addEventListener('close', (event) => {
    console.log(\`WebSocket closed: code=\${event.code} reason=\${event.reason}\`)
    // Auto-reconnect with exponential backoff in production
})`,
        },
        {
          lang: 'python' as const, label: 'Python (websockets)',
          code: `# pip install websockets
import asyncio
import websockets
import json

# ─── SERVER ────────────────────────────────────────────────────
CLIENTS: set[websockets.WebSocketServerProtocol] = set()

async def handler(websocket):
    CLIENTS.add(websocket)
    try:
        await websocket.send(json.dumps({"type": "welcome"}))

        async for raw in websocket:        # loop ends on close/error
            msg = json.loads(raw)
            print(f"Received: {msg}")

            # Broadcast to all connected clients
            if CLIENTS:
                await asyncio.gather(
                    *[c.send(json.dumps({"broadcast": msg})) for c in CLIENTS],
                    return_exceptions=True
                )
    finally:
        CLIENTS.discard(websocket)

async def main():
    async with websockets.serve(handler, "localhost", 8080):
        print("WebSocket server on ws://localhost:8080")
        await asyncio.Future()             # run forever

# ─── CLIENT ────────────────────────────────────────────────────
async def client():
    async with websockets.connect("ws://localhost:8080") as ws:
        welcome = await ws.recv()
        print("Server:", json.loads(welcome))

        await ws.send(json.dumps({"type": "chat", "text": "Hello!"}))

        async for msg in ws:               # receive server pushes
            print("Push:", json.loads(msg))

asyncio.run(main())`,
        },
        {
          lang: 'java' as const, label: 'Java (Spring WebSocket)',
          code: `// Spring Boot WebSocket with STOMP protocol
// build.gradle: implementation 'org.springframework.boot:spring-boot-starter-websocket'

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");   // server-push destination prefix
        config.setApplicationDestinationPrefixes("/app");   // client-send prefix
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();    // fallback for browsers without WS support
    }
}

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate template;

    // Client sends to /app/chat → this method handles it
    @MessageMapping("/chat")
    public void handleChat(ChatMessage msg) {
        // Broadcast to all subscribers of /topic/messages
        template.convertAndSend("/topic/messages",
            new ChatMessage(msg.getSender(), msg.getText()));
    }

    // Push a notification to a specific user
    public void notifyUser(String userId, String event) {
        template.convertAndSendToUser(userId, "/queue/notifications", event);
    }
}`,
        },
      ]} />
    </div>
  )
}
