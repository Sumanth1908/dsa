import React, { useState, useEffect, useRef } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

type Algo = 'token-bucket' | 'leaky-bucket' | 'fixed-window'

const ALGOS: { id: Algo; label: string; tagline: string }[] = [
  { id: 'token-bucket', label: 'Token Bucket', tagline: 'Tokens refill at a steady rate; bursts allowed up to bucket capacity' },
  { id: 'leaky-bucket', label: 'Leaky Bucket', tagline: 'Queue requests; drain at a fixed rate; overflow is rejected' },
  { id: 'fixed-window', label: 'Fixed Window', tagline: 'Count requests per time window; reset counter at window boundary' },
]

interface ReqRecord { id: number; allowed: boolean; ts: number }

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python (Token Bucket)',
    code: `import time
import threading

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity        # max tokens
        self.tokens = capacity          # start full
        self.refill_rate = refill_rate  # tokens/second
        self.last_refill = time.time()
        self._lock = threading.Lock()

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + new_tokens)
        self.last_refill = now

    def allow(self, tokens: int = 1) -> bool:
        with self._lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True   # ✓ allowed
            return False      # ✗ rate limited

# 10 req/sec burst, refill 5 tokens/sec
limiter = TokenBucket(capacity=10, refill_rate=5)

def handle_request(user_id: str) -> str:
    if limiter.allow():
        return process_request(user_id)
    return "429 Too Many Requests"`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (Redis + Sliding Window)',
    code: `// Sliding Window Log — most accurate but uses more memory
const redis = require('ioredis')
const client = new redis()

async function rateLimit(userId, limitPerMinute = 100) {
  const key = \`rl:\${userId}\`
  const now = Date.now()
  const windowStart = now - 60_000  // 1-minute window

  const pipeline = client.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart) // remove old entries
  pipeline.zadd(key, now, \`\${now}-\${Math.random()}\`) // add current
  pipeline.zcard(key)                               // count in window
  pipeline.expire(key, 60)                          // auto-cleanup

  const [,, [, count]] = await pipeline.exec()

  if (count > limitPerMinute) {
    return { allowed: false, retryAfter: 60 }
  }
  return { allowed: true, remaining: limitPerMinute - count }
}`,
  },
  {
    lang: 'java' as const, label: 'Java (Bucket4j)',
    code: `import io.github.bucket4j.*;
import java.time.Duration;

// Token Bucket via Bucket4j (production-ready)
Bucket bucket = Bucket.builder()
    .addLimit(Bandwidth.classic(
        100,                           // capacity: 100 tokens
        Refill.greedy(10, Duration.ofSeconds(1))  // +10 tokens/sec
    ))
    .build();

// Per-request check (non-blocking)
public ResponseEntity<?> handleRequest() {
    if (bucket.tryConsume(1)) {
        return ResponseEntity.ok(process());
    }
    return ResponseEntity
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .header("Retry-After", "1")
        .build();
}

// For distributed systems: use Bucket4j + Redis
JCacheProxyManager<String> proxyManager = ...;
Bucket userBucket = proxyManager.builder()
    .build(userId, () -> BucketConfiguration.builder()
        .addLimit(Bandwidth.classic(100, Refill.greedy(10, Duration.ofSeconds(1))))
        .build());`,
  },
]

const BUCKET_CAPACITY = 8
const REFILL_RATE = 1    // 1 token per 2 seconds (visual)
const WINDOW_LIMIT = 5
const WINDOW_SECS = 8

export default function RateLimiterVisualizer() {
  const [algo, setAlgo] = useState<Algo>('token-bucket')
  const [tokens, setTokens] = useState(BUCKET_CAPACITY)
  const [requests, setRequests] = useState<ReqRecord[]>([])
  const [windowCount, setWindowCount] = useState(0)
  const [windowSec, setWindowSec] = useState(WINDOW_SECS)
  const [queueLen, setQueueLen] = useState(0)
  const [processing, setProcessing] = useState(false)
  const reqId = useRef(0)
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens

  // Token bucket refill
  useEffect(() => {
    if (algo !== 'token-bucket') return
    const interval = setInterval(() => {
      setTokens(t => Math.min(BUCKET_CAPACITY, t + REFILL_RATE))
    }, 2000)
    return () => clearInterval(interval)
  }, [algo])

  // Fixed window reset
  useEffect(() => {
    if (algo !== 'fixed-window') return
    const tick = setInterval(() => {
      setWindowSec(s => {
        if (s <= 1) { setWindowCount(0); return WINDOW_SECS }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [algo])

  // Leaky bucket drain
  useEffect(() => {
    if (algo !== 'leaky-bucket') return
    const drain = setInterval(() => {
      if (!processing) {
        setQueueLen(q => {
          if (q > 0) {
            setProcessing(true)
            setTimeout(() => setProcessing(false), 600)
            return q - 1
          }
          return q
        })
      }
    }, 1200)
    return () => clearInterval(drain)
  }, [algo, processing])

  const addReq = () => {
    const id = ++reqId.current
    let allowed = false

    if (algo === 'token-bucket') {
      if (tokensRef.current >= 1) {
        setTokens(t => t - 1)
        allowed = true
      }
    } else if (algo === 'fixed-window') {
      if (windowCount < WINDOW_LIMIT) {
        setWindowCount(c => c + 1)
        allowed = true
      }
    } else {
      // Leaky bucket: max queue = 4
      if (queueLen < 4) {
        setQueueLen(q => q + 1)
        allowed = true
      }
    }

    const rec: ReqRecord = { id, allowed, ts: Date.now() }
    setRequests(prev => [rec, ...prev].slice(0, 12))
  }

  const resetAll = () => {
    setTokens(BUCKET_CAPACITY)
    setWindowCount(0)
    setWindowSec(WINDOW_SECS)
    setQueueLen(0)
    setRequests([])
    reqId.current = 0
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rate Limiter</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Keep APIs healthy under load — three classic algorithms compared interactively</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Your public API allows 100 req/min per user. Without rate limiting, a single misbehaving client or a DDoS attack can exhaust your server resources for everyone.
          A rate limiter sits in front of your service and rejects requests that exceed the limit — returning <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">429 Too Many Requests</code>.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise which to use</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          <div><strong>Token Bucket</strong> — allows controlled bursts (great for REST APIs). AWS API Gateway uses this.</div>
          <div><strong>Leaky Bucket</strong> — smooths out spiky traffic. Good for upstream services that can't handle bursts.</div>
          <div><strong>Fixed Window</strong> — simplest to implement but has a "double-rate" edge case at window boundaries.</div>
        </div>
      </div>

      {/* Algo tabs */}
      <div className="grid grid-cols-3 gap-2">
        {ALGOS.map(a => (
          <button key={a.id} onClick={() => { setAlgo(a.id); resetAll() }}
            className={`rounded-xl p-3 text-left transition-all ${
              algo === a.id
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-400'
            }`}>
            <div className="text-sm font-bold">{a.label}</div>
            <div className={`text-[10px] mt-0.5 ${algo === a.id ? 'text-rose-200' : 'text-slate-500'}`}>{a.tagline}</div>
          </button>
        ))}
      </div>

      <div className="viz-container p-6 space-y-5">
        {/* Visual representation */}
        {algo === 'token-bucket' && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bucket ({tokens}/{BUCKET_CAPACITY} tokens)</div>
            <div className="relative w-36 h-48 border-4 border-slate-400 dark:border-slate-500 rounded-b-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              {/* Fill level */}
              <div className="absolute bottom-0 left-0 right-0 bg-rose-400 dark:bg-rose-600 transition-all duration-700 rounded-b-lg"
                style={{ height: `${(tokens / BUCKET_CAPACITY) * 100}%` }} />
              {/* Token dots */}
              <div className="absolute inset-0 flex flex-col-reverse items-center justify-start pt-2 gap-1.5">
                {Array.from({ length: tokens }, (_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-white/60 shadow-sm" />
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-500">+{REFILL_RATE} token every 2s</div>
          </div>
        )}

        {algo === 'leaky-bucket' && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Queue ({queueLen}/4 requests buffered)</div>
            <div className="relative w-36 h-48 border-4 border-slate-400 dark:border-slate-500 rounded-b-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <div className="absolute bottom-0 left-0 right-0 bg-blue-400 dark:bg-blue-600 transition-all duration-500"
                style={{ height: `${(queueLen / 4) * 100}%` }} />
            </div>
            <div className={`text-xs font-medium ${processing ? 'text-emerald-600' : 'text-slate-400'}`}>
              {processing ? '⟳ Processing at steady rate...' : 'Idle — waiting for requests'}
            </div>
          </div>
        )}

        {algo === 'fixed-window' && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Window: {windowCount}/{WINDOW_LIMIT} requests — resets in {windowSec}s
            </div>
            <div className="w-full max-w-xs">
              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                <div className={`h-full rounded-full transition-all duration-300 ${windowCount >= WINDOW_LIMIT ? 'bg-rose-500' : 'bg-amber-400'}`}
                  style={{ width: `${(windowCount / WINDOW_LIMIT) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0</span><span>{WINDOW_LIMIT} req / {WINDOW_SECS}s window</span>
              </div>
            </div>
            <div className="text-xs text-slate-500">Window resets in <span className="font-bold text-amber-600">{windowSec}s</span></div>
          </div>
        )}

        {/* Fire button + history */}
        <div className="flex flex-col items-center gap-4">
          <button onClick={addReq}
            className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md">
            Fire Request
          </button>

          {requests.length > 0 && (
            <div className="w-full max-w-sm space-y-1.5 max-h-48 overflow-y-auto">
              {requests.map(r => (
                <div key={r.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                  r.allowed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                  <span className="font-bold">{r.allowed ? '✓ 200' : '✗ 429'}</span>
                  <span>Request #{r.id}</span>
                  <span className="ml-auto opacity-60">{r.allowed ? 'allowed' : 'rate limited'}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">
            Reset
          </button>
        </div>
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
