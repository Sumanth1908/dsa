import type { CodeExample } from '@/components/shared/CodeBlock'
import type { Doubt } from '@/components/shared/DoubtsBlock'

export type ProtocolId = 'rest' | 'grpc' | 'websocket' | 'sse'

export const CODE: Record<ProtocolId, CodeExample[]> = {
  rest: [
    {
      lang: 'javascript', label: 'Node.js (fetch)',
      code: `import { Agent, setGlobalDispatcher } from 'undici'

// Node's built-in fetch already keeps a connection pool per origin.
// Tune that ONE shared pool at startup:
setGlobalDispatcher(new Agent({
  connections: 50,           // max connections per origin
  keepAliveTimeout: 10_000,  // close idle sockets after 10s
}))

async function getProduct(id) {
  const res = await fetch(\`https://shop.example/products/\${id}\`)
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json()  // read the body fully → the socket goes back to the pool
}

await getProduct(123)  // new connection: DNS + TCP + TLS + request
await getProduct(456)  // reused connection: just the request

// ❌ Anti-pattern: creating new Agent(...) inside getProduct().
//    A fresh pool per call = a fresh handshake per call.`,
    },
    {
      lang: 'python', label: 'Python (requests)',
      code: `import requests
from requests.adapters import HTTPAdapter

# ❌ requests.get() builds and throws away a pool on every call
for pid in [123, 456, 789]:
    requests.get(f"https://shop.example/products/{pid}", timeout=5)

# ✅ A Session keeps keep-alive connections per host and reuses them
session = requests.Session()
session.mount("https://", HTTPAdapter(pool_connections=10, pool_maxsize=50))

for pid in [123, 456, 789]:
    r = session.get(f"https://shop.example/products/{pid}", timeout=5)
    r.raise_for_status()
    product = r.json()   # reading the body releases the connection to the pool`,
    },
    {
      lang: 'java', label: 'Java (HttpClient)',
      code: `// ✅ Build ONE HttpClient and share it; it pools connections inside.
static final HttpClient CLIENT = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)       // multiplex when the server supports it
    .connectTimeout(Duration.ofSeconds(3))
    .build();

static String getProduct(int id) throws Exception {
    HttpRequest req = HttpRequest.newBuilder(URI.create("https://shop.example/products/" + id))
        .timeout(Duration.ofSeconds(5))
        .build();
    return CLIENT.send(req, HttpResponse.BodyHandlers.ofString()).body();
}

// ❌ HttpClient.newHttpClient() inside getProduct() throws the pool away every call.`,
    },
  ],
  grpc: [
    {
      lang: 'python', label: 'Python',
      code: `import grpc
import shop_pb2, shop_pb2_grpc   # generated from shop.proto

# ✅ Create the channel ONCE at startup and share it.
channel = grpc.secure_channel(
    "dns:///inventory.internal:443",
    grpc.ssl_channel_credentials(),
    options=[
        ("grpc.keepalive_time_ms", 30_000),      # ping when idle for 30s
        ("grpc.lb_policy_name", "round_robin"),  # spread calls across all backends
    ],
)
stub = shop_pb2_grpc.InventoryStub(channel)

def stock_for(product_id: int) -> int:
    # Each call = a new HTTP/2 stream on an existing connection. No handshake.
    reply = stub.GetStock(shop_pb2.StockRequest(product_id=product_id), timeout=0.5)
    return reply.count

# ❌ Creating a channel inside stock_for() = TCP + TLS + HTTP/2 setup on every call.`,
    },
    {
      lang: 'javascript', label: 'Node.js',
      code: `import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const shop = grpc.loadPackageDefinition(protoLoader.loadSync('shop.proto')).shop

// ✅ One client (one channel) per target, created at startup.
const inventory = new shop.Inventory(
  'dns:///inventory.internal:443',
  grpc.credentials.createSsl(),
  {
    'grpc.keepalive_time_ms': 30000,
    'grpc.service_config': JSON.stringify({ loadBalancingConfig: [{ round_robin: {} }] }),
  },
)

function stockFor(productId) {
  const deadline = new Date(Date.now() + 500)   // always set a deadline
  return new Promise((resolve, reject) => {
    inventory.GetStock({ productId }, { deadline }, (err, reply) =>
      err ? reject(err) : resolve(reply.count))
  })
}`,
    },
    {
      lang: 'java', label: 'Java',
      code: `// ✅ One ManagedChannel per target for the whole application.
ManagedChannel channel = ManagedChannelBuilder
    .forTarget("dns:///inventory.internal:443")
    .defaultLoadBalancingPolicy("round_robin")   // spread calls across backends
    .keepAliveTime(30, TimeUnit.SECONDS)
    .useTransportSecurity()
    .build();

InventoryGrpc.InventoryBlockingStub stub = InventoryGrpc.newBlockingStub(channel);

int stockFor(long productId) {
    // A new stream on the shared connection — no handshake per call.
    return stub.withDeadlineAfter(500, TimeUnit.MILLISECONDS)
        .getStock(StockRequest.newBuilder().setProductId(productId).build())
        .getCount();
}

// Only at application shutdown:
channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);`,
    },
  ],
  websocket: [
    {
      lang: 'javascript', label: 'Browser',
      code: `let socket
let attempt = 0
let lastEventId = null

function connect() {
  socket = new WebSocket('wss://chat.example/live')

  socket.addEventListener('open', () => {
    attempt = 0
    // A new connection remembers nothing: log in and resubscribe every time.
    socket.send(JSON.stringify({ type: 'auth', token: getToken() }))
    socket.send(JSON.stringify({ type: 'join', room: 'support', since: lastEventId }))
  })

  socket.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    lastEventId = msg.id        // remember where we are, for resuming
    render(msg)
  })

  socket.addEventListener('close', () => {
    // Exponential backoff + jitter: ~1s, ~2s, ~4s … capped at 30s
    const delay = Math.min(30_000, 1000 * 2 ** attempt) * (0.5 + Math.random())
    attempt++
    setTimeout(connect, delay)
  })
}

connect()
// Every later socket.send(...) reuses the same open connection.`,
    },
    {
      lang: 'python', label: 'Python (websockets)',
      code: `import asyncio, json, random
import websockets

async def run():
    attempt, last_id = 0, None
    while True:
        try:
            # ping_interval: heartbeat so NATs / load balancers don't drop us
            async with websockets.connect("wss://chat.example/live", ping_interval=20) as ws:
                attempt = 0
                await ws.send(json.dumps({"type": "join", "room": "support", "since": last_id}))
                async for raw in ws:          # one connection, many messages
                    msg = json.loads(raw)
                    last_id = msg["id"]
                    print(msg)
        except (OSError, websockets.ConnectionClosed):
            delay = min(30, 2 ** attempt) * (0.5 + random.random())
            attempt += 1
            await asyncio.sleep(delay)        # backoff before reconnecting

asyncio.run(run())`,
    },
    {
      lang: 'java', label: 'Java (java.net.http)',
      code: `HttpClient client = HttpClient.newHttpClient();

WebSocket ws = client.newWebSocketBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .buildAsync(URI.create("wss://chat.example/live"), new WebSocket.Listener() {
        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            System.out.println("Server says: " + data);
            webSocket.request(1);            // ready for the next message
            return null;
        }
        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int status, String reason) {
            scheduleReconnectWithBackoff();  // then re-auth + resubscribe
            return null;
        }
    })
    .join();

ws.sendText("{\\"type\\":\\"join\\",\\"room\\":\\"support\\"}", true);
ws.sendText("{\\"type\\":\\"message\\",\\"text\\":\\"Hello!\\"}", true);  // same connection`,
    },
  ],
  sse: [
    {
      lang: 'javascript', label: 'Browser + Node server',
      code: `// ---- Browser: one long-lived HTTP response, parsed into events ----
const scores = new EventSource('/live/scores')

scores.addEventListener('score', (e) => showScore(JSON.parse(e.data)))

scores.onerror = () => {
  // No reconnect code needed: EventSource retries automatically and
  // sends a Last-Event-ID header so the server can resume.
  console.log('Connection lost, the browser will retry…')
}

// ---- Server (Express): keep the response open and keep writing ----
app.get('/live/scores', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
  res.flushHeaders()
  const since = req.get('Last-Event-ID')            // resume point after a drop
  const unsubscribe = onScore(since, (s) => {
    res.write(\`id: \${s.id}\\nevent: score\\ndata: \${JSON.stringify(s)}\\n\\n\`)
  })
  req.on('close', unsubscribe)                      // client went away
})`,
    },
    {
      lang: 'python', label: 'Python server (FastAPI)',
      code: `import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/live/scores")
async def live_scores(request: Request):
    since = request.headers.get("last-event-id")     # resume point after a drop

    async def events():
        async for s in score_updates(since):          # your source of updates
            if await request.is_disconnected():
                break
            yield f"id: {s['id']}\\nevent: score\\ndata: {json.dumps(s)}\\n\\n"

    # The response never "finishes" — it stays open and keeps streaming.
    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})`,
    },
    {
      lang: 'java', label: 'Java client',
      code: `HttpClient client = HttpClient.newHttpClient();

HttpRequest.Builder builder = HttpRequest
    .newBuilder(URI.create("https://scores.example/live/scores"))
    .header("Accept", "text/event-stream");
if (lastSeenId != null) builder.header("Last-Event-ID", lastSeenId);  // resume

// One request whose response keeps going; read it line by line.
client.send(builder.build(), HttpResponse.BodyHandlers.ofLines())
    .body()
    .forEach(line -> {
        if (line.startsWith("id: ")) lastSeenId = line.substring(4);
        else if (line.startsWith("data: ")) showScore(line.substring(6));
    });

// Java has no auto-retry: when the stream ends or fails,
// wait (with backoff) and send the request again.`,
    },
  ],
}

export const DOUBTS: Doubt[] = [
  {
    q: 'Is gRPC faster than REST?',
    a: 'Not by magic. gRPC’s advantages are: it always reuses one multiplexed HTTP/2 connection, Protobuf messages are small and quick to parse, and code is generated for both sides. A REST client that pools connections over HTTP/2 closes much of the speed gap.\ngRPC clearly wins for many small internal calls, streaming, and strict contracts between teams. REST wins for browsers, public APIs, caching, and debugging with `curl`.',
  },
  {
    q: 'Why not just use WebSocket for everything?',
    a: 'You would give up what HTTP gives you for free: caching and CDNs, standard status codes, per-request load balancing, simple retries, and tools everyone knows. You would also have to rebuild request/response yourself (request IDs, errors, timeouts), and every client pins an open connection on one server.\nUse WebSocket when you truly need low-latency messages in both directions.',
  },
  {
    q: 'Does HTTP/2 make connection pools unnecessary?',
    a: 'Mostly, but not completely. One HTTP/2 connection can carry many requests at once, so you need far fewer connections. But servers limit concurrent streams per connection (often around 100), one lost TCP packet stalls every stream on that connection, and one connection is pinned to one backend.\nHigh-throughput clients sometimes still keep a few HTTP/2 connections per destination.',
  },
  {
    q: 'Is REST stateless if it uses a persistent connection?',
    a: 'Yes — these answer different questions. Stateless means each request carries everything needed to understand it (IDs, auth token), so any server can answer it. Persistent means the transport connection stays open for more requests.\nA stateless request can travel over a persistent connection, and the next one can travel over a different connection to a different server.',
  },
  {
    q: 'Why is my first request slow but the next ones fast?',
    a: 'The first request pays for DNS, the TCP handshake, the TLS handshake, and TCP slow start. Later requests reuse the warm connection.\nFixes: reuse clients, open connections at startup (“pre-warming”), and in browsers use `<link rel="preconnect" href="https://api.example">` to start the handshake before it is needed.',
  },
  {
    q: 'How many connections can one server handle?',
    a: 'There is no fixed number. The limits are file descriptors (`ulimit -n`), memory per connection (kernel buffers + TLS state + your app’s state), and CPU for the traffic they carry. Idle connections are cheap; a well-tuned server can hold hundreds of thousands. Busy connections are limited by the work they do.\nMeasure memory per connection, then multiply by the number of clients connected at the same time.',
  },
  {
    q: 'Does an open connection mean the user is logged in?',
    a: 'No. TCP only says “we can exchange bytes”. TLS encrypts the traffic and proves the server’s identity. Your app checks who the user is separately — a cookie, a token, or a client certificate.\nYou can have a perfectly healthy connection and still get `401 Unauthorized`.',
  },
  {
    q: 'Is one gRPC channel exactly one TCP connection?',
    a: 'No. A channel is a manager. It may have zero connections (before the first call), one, or several (one per backend when load balancing). It reconnects by itself when a connection breaks.\nThat’s why you create one channel per target service and share it, rather than one per call.',
  },
  {
    q: 'What happens to a request when the connection breaks in the middle?',
    a: 'The outcome is unknown: the server may or may not have done the work. Retry automatically only if repeating is harmless (reads, or writes with an idempotency key the server deduplicates). Otherwise, ask the server what happened before retrying.',
  },
]
