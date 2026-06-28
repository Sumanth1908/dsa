import React, { useState } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

const COMPARISONS = [
  { aspect: 'Connection', tcp: 'Connection-oriented (handshake required)', udp: 'Connectionless (fire and forget)' },
  { aspect: 'Reliability', tcp: 'Guaranteed delivery with retransmission', udp: 'Best-effort — packets may be lost' },
  { aspect: 'Ordering', tcp: 'Packets delivered in order (resequenced)', udp: 'No ordering — packets may arrive out-of-order' },
  { aspect: 'Speed', tcp: 'Slower due to ACKs and flow control', udp: 'Much faster — minimal protocol overhead' },
  { aspect: 'Header Size', tcp: '20–60 bytes (complex header)', udp: '8 bytes (src/dst port, length, checksum only)' },
  { aspect: 'Flow Control', tcp: 'Yes — window sizing prevents overwhelming receiver', udp: 'No — sender can overwhelm the receiver' },
  { aspect: 'Use Cases', tcp: 'HTTP, SMTP, SSH, FTP, file transfer', udp: 'DNS, gaming, video streaming, VoIP' },
  { aspect: 'Error Checking', tcp: 'Checksums + retransmission on error', udp: 'Checksums only — no retransmission' },
]

export default function UDPVsTCPVisualizer() {
  const [activeRow, setActiveRow] = useState<number | null>(null)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">UDP vs TCP</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Two transport layer protocols with very different trade-offs
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>UDP is a <strong>"fire and forget"</strong> protocol. You send a datagram and never know if it arrived. No handshake, no acknowledgement, no retransmission, no ordering guarantee. This sounds terrible — but it's exactly what you want when speed matters more than completeness. A video call dropping 1% of packets is invisible to human eyes. But TCP's retransmission of that lost packet would arrive 200ms late, causing the entire stream to freeze waiting for it — far worse than just skipping it.</p>
        <p><strong>DNS uses UDP</strong> because a lookup is one request + one response — if the response doesn't arrive in 500ms, you just send a new request. The overhead of a TCP handshake would double the latency for every domain lookup.</p>
        <p><strong>QUIC (HTTP/3)</strong> is the modern answer to the UDP vs TCP dilemma. It runs on top of UDP but implements its own reliability, multiplexing, and congestion control — solving TCP's "head of line blocking" problem where one lost packet blocks all streams. Chrome and most Google services use QUIC. You're likely using it right now.</p>
      </div>

      {/* Animated packet comparison */}
      <div className="viz-container p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* TCP */}
          <div>
            <h3 className="text-center font-bold text-violet-600 dark:text-violet-400 mb-4">TCP</h3>
            <svg width="100%" height={200} viewBox="0 0 260 200">
              {/* Client */}
              <rect x={0} y={80} width={50} height={40} rx={6} className="fill-violet-100 dark:fill-violet-950" />
              <text x={25} y={100} textAnchor="middle" fontSize={10} className="fill-violet-700 dark:fill-violet-300" fontWeight="600" dy="0.35em">Client</text>

              {/* Server */}
              <rect x={210} y={80} width={50} height={40} rx={6} className="fill-violet-100 dark:fill-violet-950" />
              <text x={235} y={100} textAnchor="middle" fontSize={10} className="fill-violet-700 dark:fill-violet-300" fontWeight="600" dy="0.35em">Server</text>

              {/* Handshake */}
              {[
                { label: 'SYN →', y: 20, dir: 'right' },
                { label: '← SYN-ACK', y: 50, dir: 'left' },
                { label: 'ACK →', y: 80, dir: 'right' },
                { label: 'DATA →', y: 110, dir: 'right' },
                { label: '← ACK', y: 140, dir: 'left' },
              ].map((p, i) => (
                <g key={i}>
                  <line
                    x1={p.dir === 'right' ? 52 : 208}
                    y1={p.y + 5}
                    x2={p.dir === 'right' ? 208 : 52}
                    y2={p.y + 5}
                    stroke={i >= 3 ? '#6366f1' : '#94a3b8'} strokeWidth={i >= 3 ? 2 : 1.5} strokeDasharray={i >= 3 ? '0' : '4,3'}
                  />
                  <text x={130} y={p.y} textAnchor="middle" fontSize={9} className={i >= 3 ? 'fill-violet-600 dark:fill-violet-400' : 'fill-slate-500 dark:fill-slate-500'} fontWeight={i >= 3 ? '600' : '400'}>
                    {p.label}
                  </text>
                </g>
              ))}
              <text x={130} y={185} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">Reliable, ordered, slower</text>
            </svg>
          </div>

          {/* UDP */}
          <div>
            <h3 className="text-center font-bold text-amber-600 dark:text-amber-400 mb-4">UDP</h3>
            <svg width="100%" height={200} viewBox="0 0 260 200">
              <rect x={0} y={80} width={50} height={40} rx={6} className="fill-amber-100 dark:fill-amber-950" />
              <text x={25} y={100} textAnchor="middle" fontSize={10} className="fill-amber-700 dark:fill-amber-300" fontWeight="600" dy="0.35em">Client</text>

              <rect x={210} y={80} width={50} height={40} rx={6} className="fill-amber-100 dark:fill-amber-950" />
              <text x={235} y={100} textAnchor="middle" fontSize={10} className="fill-amber-700 dark:fill-amber-300" fontWeight="600" dy="0.35em">Server</text>

              {/* UDP packets — no handshake, no ACK */}
              {[30, 70, 110, 150].map((y, i) => (
                <g key={i}>
                  <line x1={52} y1={y + 5} x2={i === 2 ? 170 : 208} y2={y + 5}
                    stroke="#f59e0b" strokeWidth={2} />
                  {i === 2 && (
                    <>
                      <line x1={170} y1={y + 5} x2={210} y2={y + 30} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,3" />
                      <text x={185} y={y + 25} fontSize={9} className="fill-rose-500">lost</text>
                    </>
                  )}
                  <text x={130} y={y} textAnchor="middle" fontSize={9} className="fill-amber-600 dark:fill-amber-400" fontWeight="600">
                    {i === 2 ? 'PKT #3 →' : `PKT #${i + 1} →`}
                  </text>
                </g>
              ))}
              <text x={130} y={185} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">Fast, unreliable, stateless</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 py-3">Aspect</div>
          <div className="px-4 py-3 text-violet-600 dark:text-violet-400">TCP</div>
          <div className="px-4 py-3 text-amber-600 dark:text-amber-400">UDP</div>
        </div>
        {COMPARISONS.map((row, i) => (
          <div
            key={i}
            onClick={() => setActiveRow(activeRow === i ? null : i)}
            className={`grid grid-cols-3 cursor-pointer transition-colors ${
              activeRow === i ? 'bg-slate-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            } ${i < COMPARISONS.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
          >
            <div className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{row.aspect}</div>
            <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.tcp}</div>
            <div className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.udp}</div>
          </div>
        ))}
      </div>

      {/* Use case cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
          <h3 className="font-bold text-violet-700 dark:text-violet-300 mb-2">Choose TCP when…</h3>
          <ul className="space-y-1 text-sm text-violet-700 dark:text-violet-400">
            <li>• Data integrity is critical (financial, file transfer)</li>
            <li>• Order matters (HTTP, API requests)</li>
            <li>• You can afford the latency overhead</li>
          </ul>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-bold text-amber-700 dark:text-amber-300 mb-2">Choose UDP when…</h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            <li>• Speed is more important than reliability</li>
            <li>• A few dropped packets are acceptable (video, VoIP)</li>
            <li>• You implement your own reliability layer (QUIC)</li>
          </ul>
        </div>
      </div>

      <CodeBlock examples={[
        {
          lang: 'javascript' as const, label: 'JavaScript (dgram)',
          code: `const dgram = require('dgram')

// ─── UDP SERVER ────────────────────────────────────────────────
const server = dgram.createSocket('udp4')

server.on('message', (msg, rinfo) => {
    console.log(\`UDP packet from \${rinfo.address}:\${rinfo.port}: \${msg}\`)
    // Reply back — but no guarantee client receives it
    server.send('ACK', rinfo.port, rinfo.address)
})

server.bind(41234, () => console.log('UDP server listening on :41234'))

// ─── UDP CLIENT ────────────────────────────────────────────────
const client = dgram.createSocket('udp4')

// Fire and forget — no connection, no handshake
const message = Buffer.from('Hello UDP')
client.send(message, 41234, 'localhost', (err) => {
    if (err) console.error('Send failed:', err)
    else console.log('Packet sent (but delivery not guaranteed)')
    client.close()
})

// ─── DNS LOOKUP (UDP under the hood) ──────────────────────────
const dns = require('dns')
// This sends a UDP packet to port 53 of your DNS resolver
dns.lookup('google.com', (err, address) => {
    console.log('Resolved:', address)  // UDP round-trip < 1ms typically
})`,
        },
        {
          lang: 'python' as const, label: 'Python (socket UDP)',
          code: `import socket
import threading

# ─── UDP SERVER ────────────────────────────────────────────────
def udp_server():
    # SOCK_DGRAM = UDP (vs SOCK_STREAM = TCP)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.bind(('0.0.0.0', 41234))
        print('UDP server listening on :41234')

        while True:
            # recvfrom returns (data, (address, port)) — no connection object
            data, addr = s.recvfrom(1024)
            print(f'Received {len(data)} bytes from {addr}: {data.decode()}')
            # Reply — but client might never receive it
            s.sendto(b'ACK', addr)

# ─── UDP CLIENT ────────────────────────────────────────────────
def udp_client():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        # No connect() — UDP is connectionless
        s.sendto(b'Hello UDP', ('localhost', 41234))

        # Set timeout — no guarantee we'll get a reply
        s.settimeout(2.0)
        try:
            data, addr = s.recvfrom(1024)
            print(f'Got reply: {data.decode()}')
        except socket.timeout:
            print('No reply within 2s — packet likely lost')`,
        },
        {
          lang: 'java' as const, label: 'Java (DatagramSocket)',
          code: `import java.net.*;

// ─── UDP SERVER ────────────────────────────────────────────────
public class UDPServer {
    public static void main(String[] args) throws Exception {
        DatagramSocket socket = new DatagramSocket(41234);
        byte[] buffer = new byte[1024];
        System.out.println("UDP server on :41234");

        while (true) {
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            socket.receive(packet);   // blocks until datagram arrives

            String msg = new String(packet.getData(), 0, packet.getLength());
            System.out.println("Received: " + msg + " from " + packet.getAddress());

            // Send reply — best effort, no guarantee
            byte[] reply = "ACK".getBytes();
            socket.send(new DatagramPacket(reply, reply.length,
                packet.getAddress(), packet.getPort()));
        }
    }
}

// ─── UDP CLIENT ────────────────────────────────────────────────
public class UDPClient {
    public static void main(String[] args) throws Exception {
        DatagramSocket socket = new DatagramSocket();
        byte[] data = "Hello UDP".getBytes();
        InetAddress addr = InetAddress.getByName("localhost");

        // Single packet — no handshake, no ACK
        socket.send(new DatagramPacket(data, data.length, addr, 41234));
        System.out.println("Datagram sent");
        socket.close();
    }
}`,
        },
      ]} />
    </div>
  )
}
