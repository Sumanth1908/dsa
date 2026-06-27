import React, { useState, useEffect, useRef } from 'react'

interface Server { id: number; label: string; x: number; y: number; requests: number; active: boolean }
interface Request { id: number; from: { x: number; y: number }; to: { x: number; y: number }; progress: number; serverId: number; color: string }

type Strategy = 'round-robin' | 'least-connections' | 'random'

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4']
const INITIAL_SERVERS: Server[] = [
  { id: 0, label: 'Server A', x: 500, y: 80,  requests: 0, active: true },
  { id: 1, label: 'Server B', x: 500, y: 200, requests: 0, active: true },
  { id: 2, label: 'Server C', x: 500, y: 320, requests: 0, active: true },
]

export default function LoadBalancingVisualizer() {
  const [strategy, setStrategy] = useState<Strategy>('round-robin')
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS.map(s => ({ ...s })))
  const [requests, setRequests] = useState<Request[]>([])
  const [rrIndex, setRrIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>(['Load balancer ready. Click Start to send requests.'])
  const reqIdRef = useRef(0)
  const rrRef = useRef(0)

  const reset = () => {
    setRunning(false)
    setServers(INITIAL_SERVERS.map(s => ({ ...s })))
    setRequests([])
    rrRef.current = 0
    setRrIndex(0)
    setLog(['Reset. Click Start to send requests.'])
  }

  const pickServer = (srvs: Server[], strat: Strategy): number => {
    const active = srvs.filter(s => s.active)
    if (active.length === 0) return -1
    if (strat === 'round-robin') {
      const idx = rrRef.current % active.length
      rrRef.current++
      return active[idx].id
    }
    if (strat === 'least-connections') {
      return active.reduce((min, s) => s.requests < srvs[min].requests ? s.id : min, active[0].id)
    }
    return active[Math.floor(Math.random() * active.length)].id
  }

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setServers(prev => {
        const sid = pickServer(prev, strategy)
        if (sid === -1) return prev
        const server = prev[sid]
        const reqId = ++reqIdRef.current
        const color = COLORS[reqId % COLORS.length]

        setRequests(r => [...r, {
          id: reqId,
          from: { x: 100, y: 200 },
          to: { x: server.x - 40, y: server.y },
          progress: 0,
          serverId: sid,
          color,
        }])

        setLog(l => [`→ Request #${reqId} → ${server.label} (${strategy})`, ...l.slice(0, 6)])
        return prev.map(s => s.id === sid ? { ...s, requests: s.requests + 1 } : s)
      })
    }, 900)
    return () => clearInterval(interval)
  }, [running, strategy])

  // Animate requests
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setRequests(prev => prev
        .map(r => ({ ...r, progress: r.progress + 0.04 }))
        .filter(r => r.progress < 1)
      )
    })
    return () => cancelAnimationFrame(raf)
  }, [requests])

  const lbX = 200, lbY = 200
  const clientX = 60, clientY = 200

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Load Balancing</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Distribute incoming requests across multiple servers</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['round-robin', 'least-connections', 'random'] as Strategy[]).map(s => (
          <button key={s} onClick={() => { setStrategy(s); reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              strategy === s ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {s}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setRunning(r => !r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${running ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            Reset
          </button>
        </div>
      </div>

      <div className="viz-container">
        <svg width={620} height={420} className="block w-full max-w-2xl mx-auto" viewBox="0 0 620 420">
          {/* Client */}
          <g transform={`translate(${clientX},${clientY})`}>
            <rect x={-30} y={-25} width={60} height={50} rx={8} className="fill-slate-200 dark:fill-slate-700" />
            <text textAnchor="middle" dy="0.35em" fontSize={11} className="fill-slate-600 dark:fill-slate-300" fontWeight="600">Client</text>
          </g>

          {/* Client → LB */}
          <line x1={clientX + 30} y1={clientY} x2={lbX - 45} y2={lbY} stroke="currentColor" strokeWidth={2} strokeDasharray="6,4" className="text-slate-300 dark:text-slate-700" />

          {/* Load Balancer */}
          <g transform={`translate(${lbX},${lbY})`}>
            <rect x={-45} y={-30} width={90} height={60} rx={10} className="fill-rose-500" />
            <text textAnchor="middle" dy={-5} fontSize={10} fill="white" fontWeight="700">Load</text>
            <text textAnchor="middle" dy={10} fontSize={10} fill="white" fontWeight="700">Balancer</text>
          </g>

          {/* LB → Servers */}
          {INITIAL_SERVERS.map(s => (
            <line key={s.id} x1={lbX + 45} y1={lbY} x2={s.x - 50} y2={s.y} stroke="currentColor" strokeWidth={1.5} strokeDasharray="4,3" className="text-slate-300 dark:text-slate-700" />
          ))}

          {/* Servers */}
          {servers.map(s => (
            <g key={s.id} transform={`translate(${s.x},${s.y})`}>
              <rect x={-50} y={-30} width={100} height={60} rx={10} className={s.active ? 'fill-slate-100 dark:fill-slate-800' : 'fill-slate-300 dark:fill-slate-600'} stroke={s.active ? '#6366f1' : '#94a3b8'} strokeWidth={2} />
              <text textAnchor="middle" dy={-8} fontSize={11} className="fill-slate-700 dark:fill-slate-200" fontWeight="600">{s.label}</text>
              <text textAnchor="middle" dy={8} fontSize={12} className="fill-violet-600 dark:fill-violet-400" fontWeight="700">{s.requests} req</text>
            </g>
          ))}

          {/* Animated requests */}
          {requests.map(r => {
            const x = r.from.x + (r.to.x - r.from.x) * r.progress
            const y = r.from.y + (r.to.y - r.from.y) * r.progress
            return (
              <circle key={r.id} cx={x} cy={y} r={7} fill={r.color} opacity={1 - r.progress * 0.5} />
            )
          })}
        </svg>

        {/* Strategy explanation */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Strategy</h4>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {strategy === 'round-robin' && 'Routes each request to the next server in a circular sequence. Simple and fair for uniform request sizes.'}
              {strategy === 'least-connections' && 'Routes to the server with fewest active connections. Best for varying request durations.'}
              {strategy === 'random' && 'Picks a server randomly. Simple but may cause uneven distribution in small samples.'}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Log</h4>
            <div className="space-y-0.5">
              {log.map((l, i) => (
                <div key={i} className={`text-xs font-mono ${i === 0 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Request distribution bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Request Distribution</h4>
        <div className="space-y-2">
          {servers.map(s => {
            const total = servers.reduce((a, b) => a + b.requests, 0)
            const pct = total ? Math.round((s.requests / total) * 100) : 0
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16">{s.label}</span>
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-slate-500 w-16">{s.requests} req ({pct}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
