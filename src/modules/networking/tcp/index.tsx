import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'

interface Packet { from: 'client' | 'server'; label: string; flags: string; color: string; detail: string }
interface Step { phase: 'handshake' | 'data' | 'teardown'; packets: Packet[]; clientState: string; serverState: string; message: string; activePacket: number | null }

function tcpSteps(): Step[] {
  const handshake: Packet[] = [
    { from: 'client', label: 'SYN', flags: 'SYN=1, SEQ=100', color: '#6366f1', detail: 'Client initiates connection. Random ISN=100.' },
    { from: 'server', label: 'SYN-ACK', flags: 'SYN=1, ACK=1, SEQ=300, ACK=101', color: '#f59e0b', detail: 'Server acknowledges. Its own ISN=300.' },
    { from: 'client', label: 'ACK', flags: 'ACK=1, SEQ=101, ACK=301', color: '#22c55e', detail: 'Client confirms. Connection established!' },
  ]
  const data: Packet[] = [
    { from: 'client', label: 'DATA', flags: 'PSH=1, SEQ=101, len=100', color: '#6366f1', detail: 'Client sends HTTP request (100 bytes).' },
    { from: 'server', label: 'ACK', flags: 'ACK=201', color: '#f59e0b', detail: 'Server acknowledges receipt.' },
    { from: 'server', label: 'DATA', flags: 'PSH=1, SEQ=301, len=500', color: '#f59e0b', detail: 'Server sends HTTP response (500 bytes).' },
    { from: 'client', label: 'ACK', flags: 'ACK=801', color: '#6366f1', detail: 'Client acknowledges.' },
  ]
  const teardown: Packet[] = [
    { from: 'client', label: 'FIN', flags: 'FIN=1, SEQ=201', color: '#ef4444', detail: 'Client initiates graceful close.' },
    { from: 'server', label: 'ACK', flags: 'ACK=202', color: '#f59e0b', detail: 'Server acknowledges FIN.' },
    { from: 'server', label: 'FIN', flags: 'FIN=1, SEQ=801', color: '#ef4444', detail: 'Server closes its side.' },
    { from: 'client', label: 'ACK', flags: 'ACK=802', color: '#6366f1', detail: 'Client confirms. Connection fully closed.' },
  ]

  const steps: Step[] = [{ phase: 'handshake', packets: [], clientState: 'CLOSED', serverState: 'LISTEN', message: 'TCP connection lifecycle. Client: CLOSED, Server: LISTEN.', activePacket: null }]

  const allPackets: Packet[] = []
  const phaseOf = (i: number): 'handshake' | 'data' | 'teardown' => i < 3 ? 'handshake' : i < 7 ? 'data' : 'teardown'

  const CLIENT_STATES = ['CLOSED', 'SYN_SENT', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'FIN_WAIT_1', 'FIN_WAIT_2', 'TIME_WAIT', 'CLOSED']
  const SERVER_STATES = ['LISTEN', 'LISTEN', 'SYN_RCVD', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'ESTABLISHED', 'CLOSE_WAIT', 'LAST_ACK', 'CLOSED']

  const allPhasePackets = [...handshake, ...data, ...teardown]

  allPhasePackets.forEach((pkt, i) => {
    const cs = CLIENT_STATES[i + 1] || 'CLOSED'
    const ss = SERVER_STATES[i + 1] || 'CLOSED'
    allPackets.push(pkt)
    steps.push({
      phase: phaseOf(i),
      packets: [...allPackets],
      clientState: cs,
      serverState: ss,
      activePacket: allPackets.length - 1,
      message: `${pkt.label}: ${pkt.detail}`,
    })
  })

  steps.push({ phase: 'teardown', packets: allPackets, clientState: 'CLOSED', serverState: 'CLOSED', activePacket: null, message: 'TCP connection fully closed. 4-way FIN complete.' })
  return steps
}

const STATE_COLOR: Record<string, string> = {
  CLOSED: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  LISTEN: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  SYN_SENT: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  SYN_RCVD: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  ESTABLISHED: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  FIN_WAIT_1: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  FIN_WAIT_2: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  TIME_WAIT: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
  CLOSE_WAIT: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  LAST_ACK: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
}

export default function TCPVisualizer() {
  const steps = tcpSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const phases = [
    { key: 'handshake', label: '3-Way Handshake', color: 'text-violet-600 dark:text-violet-400' },
    { key: 'data', label: 'Data Transfer', color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'teardown', label: '4-Way Teardown', color: 'text-rose-600 dark:text-rose-400' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TCP Connection Lifecycle</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          3-way handshake, data transfer with ACKs, and 4-way FIN teardown
        </p>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-2">
        {phases.map(p => (
          <div key={p.key} className={`px-3 py-1 rounded-full text-xs font-medium ${cur.phase === p.key ? `${p.color} bg-slate-100 dark:bg-slate-800` : 'text-slate-400 dark:text-slate-600'}`}>
            {p.label}
          </div>
        ))}
      </div>

      {/* Sequence diagram */}
      <div className="viz-container p-6 overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Header */}
          <div className="grid grid-cols-3 mb-4">
            <div className="text-center">
              <div className="inline-block px-6 py-3 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                Client
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATE_COLOR[cur.clientState] || ''}`}>
                  {cur.clientState}
                </span>
              </div>
            </div>
            <div />
            <div className="text-center">
              <div className="inline-block px-6 py-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                Server
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${STATE_COLOR[cur.serverState] || ''}`}>
                  {cur.serverState}
                </span>
              </div>
            </div>
          </div>

          {/* Lifelines + packets */}
          <div className="relative">
            {/* Lifeline dividers */}
            <div className="absolute left-[16.6%] top-0 bottom-0 border-l-2 border-dashed border-slate-200 dark:border-slate-800" />
            <div className="absolute right-[16.6%] top-0 bottom-0 border-l-2 border-dashed border-slate-200 dark:border-slate-800" />

            <div className="space-y-3">
              {cur.packets.map((pkt, i) => {
                const isActive = cur.activePacket === i
                const isClient = pkt.from === 'client'
                return (
                  <div key={i} className={`relative flex items-center ${isClient ? 'flex-row' : 'flex-row-reverse'} gap-4 px-4 ${isActive ? 'animate-fade-in' : ''}`}>
                    <div className="w-[15%]" />
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 flex items-center relative">
                        {/* Arrow line */}
                        <div className={`flex-1 h-0.5 ${isActive ? 'opacity-100' : 'opacity-50'}`} style={{ backgroundColor: pkt.color }} />
                        {/* Arrow head */}
                        <div className={`w-0 h-0 ${isClient ? '' : 'rotate-180'}`}
                          style={{ borderTop: '6px solid transparent', borderBottom: '6px solid transparent', [isClient ? 'borderLeft' : 'borderRight']: `8px solid ${pkt.color}` }} />
                      </div>
                    </div>
                    <div className="w-[15%]" />

                    {/* Label */}
                    <div className={`absolute ${isClient ? 'left-[18%]' : 'right-[18%]'} -top-5`}>
                      <span className={`text-xs font-bold px-1 rounded ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {pkt.label}
                      </span>
                    </div>
                    <div className={`absolute ${isClient ? 'left-[18%]' : 'right-[18%]'} top-3`}>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">[{pkt.flags}]</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 mt-6 pt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      {/* Key concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Why 3-way handshake?', body: 'Both sides must agree on ISNs (Initial Sequence Numbers). SYN lets client pick its ISN, SYN-ACK lets server pick its own + confirm client\'s, final ACK confirms server\'s.' },
          { title: 'Why 4-way teardown?', body: 'TCP is full-duplex — each direction closes independently. After client sends FIN, server may still have data to send. It ACKs FIN first, finishes sending, then sends its own FIN.' },
          { title: 'TIME_WAIT state', body: 'Client waits 2×MSL (Max Segment Lifetime, ~4 min) before fully closing. This ensures the final ACK reaches server even if it\'s lost and retransmitted.' },
          { title: 'Reliability guarantees', body: 'TCP ensures: in-order delivery (via SEQ), no data loss (via ACK + retransmit), flow control (window size), congestion control (slow start, AIMD).' },
        ].map(c => (
          <div key={c.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1 text-sm">{c.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.body}</p>
          </div>
        ))}
      </div>

      <StepControls ctrl={ctrl} />
    </div>
  )
}
