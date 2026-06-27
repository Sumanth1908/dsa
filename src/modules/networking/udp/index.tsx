import React, { useState } from 'react'

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
    </div>
  )
}
