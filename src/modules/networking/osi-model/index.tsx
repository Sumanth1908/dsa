import React, { useState } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

interface Layer {
  number: number
  name: string
  fullName: string
  function: string
  protocols: string[]
  dataUnit: string
  analogy: string
  lbType?: string
  color: string
  bg: string
  border: string
}

const LAYERS: Layer[] = [
  {
    number: 7, name: 'Application', fullName: 'Application Layer',
    function: 'Human-computer interaction — where apps and users meet the network',
    protocols: ['HTTP', 'HTTPS', 'DNS', 'SSH', 'FTP', 'SMTP', 'MQTT', 'WebSocket'],
    dataUnit: 'Data / Message',
    analogy: 'You decide to write a letter and choose the language (English)',
    lbType: 'L7 Load Balancer',
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-300 dark:border-violet-700',
  },
  {
    number: 6, name: 'Presentation', fullName: 'Presentation Layer',
    function: 'Data formatting, encryption, and compression — makes data readable to Layer 7',
    protocols: ['SSL/TLS', 'JPEG', 'MPEG', 'GIF', 'ASCII', 'JSON', 'XML'],
    dataUnit: 'Data',
    analogy: 'You encrypt the letter with a secret code or compress it to save space',
    color: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-300 dark:border-indigo-700',
  },
  {
    number: 5, name: 'Session', fullName: 'Session Layer',
    function: 'Manage inter-host communication sessions — open, maintain, close',
    protocols: ['RPC', 'NetBIOS', 'PPTP', 'SAP'],
    dataUnit: 'Data',
    analogy: 'Check if the recipient is available and start the conversation',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-700',
  },
  {
    number: 4, name: 'Transport', fullName: 'Transport Layer',
    function: 'End-to-end delivery, segmentation, flow control, and reliability',
    protocols: ['TCP', 'UDP', 'SCTP'],
    dataUnit: 'Segment (TCP) / Datagram (UDP)',
    analogy: 'Number the pages (1/3, 2/3, 3/3) so they can be reassembled if dropped',
    lbType: 'L4 Load Balancer',
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-300 dark:border-sky-700',
  },
  {
    number: 3, name: 'Network', fullName: 'Network Layer',
    function: 'Logical addressing (IP) and routing — path determination across networks',
    protocols: ['IP (v4/v6)', 'ICMP', 'ARP', 'OSPF', 'BGP'],
    dataUnit: 'Packet',
    analogy: 'Write the full address on the envelope (Zip Code, City, Country)',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    number: 2, name: 'Data Link', fullName: 'Data Link Layer',
    function: 'Physical addressing (MAC), framing, and local error detection',
    protocols: ['Ethernet', 'Wi-Fi (802.11)', 'PPP', 'Switch'],
    dataUnit: 'Frame',
    analogy: 'Mail truck takes the envelope to the specific local sorting facility',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
  },
  {
    number: 1, name: 'Physical', fullName: 'Physical Layer',
    function: 'Binary transmission — electrical signals or light pulses over a medium',
    protocols: ['Ethernet (PHY)', 'DSL', 'ISDN', 'Fiber optic', 'Radio waves'],
    dataUnit: 'Bits (0s and 1s)',
    analogy: 'The actual roads, trucks, and planes that physically carry the paper',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-700',
  },
]

// HTTP request journey — headers added at each layer going down
const JOURNEY_STEPS = [
  { layerNum: 7, label: 'Browser creates', content: 'GET /home HTTP/1.1\nHost: example.com\nAccept: text/html' },
  { layerNum: 6, label: 'TLS encrypts', content: '🔒 TLS record wraps HTTP data\n[EncryptedData: 3a8f...c92d]' },
  { layerNum: 5, label: 'Session opened', content: 'Session ID: 0x4A2F\nTLS handshake complete' },
  { layerNum: 4, label: 'TCP segment', content: 'Src port: 54321  Dst port: 443\nSeq: 1001  Ack: 501\n[Flags: PSH, ACK]' },
  { layerNum: 3, label: 'IP packet', content: 'Src IP: 192.168.1.10\nDst IP: 93.184.216.34\nTTL: 64  Protocol: TCP' },
  { layerNum: 2, label: 'Ethernet frame', content: 'Src MAC: aa:bb:cc:11:22:33\nDst MAC: ff:00:12:34:56:78\n[FCS checksum]' },
  { layerNum: 1, label: 'Wire signals', content: '01000111 01000101 01010100\n01000001 00101111 01101000...\n(bits transmitted at 1 Gbps)' },
]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript (L7 — fetch)',
    code: `// You work at Layer 7 — browsers handle everything below automatically

const response = await fetch('https://api.example.com/users/42', {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': \`Bearer \${token}\`,
    },
})

// The browser + OS handle ALL of this invisibly:
// L6: TLS encryption of your request body
// L5: TCP session managed by the browser
// L4: TCP segments with port 443
// L3: IP packets with destination IP
// L2: Ethernet frames to your router's MAC
// L1: WiFi radio signals out your antenna

const user = await response.json()

// ─── L4 — Raw TCP socket (Node.js) ──────────────────────────
import net from 'net'
const socket = new net.Socket()
socket.connect(80, 'example.com', () => {
    socket.write('GET / HTTP/1.0\\r\\nHost: example.com\\r\\n\\r\\n')
})
socket.on('data', (data) => console.log(data.toString()))`,
  },
  {
    lang: 'python' as const, label: 'Python (L3/L4 — raw sockets)',
    code: `import socket
import ssl

# ─── L7 — requests library (highest level abstraction) ────────
import requests
resp = requests.get('https://api.example.com/users/42')
# Handles TLS (L6), TCP session (L5/L4), IP routing (L3), Ethernet (L2), Physical (L1)

# ─── L4 — TCP socket (control transport layer directly) ────────
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(('example.com', 80))    # TCP SYN → SYN-ACK → ACK (3-way handshake)
    s.sendall(b'GET / HTTP/1.0\\r\\nHost: example.com\\r\\n\\r\\n')
    data = s.recv(4096)

# ─── L4 with TLS (L6) ─────────────────────────────────────────
context = ssl.create_default_context()
with socket.create_connection(('example.com', 443)) as sock:
    with context.wrap_socket(sock, server_hostname='example.com') as tls_sock:
        tls_sock.sendall(b'GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n')
        data = tls_sock.recv(4096)

# ─── L3 — raw IP socket (need root privileges) ─────────────────
with socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP) as s:
    s.sendto(b'\\x08\\x00\\x00\\x00\\x00\\x01\\x00\\x01', ('8.8.8.8', 0))  # ping`,
  },
  {
    lang: 'java' as const, label: 'Java (L4 — ServerSocket)',
    code: `import java.net.*;
import java.io.*;
import javax.net.ssl.*;

// ─── L7 — HttpClient (Java 11+) ───────────────────────────────
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/42"))
    .header("Authorization", "Bearer " + token)
    .build();
HttpResponse<String> response = client.send(request, BodyHandlers.ofString());
// HttpClient handles L3-L6 automatically

// ─── L4 — Plain TCP ServerSocket (HTTP server from scratch) ───
ServerSocket serverSocket = new ServerSocket(8080);  // binds to port 8080 (L4)
while (true) {
    Socket clientSocket = serverSocket.accept();     // TCP 3-way handshake complete

    BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
    PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true);

    String requestLine = in.readLine();  // "GET /users/42 HTTP/1.1" (L7 data)
    System.out.println("Received: " + requestLine);

    out.println("HTTP/1.1 200 OK");
    out.println("Content-Type: application/json");
    out.println();
    out.println("{\"id\": 42, \"name\": \"Alice\"}");
    clientSocket.close();  // TCP FIN (L4 teardown)
}`,
  },
]

export default function OSIModelVisualizer() {
  const [activeLayer, setActiveLayer] = useState<number | null>(null)
  const [journeyStep, setJourneyStep] = useState<number | null>(null)
  const [tab, setTab] = useState<'layers' | 'journey' | 'lb'>('layers')

  const active = activeLayer != null ? LAYERS.find(l => l.number === activeLayer) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OSI Model — 7 Layers</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          How data travels from your browser to a server — each layer wraps the data with its own header before passing it down
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Postal Analogy</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Think of sending a physical letter. You write it (Layer 7), encrypt it (Layer 6), schedule delivery (Layer 5),
          number the pages (Layer 4), address the envelope (Layer 3), hand it to the mail truck (Layer 2), and it travels over roads (Layer 1).
          At the destination the process reverses — each layer peels off its wrapper to hand the payload up.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {[
          { id: 'layers' as const, label: '7 Layers' },
          { id: 'journey' as const, label: 'HTTP Request Journey' },
          { id: 'lb' as const, label: 'Load Balancer Layers' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-violet-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="viz-container p-6">
        {tab === 'layers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Layer stack */}
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 text-center mb-2 uppercase tracking-wider">Click a layer to inspect</div>
              {LAYERS.map(layer => (
                <button
                  key={layer.number}
                  onClick={() => setActiveLayer(activeLayer === layer.number ? null : layer.number)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all duration-200 ${
                    activeLayer === layer.number
                      ? `${layer.bg} ${layer.border} scale-[1.02] shadow`
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}>
                  <span className={`text-xs font-bold w-6 text-center flex-shrink-0 ${layer.color}`}>L{layer.number}</span>
                  <span className={`font-medium text-sm ${activeLayer === layer.number ? layer.color : 'text-slate-700 dark:text-slate-300'}`}>{layer.name}</span>
                  <span className="text-xs text-slate-400 ml-auto truncate">{layer.protocols.slice(0, 3).join(', ')}</span>
                  {layer.lbType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {layer.lbType}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Layer detail panel */}
            {active ? (
              <div className={`rounded-xl border-2 p-5 space-y-4 ${active.bg} ${active.border}`}>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider ${active.color}`}>Layer {active.number}</div>
                  <div className={`text-xl font-bold mt-0.5 ${active.color}`}>{active.fullName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Function</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{active.function}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Protocols</div>
                  <div className="flex flex-wrap gap-1.5">
                    {active.protocols.map(p => (
                      <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-mono border ${active.border} ${active.color} bg-white/50 dark:bg-black/20`}>{p}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data Unit</div>
                  <span className={`text-sm font-mono font-bold ${active.color}`}>{active.dataUnit}</span>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Postal Analogy</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{active.analogy}"</p>
                </div>
                {active.lbType && (
                  <div className="rounded-lg bg-slate-700 text-slate-100 px-3 py-2 text-xs">
                    <span className="font-bold">{active.lbType}:</span> operates at this layer — can inspect {active.number === 7 ? 'URLs, cookies, headers' : 'IP addresses and ports'}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                Select a layer to see details
              </div>
            )}
          </div>
        )}

        {tab === 'journey' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 text-center">An HTTP GET request travels DOWN layers 7→1 with headers added at each stop. Click a step.</p>
            {JOURNEY_STEPS.map((step, i) => {
              const layer = LAYERS.find(l => l.number === step.layerNum)!
              const isActive = journeyStep === i
              return (
                <button
                  key={i}
                  onClick={() => setJourneyStep(isActive ? null : i)}
                  className={`w-full flex gap-3 rounded-xl border-2 overflow-hidden text-left transition-all duration-200 ${
                    isActive ? `${layer.border} shadow` : 'border-slate-200 dark:border-slate-700'
                  }`}>
                  <div className={`flex-shrink-0 w-24 p-3 ${layer.bg} flex flex-col items-center justify-center`}>
                    <div className={`text-xs font-bold ${layer.color}`}>L{layer.number}</div>
                    <div className={`text-xs font-semibold ${layer.color} leading-tight text-center`}>{layer.name}</div>
                  </div>
                  <div className="flex-1 p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-1">{step.label}</div>
                    {isActive ? (
                      <pre className={`text-xs font-mono ${layer.color} whitespace-pre overflow-x-auto`}>{step.content}</pre>
                    ) : (
                      <div className="text-xs text-slate-400 truncate font-mono">{step.content.split('\n')[0]}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center pr-3 text-slate-400">
                    <span className="text-xs">{isActive ? '▲' : '▼'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'lb' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 p-4 space-y-3">
                <div className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">L4 Load Balancer</div>
                <div className="text-sm text-sky-800 dark:text-sky-200">
                  Operates at the <strong>Transport layer</strong>. Sees only IP addresses and port numbers — never looks inside the packet.
                </div>
                <div className="space-y-1.5 text-xs text-sky-700 dark:text-sky-400">
                  <div>✓ Routes based on: IP + TCP/UDP port</div>
                  <div>✓ Very fast — no packet inspection</div>
                  <div>✗ Can't route by URL, cookie, or header</div>
                  <div>✗ No sticky sessions from app context</div>
                </div>
                <div className="font-mono text-xs bg-sky-100 dark:bg-sky-950/60 rounded p-2 text-sky-800 dark:text-sky-300">
                  CLIENT:54321 → LB:443 → SERVER1:443
                </div>
              </div>
              <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 p-4 space-y-3">
                <div className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">L7 Load Balancer</div>
                <div className="text-sm text-violet-800 dark:text-violet-200">
                  Operates at the <strong>Application layer</strong>. Terminates TLS, reads HTTP headers, URLs, and cookies to make smart routing decisions.
                </div>
                <div className="space-y-1.5 text-xs text-violet-700 dark:text-violet-400">
                  <div>✓ Routes by URL path, hostname, headers</div>
                  <div>✓ Sticky sessions via cookie</div>
                  <div>✓ A/B testing, canary deployments</div>
                  <div>✓ SSL termination offloads servers</div>
                </div>
                <div className="font-mono text-xs bg-violet-100 dark:bg-violet-950/60 rounded p-2 text-violet-800 dark:text-violet-300">
                  GET /api/* → api-servers
                  GET /web/* → web-servers
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rule of thumb:</span> Use an L4 balancer when you need raw throughput and can't afford the overhead of HTTP parsing (e.g., high-frequency trading, game servers). Use an L7 balancer for web apps where routing by URL or session matters — nginx, Traefik, and AWS ALB are all L7.
            </div>
          </div>
        )}
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
