import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  messages: { from: 'client' | 'server'; type: string; content: string; color: string }[]
  clientState: string
  serverState: string
  message: string
  active: number | null
}

function wsSteps(): Step[] {
  const steps: Step[] = [{ messages: [], clientState: 'CLOSED', serverState: 'LISTENING', message: 'WebSocket connection lifecycle. Client and server start on HTTP.', active: null }]
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
    'OPEN', 'OPEN', 'Client sends PING to keep connection alive.')
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

export default function WebSocketVisualizer() {
  const steps = wsSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WebSocket</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Full-duplex persistent connection over a single TCP socket — starts as HTTP
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>HTTP is request-response: the client always has to ask before the server can answer. For a chat app, this means polling ("any new messages yet?") every second — 99% of requests return nothing. WebSocket solves this by upgrading an existing HTTP connection to a persistent full-duplex channel where the <strong>server can push data to the client at any time</strong> without being asked.</p>
        <p>The handshake is a regular HTTP GET with special <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">Upgrade: websocket</code> headers. The server's <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">101 Switching Protocols</code> response signals the protocol switch. After that, the same TCP socket carries lightweight binary frames instead of HTTP headers — frames are as small as 2 bytes overhead vs. hundreds of bytes per HTTP request.</p>
        <p><strong>When to use WebSocket vs alternatives:</strong> Use WebSocket for true bidirectional real-time (chat, live collaboration, multiplayer games). Use <strong>SSE (Server-Sent Events)</strong> for one-way server push (live dashboards, news feeds) — simpler, HTTP-native, auto-reconnects. Use HTTP polling when real-time isn't critical and simplicity matters.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { icon: '🔄', title: 'Full-duplex', desc: 'Client and server can send messages simultaneously — no polling' },
          { icon: '⚡', title: 'Low latency', desc: 'No HTTP overhead after handshake — just lightweight frames' },
          { icon: '🔗', title: 'Persistent', desc: 'Connection stays open until explicitly closed by either side' },
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
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-4">
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
              <li>✓ Minimal frame overhead (2–10 bytes)</li>
              <li>✓ True real-time</li>
              <li>✗ Not HTTP cache-able</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-slate-600 dark:text-slate-400 mb-1">HTTP Long Polling</div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-500">
              <li>✗ New connection per request</li>
              <li>✗ Client must always initiate</li>
              <li>✗ Large HTTP header overhead</li>
              <li>✗ Latency = polling interval</li>
              <li>✓ Works through all proxies</li>
            </ul>
          </div>
        </div>
      </div>

      <CodeBlock examples={[
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
