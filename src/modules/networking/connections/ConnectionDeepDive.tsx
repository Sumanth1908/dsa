import { useState } from 'react'

interface Chapter {
  title: string
  question: string
  parts: { title: string; text: string }[]
  example?: { title: string; text: string }
  remember: string
}

const CHAPTERS: Chapter[] = [
  {
    title: 'Sockets: what your code and the OS actually do',
    question: 'What do socket(), listen(), accept() and connect() mean?',
    parts: [
      { title: 'A socket is a handle', text: 'Your program asks the operating system for a socket and gets back a small number (a “file descriptor”, like 7). All reading and writing goes through that handle. The number only means something inside your process.' },
      { title: 'The server opens a door', text: 'The server binds a socket to a port (e.g. 443) and calls listen(). The OS now queues incoming connection attempts for it. No connection exists yet.' },
      { title: 'The client knocks', text: 'The client calls connect() with the server’s IP and port. The OS picks a free local port for the client and runs the TCP handshake.' },
      { title: 'The server accepts one caller', text: 'accept() takes one finished connection from the queue and returns a new socket just for that client. The listening socket stays open for the next caller.' },
      { title: 'How a connection is identified', text: 'By four values: client IP, client port, server IP, server port. That’s why thousands of clients can all connect to port 443 — each connection differs in the client half.' },
    ],
    example: { title: 'The lifecycle', text: 'SERVER                          CLIENT\nsocket()                        socket()\nbind(port 443)\nlisten()                        connect(203.0.113.20:443)\n          <--- TCP handshake --->\naccept() → new socket\nread / write          <------>  read / write\nclose()                         close()\n\nFrameworks (Express, gRPC servers, WebSocket libraries) make these calls for you.' },
    remember: 'listen() opens the door; accept() gives you one conversation; four values identify it.',
  },
  {
    title: 'Bytes vs messages: why every protocol needs framing',
    question: 'If I send “HELLO” and then “WORLD”, what does the other side receive?',
    parts: [
      { title: 'TCP carries a stream of bytes, not messages', text: 'TCP guarantees the bytes arrive in order. It does not keep your message boundaries. The receiver might read “HELLOWORLD” at once, or “HEL”, “LOWO”, “RLD”.' },
      { title: 'So protocols add framing', text: 'Every protocol on top of TCP defines where one message ends: HTTP/1.1 uses headers plus Content-Length, HTTP/2 and gRPC use length-prefixed frames, WebSocket uses frames with a length field.' },
      { title: 'One message is not one packet', text: 'A large response spans many packets; several small writes may share one. Never count messages by counting packets.' },
    ],
    example: { title: 'Length-prefix framing', text: 'You write:        [HELLO] [WORLD]\nTCP delivers:      H E L L O W O R L D   (any split)\nWith framing:      5 H E L L O 5 W O R L D\nReceiver:          read length 5 → read 5 bytes → “HELLO”, repeat' },
    remember: 'TCP moves ordered bytes; the protocol on top decides where messages begin and end.',
  },
  {
    title: 'Buffers, flow control, and backpressure',
    question: 'If send() succeeded, did the other side get my message?',
    parts: [
      { title: 'send() only means “queued locally”', text: 'Your bytes go into the OS’s send buffer. A successful send() says nothing about whether the other application has read them, let alone acted on them.' },
      { title: 'Four different kinds of “success”', text: '1) your OS accepted the bytes, 2) the other OS received them, 3) the other app processed them, 4) you received its reply. Only the last one tells you the operation happened.' },
      { title: 'Flow control', text: 'The receiver tells the sender how much buffer space it has left. If the receiving app reads slowly, the sender is forced to slow down.' },
      { title: 'Backpressure must reach your code', text: 'If your app keeps pushing messages into an unbounded in-memory queue because the socket is slow, memory grows until the process dies. Bound your queues, and slow down or drop when a consumer can’t keep up — especially for WebSocket and streaming servers with slow clients.' },
    ],
    remember: 'Queued locally ≠ received ≠ processed. Bound every queue.',
  },
  {
    title: 'Head-of-line blocking: HTTP/1.1 vs HTTP/2 vs HTTP/3',
    question: 'Why did each HTTP version change how connections are used?',
    parts: [
      { title: 'HTTP/1.1: one request at a time per connection', text: 'A slow response blocks every request behind it on that connection. Browsers work around this by opening ~6 connections per host — paying 6 handshakes.' },
      { title: 'HTTP/2: many streams on one connection', text: 'Requests are split into frames tagged with stream IDs and interleaved. A slow response no longer blocks others at the HTTP level, so one connection is enough.' },
      { title: 'But TCP still delivers bytes in order', text: 'If one TCP packet is lost, every stream on that connection waits for its retransmission — even streams whose data already arrived. On lossy networks this can make HTTP/2 slower than several HTTP/1.1 connections.' },
      { title: 'HTTP/3: streams without TCP', text: 'QUIC runs over UDP and tracks each stream separately, so a lost packet only delays its own stream. It also combines the transport and TLS handshakes and can survive network switches.' },
    ],
    example: { title: 'One lost packet', text: 'HTTP/1.1  conn 1: [A■■ lost ■■]  conn 2: [B■■■■■]   → only A waits\nHTTP/2    one conn: [A■ B■ lost C■ A■]            → A, B and C all wait\nHTTP/3    one conn: [A■ B■ lost C■ A■]            → only the lost stream waits' },
    remember: 'HTTP/2 fixed blocking between requests; HTTP/3 also fixed blocking caused by lost packets.',
  },
  {
    title: 'Proxies and load balancers',
    question: 'Am I really connected to the application server?',
    parts: [
      { title: 'Usually, no', text: 'Browser → CDN → load balancer → app server → database can be four separate connections, each with its own timeouts and TLS. “The connection” means one hop at a time.' },
      { title: 'L4 vs L7 load balancers', text: 'An L4 (transport) load balancer picks a backend once per TCP connection and then just forwards bytes. An L7 (HTTP) load balancer reads each request and can send each one to a different backend.' },
      { title: 'Why long-lived connections balance badly', text: 'With an L4 balancer, every request on a connection goes to the same backend. A gRPC client with one HTTP/2 connection can send all its traffic to one pod while new pods get nothing. Fixes: client-side load balancing, an L7 proxy (Envoy, service mesh), or making servers close connections after a maximum age so clients reconnect and spread out.' },
      { title: 'WebSockets make servers stateful', text: 'A user’s WebSocket lives on one specific server. To reach a user connected elsewhere, servers publish messages through a shared channel (e.g. Redis pub/sub). During deploys, drain connections gradually or everyone reconnects at once.' },
    ],
    example: { title: 'Connections are per hop', text: 'Browser ──conn A (HTTP/2, TLS)──▶ Load balancer ──conn B (HTTP/1.1)──▶ App server ──conn C (pool)──▶ Postgres\n\nA, B and C have different lifetimes, timeouts and protocols.' },
    remember: 'Count connections per hop. Long-lived connections need request-aware (L7) or client-side balancing.',
  },
  {
    title: 'From your code to the wire',
    question: 'How do bytes physically leave the machine and cross the internet?',
    parts: [
      { title: 'Inside the computer', text: 'Your app runs on the CPU with its data in RAM. It hands bytes to the OS kernel, which runs TCP/IP and queues packets. A driver passes them to the network card (NIC), which copies them from memory directly (DMA) and turns them into signals.' },
      { title: 'Signals on one link', text: 'Bits become voltages on copper, light pulses in fiber, or radio waves for Wi-Fi. Each link only connects neighbours — laptop to router, router to ISP. Bandwidth is how much fits per second; latency is how long the trip takes.' },
      { title: 'Local delivery (Ethernet / Wi-Fi)', text: 'Frames are addressed by MAC address to the next device on the local network — usually your router. ARP finds the router’s MAC from its IP.' },
      { title: 'Across networks (IP)', text: 'Each IP packet carries the final destination address. Every router looks at it and forwards the packet one hop closer. Your home router rewrites your private address to its public one (NAT) and remembers the mapping so replies find their way back.' },
      { title: 'Envelopes inside envelopes', text: 'Your HTTP request is encrypted by TLS, carried in TCP segments, placed in IP packets, wrapped in Ethernet/Wi-Fi frames, and sent as signals. The receiver unwraps it in reverse order.' },
      { title: 'Why this matters for connections', text: 'None of these lower layers “has” your connection. Routers just forward packets; the connection exists only as state at the two endpoints. That’s why a NAT timeout or a network switch can silently break it.' },
    ],
    example: { title: 'Nesting of one HTTPS request', text: 'Ethernet/Wi-Fi frame   (to: router’s MAC)\n  IP packet            (to: 203.0.113.20)\n    TCP segment        (to: port 443)\n      TLS record       (encrypted)\n        HTTP request   GET /products/123' },
    remember: 'Frames reach the next device, IP reaches the destination, TCP keeps the conversation, the app reads the request.',
  },
  {
    title: 'Debugging “it can’t connect”',
    question: 'Which step failed?',
    parts: [
      { title: 'Walk the setup steps in order', text: 'DNS → TCP → TLS → HTTP → application. The error tells you which step failed — and each step has different causes.' },
      { title: 'Know the classic errors', text: 'See the table below. An HTTP error such as 503 proves DNS, TCP and TLS all worked — the problem is further up.' },
      { title: 'Check which hop you mean', text: 'A load balancer can be healthy while its connection to your app is broken. Note exactly which address the client contacted and which side’s logs you are reading.' },
      { title: 'Separate waiting from working', text: 'Measure pool wait time, connection setup time and server time separately. A “timeout” might mean the request never left your pool.' },
    ],
    example: { title: 'Error → most likely meaning', text: 'ENOTFOUND / NXDOMAIN        DNS: the name doesn’t resolve\nECONNREFUSED                TCP: reached the host, nothing listening on that port\nETIMEDOUT (connect)         TCP: no answer — firewall, wrong IP, host down\nCERT / TLS handshake error  TLS: expired or wrong certificate, clock skew\nECONNRESET                  Connection killed — often reused after the server closed it\nPool acquire timeout        Your own pool is full; the request never left\n502 / 504 from a proxy      Proxy is fine; its upstream failed or was too slow\n401 / 403                   Everything connected; you are not authorised' },
    remember: 'Name the step, the hop, and the exact error before guessing at a fix.',
  },
]

export default function ConnectionDeepDive() {
  const [open, setOpen] = useState<Set<number>>(() => new Set())

  const toggle = (index: number) => setOpen(previous => {
    const next = new Set(previous)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    return next
  })

  return (
    <div id="connection-deep-dive" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(new Set(CHAPTERS.map((_, i) => i)))} className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-700">Expand all</button>
        <button type="button" onClick={() => setOpen(new Set())} className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium dark:bg-slate-800">Collapse all</button>
      </div>
      {CHAPTERS.map((chapter, index) => (
        <details key={chapter.title} open={open.has(index)} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <summary onClick={event => { event.preventDefault(); toggle(index) }} className="cursor-pointer rounded-xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500">
            <span className="font-semibold text-slate-900 dark:text-white">{String.fromCharCode(65 + index)}. {chapter.title}</span>
            <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">{chapter.question}</span>
          </summary>
          <div className="px-4 pb-4 space-y-4">
            {chapter.parts.map(part => (
              <div key={part.title}>
                <h3 className="font-semibold text-slate-900 dark:text-white">{part.title}</h3>
                <p className="mt-1">{part.text}</p>
              </div>
            ))}
            {chapter.example && (
              <figure className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <figcaption className="font-medium mb-2">{chapter.example.title}</figcaption>
                <pre className="overflow-x-auto whitespace-pre text-xs leading-6">{chapter.example.text}</pre>
              </figure>
            )}
            <p className="rounded-lg bg-violet-50 p-3 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200"><strong>Remember:</strong> {chapter.remember}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
