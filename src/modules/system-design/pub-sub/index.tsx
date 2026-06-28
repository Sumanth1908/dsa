import React, { useState, useEffect, useRef } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

interface Message {
  id: number
  topic: string
  payload: string
  from: string
  ts: string
  deliveredTo: string[]
}

interface Subscriber {
  id: string
  name: string
  icon: string
  topic: string
  processFn: string
  color: string
  bg: string
  border: string
}

interface Publisher {
  id: string
  name: string
  icon: string
  topic: string
  color: string
  payload: () => string
}

const SUBSCRIBERS: Subscriber[] = [
  {
    id: 'mobile', name: 'Mobile App', icon: '📱',
    topic: 'weather',
    processFn: 'showNotification(data)',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-700',
  },
  {
    id: 'web', name: 'Web Dashboard', icon: '🖥️',
    topic: 'weather',
    processFn: 'updateWidget(data)',
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-300 dark:border-violet-700',
  },
  {
    id: 'smarthome', name: 'Smart Home', icon: '🏠',
    topic: 'weather',
    processFn: 'adjustAC(data.temp)',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    id: 'newsapp', name: 'News App', icon: '📰',
    topic: 'news',
    processFn: 'addToFeed(headline)',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
  },
  {
    id: 'alerts', name: 'Alert Service', icon: '🔔',
    topic: 'news',
    processFn: 'sendPushAlert(data)',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-700',
  },
]

const PUBLISHERS: Publisher[] = [
  {
    id: 'weather-station',
    name: 'Weather Station',
    icon: '🌤️',
    topic: 'weather',
    color: 'text-sky-700 dark:text-sky-300',
    payload: () => {
      const temps = [18, 22, 25, 28, 30]
      const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Rainy']
      return JSON.stringify({
        temp: temps[Math.floor(Math.random() * temps.length)],
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: Math.floor(Math.random() * 40) + 40,
      })
    },
  },
  {
    id: 'news-service',
    name: 'News Service',
    icon: '📡',
    topic: 'news',
    color: 'text-amber-700 dark:text-amber-300',
    payload: () => {
      const headlines = [
        'SpaceX launches Starship on 5th test flight',
        'New AI model breaks reasoning benchmark',
        'Global markets reach record highs',
        'Breakthrough in quantum computing announced',
      ]
      return JSON.stringify({ headline: headlines[Math.floor(Math.random() * headlines.length)], priority: 'HIGH' })
    },
  },
]

let msgIdCounter = 1

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript (Redis Pub/Sub)',
    code: `import { createClient } from 'redis'

// ─── PUBLISHER ───────────────────────────────────────────────
const publisher = createClient({ url: 'redis://localhost:6379' })
await publisher.connect()

const sendWeatherUpdate = async (data) => {
    const payload = JSON.stringify(data)
    const subscriberCount = await publisher.publish('weather', payload)
    console.log(\`Published to 'weather' — \${subscriberCount} subscribers received it\`)
}

setInterval(async () => {
    await sendWeatherUpdate({ temp: 22, condition: 'Sunny', humidity: 65 })
}, 5000)

// ─── SUBSCRIBER ───────────────────────────────────────────────
const subscriber = createClient({ url: 'redis://localhost:6379' })
await subscriber.connect()

// Subscribing is exclusive — use a separate client per subscriber
await subscriber.subscribe('weather', (message, channel) => {
    const data = JSON.parse(message)
    console.log(\`[weather] received: temp=\${data.temp}°C, \${data.condition}\`)
    updateWeatherWidget(data)   // each subscriber acts independently
})

// Subscribe to multiple topics
await subscriber.subscribe(['weather', 'alerts'], (message, channel) => {
    const handler = { weather: handleWeather, alerts: handleAlerts }
    handler[channel]?.(JSON.parse(message))
})`,
  },
  {
    lang: 'python' as const, label: 'Python (Kafka / aiokafka)',
    code: `from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import asyncio, json

# ─── PUBLISHER ───────────────────────────────────────────────
async def weather_publisher():
    producer = AIOKafkaProducer(
        bootstrap_servers='kafka:9092',
        value_serializer=lambda v: json.dumps(v).encode()
    )
    await producer.start()

    try:
        while True:
            data = {"temp": 22, "condition": "Sunny", "humidity": 65}
            await producer.send_and_wait("weather", data)
            print(f"Published: {data}")
            await asyncio.sleep(5)
    finally:
        await producer.stop()   # ensures all pending messages are flushed

# ─── SUBSCRIBER ───────────────────────────────────────────────
async def mobile_app_subscriber():
    consumer = AIOKafkaConsumer(
        "weather",
        bootstrap_servers="kafka:9092",
        group_id="mobile-app",   # group_id → each group gets every message
        value_deserializer=lambda m: json.loads(m.decode())
    )
    await consumer.start()

    async for msg in consumer:
        data = msg.value
        await send_push_notification(
            title=f"{data['condition']} — {data['temp']}°C",
            body=f"Humidity: {data['humidity']}%"
        )

# Run publisher and 3 independent subscribers concurrently
asyncio.gather(
    weather_publisher(),
    mobile_app_subscriber(),
    web_dashboard_subscriber(),
    smart_home_subscriber(),
)`,
  },
  {
    lang: 'java' as const, label: 'Java (Kafka / Spring)',
    code: `import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

// ─── PUBLISHER ────────────────────────────────────────────────
@Service
public class WeatherPublisher {
    private final KafkaTemplate<String, WeatherData> kafkaTemplate;

    public WeatherPublisher(KafkaTemplate<String, WeatherData> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(WeatherData data) {
        kafkaTemplate.send("weather", data)
            .addCallback(
                result -> log.info("Published: {}", data),
                ex -> log.error("Publish failed", ex)
            );
    }
}

// ─── SUBSCRIBER: Mobile Notification Service ──────────────────
@Service
public class MobileNotificationService {
    @KafkaListener(topics = "weather", groupId = "mobile-group")
    public void handleWeatherUpdate(WeatherData data) {
        pushNotificationService.send(
            PushNotification.builder()
                .title(data.getCondition() + " — " + data.getTemp() + "°C")
                .body("Humidity: " + data.getHumidity() + "%")
                .build()
        );
    }
}

// ─── SUBSCRIBER: Smart Home Controller ────────────────────────
@Service
public class SmartHomeController {
    @KafkaListener(topics = "weather", groupId = "smart-home-group")
    // ↑ different groupId → independent from mobile — gets EVERY message too
    public void handleWeatherUpdate(WeatherData data) {
        if (data.getTemp() > 26) {
            acController.setTemp(22);
        }
    }
}`,
  },
]

const formatTs = () => new Date().toLocaleTimeString()

export default function PubSubVisualizer() {
  const [messages, setMessages] = useState<Message[]>([])
  const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'interactive' | 'vs-p2p'>('interactive')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const publish = (pub: Publisher) => {
    const subs = SUBSCRIBERS.filter(s => s.topic === pub.topic)
    const id = msgIdCounter++

    const msg: Message = {
      id,
      topic: pub.topic,
      payload: pub.payload(),
      from: pub.name,
      ts: formatTs(),
      deliveredTo: subs.map(s => s.id),
    }

    setMessages(prev => [msg, ...prev].slice(0, 10))
    setAnimatingIds(prev => new Set(prev).add(id))

    timerRef.current = setTimeout(() => {
      setAnimatingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 1200)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const topicSubs = (topic: string) => SUBSCRIBERS.filter(s => s.topic === topic)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pub-Sub Pattern</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Publishers send to topics — the broker delivers to all subscribers. Publishers and subscribers never know about each other.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Key Insight — Decoupling</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          The Weather Station doesn't know that a Mobile App, Web Dashboard, and Smart Home exist — it just publishes to the <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">weather</code> topic.
          New subscribers can join without any code changes to the publisher. This is why Pub-Sub scales so well: adding a 4th subscriber is a configuration change, not a code change.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'interactive' as const, label: 'Live Demo' },
          { id: 'vs-p2p' as const, label: 'Pub-Sub vs Point-to-Point' },
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
        {tab === 'interactive' && (
          <div className="space-y-5">
            {/* Publisher → Broker → Subscribers */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Publishers */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-2">Publishers</div>
                {PUBLISHERS.map(pub => (
                  <button
                    key={pub.id}
                    onClick={() => publish(pub)}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 p-3 hover:border-violet-400 hover:bg-violet-50 dark:hover:border-violet-600 dark:hover:bg-violet-950/20 transition-all group">
                    <div className="text-xl mb-1">{pub.icon}</div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pub.name}</div>
                    <div className={`text-[10px] font-mono mt-1 ${pub.color}`}>topic: {pub.topic}</div>
                    <div className="text-[10px] text-slate-400 mt-1 group-hover:text-violet-500">Click to publish →</div>
                  </button>
                ))}
              </div>

              {/* Broker */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Broker</div>
                <div className="rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-4 text-center w-full">
                  <div className="text-2xl mb-1">🔀</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Router</div>
                  <div className="mt-2 space-y-1">
                    {['weather', 'news'].map(topic => (
                      <div key={topic} className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        📌 {topic} ({topicSubs(topic).length} subs)
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subscribers */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-2">Subscribers</div>
                {SUBSCRIBERS.map(sub => {
                  const isAnimating = messages.some(m => animatingIds.has(m.id) && m.deliveredTo.includes(sub.id))
                  return (
                    <div key={sub.id} className={`rounded-xl border-2 p-2.5 transition-all duration-300 ${
                      isAnimating ? `${sub.border} ${sub.bg} scale-[1.03] shadow` : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>{sub.icon}</span>
                        <div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{sub.name}</div>
                          <div className={`text-[10px] font-mono ${sub.color}`}>{sub.processFn}</div>
                        </div>
                        {isAnimating && (
                          <span className="ml-auto text-emerald-500 text-sm animate-bounce">✓</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Message log */}
            {messages.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Log</div>
                {messages.map(msg => (
                  <div key={msg.id} className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                    animatingIds.has(msg.id) ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-slate-400">{msg.ts}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-mono">{msg.topic}</span>
                      <span className="text-slate-500">from {msg.from}</span>
                      <span className="ml-auto text-emerald-600 dark:text-emerald-400">→ {msg.deliveredTo.length} subscribers</span>
                    </div>
                    <div className="font-mono text-slate-600 dark:text-slate-400 truncate">{msg.payload}</div>
                  </div>
                ))}
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-400 italic py-4">
                Click a publisher to send a message
              </div>
            )}
          </div>
        )}

        {tab === 'vs-p2p' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20 p-4 space-y-3">
                <div className="text-sm font-bold text-rose-700 dark:text-rose-300">✕ Point-to-Point (tight coupling)</div>
                <div className="font-mono text-[11px] text-rose-700 dark:text-rose-400 space-y-0.5 bg-rose-100 dark:bg-rose-950/50 rounded p-2">
                  <div>WeatherStation.notify(mobileApp)</div>
                  <div>WeatherStation.notify(webDashboard)</div>
                  <div>WeatherStation.notify(smartHome)</div>
                  <div className="text-slate-500 text-[10px]"># publisher must know ALL subscribers</div>
                </div>
                <ul className="text-xs text-rose-700 dark:text-rose-400 space-y-1">
                  <li>✕ Adding a subscriber requires changing publisher code</li>
                  <li>✕ Publisher fails if any subscriber is down</li>
                  <li>✕ No fan-out — one-to-one only</li>
                  <li>✕ Hard to scale independently</li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">✓ Pub-Sub (loose coupling)</div>
                <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 space-y-0.5 bg-emerald-100 dark:bg-emerald-950/50 rounded p-2">
                  <div>broker.publish('weather', data)</div>
                  <div className="text-slate-500 text-[10px]"># publisher knows nothing about subscribers</div>
                  <div className="text-slate-500 text-[10px]"># broker routes to all 3 automatically</div>
                </div>
                <ul className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                  <li>✓ New subscriber = register with broker only</li>
                  <li>✓ Publisher continues if subscriber is down</li>
                  <li>✓ True fan-out — one message → N subscribers</li>
                  <li>✓ Scale each component independently</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Guarantees — what the vault notes say</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">Kafka (durable)</div>
                  <div>✓ Messages persisted on disk</div>
                  <div>✓ Replayable from any offset</div>
                  <div>✓ At-least-once delivery</div>
                  <div>✓ Consumer groups for parallel processing</div>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">Redis Pub/Sub (fire-and-forget)</div>
                  <div>✕ No persistence — offline subs miss messages</div>
                  <div>✕ No delivery guarantee</div>
                  <div>✓ Extremely low latency (&lt;1ms)</div>
                  <div>✓ Perfect for live dashboards, gaming</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
