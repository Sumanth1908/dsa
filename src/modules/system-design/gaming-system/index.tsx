import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface MatchStep {
  phase: 'idle' | 'queued' | 'matched' | 'spawning' | 'ready' | 'playing'
  p1: 'idle' | 'queued' | 'matched' | 'connecting' | 'playing'
  p2: 'idle' | 'queued' | 'matched' | 'connecting' | 'playing'
  serverState: 'off' | 'spawning' | 'ready' | 'running'
  message: string
}

const MATCH_STEPS: MatchStep[] = [
  {
    phase: 'idle', p1: 'idle', p2: 'idle', serverState: 'off',
    message: 'Both players are in the main menu. No game server running — servers are ephemeral, spun up per match.',
  },
  {
    phase: 'queued', p1: 'queued', p2: 'idle', serverState: 'off',
    message: 'Player 1 clicks "Find Match". Matchmaking Service adds them to the queue with their MMR (skill rating): MMR=1250.',
  },
  {
    phase: 'queued', p1: 'queued', p2: 'queued', serverState: 'off',
    message: 'Player 2 (MMR=1230) also clicks "Find Match". Matchmaking finds both players within ±50 MMR — a valid match.',
  },
  {
    phase: 'matched', p1: 'matched', p2: 'matched', serverState: 'off',
    message: 'Match created! Game Manager Service is notified to spin up a dedicated game server instance.',
  },
  {
    phase: 'spawning', p1: 'matched', p2: 'matched', serverState: 'spawning',
    message: 'Game server container starts on a free node. Registers with the Game Manager, sends back its IP:port (e.g. 10.0.2.45:7777).',
  },
  {
    phase: 'ready', p1: 'connecting', p2: 'connecting', serverState: 'ready',
    message: 'Game Manager pushes IP:port to both clients. Clients switch from HTTP to UDP, connect directly to the game server.',
  },
  {
    phase: 'playing', p1: 'playing', p2: 'playing', serverState: 'running',
    message: '🏁 Race is live! Clients send inputs (steer, accelerate) at 60Hz. Authoritative server calculates physics, broadcasts state to all players at 20Hz.',
  },
]

const SERVICES = [
  { name: 'API Gateway', icon: '🚪', role: 'Single entry point for all HTTP traffic. Routes to micro-services, handles auth validation.', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { name: 'Auth Service', icon: '🔐', role: 'Firebase Auth — user registration, JWT issuance, token validation. Stateless.', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { name: 'Matchmaking Service', icon: '🎯', role: 'Maintains queues, matches players by MMR within tolerance window. Publishes match events to Kafka.', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { name: 'Game Manager', icon: '🎮', role: 'Listens for match events. Spawns game server containers (Kubernetes Jobs). Returns IP:port to matched players.', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { name: 'Game Server (UDP)', icon: '⚡', role: 'Authoritative physics simulation. Receives player inputs, calculates positions, broadcasts world state. Ephemeral — exists per match.', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { name: 'Inventory Service', icon: '🏎️', role: 'Manages cars, items, customisations. Called by Gateway on shop/inventory requests — NOT in the hot path during a race.', color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { name: 'Event Broker (Kafka)', icon: '📨', role: 'Decouples services. match.created → Game Manager spawns server. race.finished → Leaderboard & Inventory update rewards.', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800' },
]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript (Matchmaking queue)',
    code: `import { createClient } from 'redis'
import { Kafka } from 'kafkajs'

const redis = createClient()
const kafka = new Kafka({ brokers: ['kafka:9092'] })
const producer = kafka.producer()

// ─── JOIN QUEUE ────────────────────────────────────────────────
const joinQueue = async (playerId, mmr) => {
    // Sorted set — score is MMR, used for proximity matching
    await redis.zAdd('matchmaking:queue', [{ score: mmr, value: playerId }])
    console.log(\`Player \${playerId} (MMR \${mmr}) joined queue\`)
}

// ─── MATCHMAKING LOOP (runs every 500ms) ──────────────────────
const runMatchmaking = async () => {
    const queue = await redis.zRangeWithScores('matchmaking:queue', 0, -1)

    for (let i = 0; i < queue.length - 1; i++) {
        const p1 = queue[i]
        const p2 = queue[i + 1]

        const mmrDiff = Math.abs(p1.score - p2.score)
        if (mmrDiff <= 50) {
            // Remove both from queue atomically
            await redis.zRem('matchmaking:queue', [p1.value, p2.value])

            const matchId = \`match:\${Date.now()}\`

            // Publish match.created event → Game Manager picks it up
            await producer.send({
                topic: 'match.created',
                messages: [{
                    key: matchId,
                    value: JSON.stringify({
                        matchId,
                        players: [
                            { id: p1.value, mmr: p1.score },
                            { id: p2.value, mmr: p2.score },
                        ],
                        region: 'ap-south-1',
                    }),
                }],
            })

            console.log(\`Match \${matchId}: \${p1.value} vs \${p2.value}\`)
            i++ // skip p2 in next iteration
        }
    }
}

setInterval(runMatchmaking, 500)`,
  },
  {
    lang: 'python' as const, label: 'Python (Game Manager)',
    code: `from aiokafka import AIOKafkaConsumer
from kubernetes import client as k8s_client, config as k8s_config
import asyncio, json

k8s_config.load_incluster_config()  # running inside Kubernetes
k8s = k8s_client.BatchV1Api()

# ─── LISTEN FOR MATCH EVENTS ──────────────────────────────────
async def game_manager():
    consumer = AIOKafkaConsumer(
        "match.created",
        bootstrap_servers="kafka:9092",
        group_id="game-manager",
    )
    await consumer.start()

    async for msg in consumer:
        match = json.loads(msg.value)
        asyncio.create_task(spawn_game_server(match))

# ─── SPAWN A KUBERNETES JOB PER MATCH ─────────────────────────
async def spawn_game_server(match: dict):
    match_id = match["matchId"]

    # Each match = one Kubernetes Job (ephemeral, auto-deleted on completion)
    job = k8s_client.V1Job(
        metadata=k8s_client.V1ObjectMeta(name=f"game-{match_id}"),
        spec=k8s_client.V1JobSpec(
            template=k8s_client.V1PodTemplateSpec(
                spec=k8s_client.V1PodSpec(
                    containers=[k8s_client.V1Container(
                        name="game-server",
                        image="registry/game-server:latest",
                        env=[
                            k8s_client.V1EnvVar(name="MATCH_ID", value=match_id),
                            k8s_client.V1EnvVar(name="PLAYER_IDS",
                                value=",".join(p["id"] for p in match["players"])),
                        ],
                        ports=[k8s_client.V1ContainerPort(container_port=7777, protocol="UDP")],
                    )],
                    restart_policy="Never",
                )
            )
        )
    )

    k8s.create_namespaced_job(namespace="game-servers", body=job)
    print(f"Game server spawned for match {match_id}")

asyncio.run(game_manager())`,
  },
  {
    lang: 'java' as const, label: 'Java (Authoritative Game Server)',
    code: `import java.net.*;
import java.util.concurrent.*;

// Game server receives inputs via UDP (low latency — no TCP handshake per packet)
public class GameServer {
    private static final int TICK_RATE = 20;      // 20 state broadcasts/second
    private static final int INPUT_RATE = 60;      // accept inputs at 60Hz
    private final ConcurrentHashMap<String, PlayerState> players = new ConcurrentHashMap<>();

    public void run(int port) throws Exception {
        DatagramSocket socket = new DatagramSocket(port);
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

        // Input loop — receive player inputs at up to 60Hz
        scheduler.execute(() -> receiveInputLoop(socket));

        // Physics tick — broadcast authoritative world state at 20Hz
        scheduler.scheduleAtFixedRate(
            this::physicsTick,
            0, 1000 / TICK_RATE, TimeUnit.MILLISECONDS
        );
    }

    private void physicsTick() {
        // 1. Apply all queued inputs since last tick
        players.forEach((id, state) -> {
            for (PlayerInput input : state.pendingInputs) {
                applyInput(state, input);
            }
            state.pendingInputs.clear();
        });

        // 2. Run physics simulation (positions, collisions)
        simulatePhysics();

        // 3. Broadcast authoritative state to ALL players
        // (anti-cheat: clients CANNOT self-report position, server is authoritative)
        WorldState snapshot = captureState();
        broadcastToAll(snapshot);
    }

    private void applyInput(PlayerState state, PlayerInput input) {
        // Server validates input — ignore impossible values
        if (Math.abs(input.steer) > 1.0) return;   // cheat detection
        state.steerAngle = input.steer;
        state.throttle = Math.max(0, Math.min(1, input.throttle));
    }

    // … collision detection, lap counting, finish line detection …
}`,
  },
]

const PLAYER_COLORS = {
  idle: 'text-slate-400 bg-slate-100 dark:bg-slate-800',
  queued: 'text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300',
  matched: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300',
  connecting: 'text-violet-700 bg-violet-100 dark:bg-violet-950 dark:text-violet-300',
  playing: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300',
}

const SERVER_COLORS = {
  off: 'text-slate-400 border-slate-200 dark:border-slate-700',
  spawning: 'text-amber-600 border-amber-400 dark:border-amber-600 animate-pulse',
  ready: 'text-violet-600 border-violet-400 dark:border-violet-600',
  running: 'text-emerald-600 border-emerald-400 dark:border-emerald-600',
}

export default function GamingSystemViz() {
  const [tab, setTab] = useState<'matchmaking' | 'services'>('matchmaking')
  const ctrl = useSteps(MATCH_STEPS.length)
  const cur = MATCH_STEPS[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gaming System Design</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Multiplayer drag-racing game — matchmaking, authoritative game servers, and real-time UDP state sync
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>The key constraint:</strong> Game servers must be authoritative — clients cannot be trusted to self-report positions (cheating). The server runs the physics, clients just send inputs and render what the server says. This is why multiplayer games have dedicated server farms.
        </p>
      </div>

      <div className="flex gap-2">
        {[{ id: 'matchmaking' as const, label: 'Matchmaking Flow' }, { id: 'services' as const, label: 'Architecture' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="viz-container p-6">
        {tab === 'matchmaking' && (
          <div className="space-y-5">
            {/* Players + Server visualizer */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Player 1 */}
              <div className="text-center">
                <div className="text-2xl mb-2">🏎️</div>
                <div className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Player 1</div>
                <div className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-300 ${PLAYER_COLORS[cur.p1]}`}>
                  {cur.p1.charAt(0).toUpperCase() + cur.p1.slice(1)}
                </div>
              </div>

              {/* Game Server */}
              <div className={`rounded-xl border-2 p-4 text-center transition-all duration-500 ${SERVER_COLORS[cur.serverState]}`}>
                <div className="text-xl mb-1">🖥️</div>
                <div className="text-xs font-bold">Game Server</div>
                <div className="text-xs mt-1 opacity-80">
                  {cur.serverState === 'off' ? 'Not yet spawned' :
                   cur.serverState === 'spawning' ? 'Starting…' :
                   cur.serverState === 'ready' ? '10.0.2.45:7777' :
                   'UDP/20Hz'}
                </div>
              </div>

              {/* Player 2 */}
              <div className="text-center">
                <div className="text-2xl mb-2">🏎️</div>
                <div className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Player 2</div>
                <div className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-300 ${PLAYER_COLORS[cur.p2]}`}>
                  {cur.p2.charAt(0).toUpperCase() + cur.p2.slice(1)}
                </div>
              </div>
            </div>

            {/* Services row */}
            <div className="flex justify-center gap-3 flex-wrap">
              {['Matchmaking Service', 'Game Manager', 'Kafka'].map((svc, i) => {
                const active = (i === 0 && (cur.phase === 'queued')) ||
                               (i === 1 && (cur.phase === 'spawning' || cur.phase === 'ready')) ||
                               (i === 2 && (cur.phase === 'matched' || cur.phase === 'spawning'))
                return (
                  <div key={svc} className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-300 ${active ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    {svc}
                  </div>
                )
              })}
            </div>

            {/* Message */}
            <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
              {cur.message}
            </div>

            <StepControls ctrl={ctrl} />
          </div>
        )}

        {tab === 'services' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((svc, i) => (
              <div key={i} className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${svc.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{svc.icon}</span>
                  <span className={`font-semibold text-sm ${svc.color}`}>{svc.name}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{svc.role}</p>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300 block mb-1">Hot path (latency-critical):</strong>
              Client → UDP → Game Server → physics tick → broadcast back. No databases, no Kafka, no HTTP. Sub-10ms per tick.
              <br />
              <strong className="text-slate-700 dark:text-slate-300 block mt-2 mb-1">Cold path (after race ends):</strong>
              Game Server → Kafka (race.finished) → Leaderboard update + Inventory rewards + DB write.
            </div>
          </div>
        )}
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
