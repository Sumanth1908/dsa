import React, { useState } from 'react'
import CodeTabs from '@/components/shared/CodeTabs'

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python',
    code: `import asyncio, aiohttp      # I/O-bound: async
import multiprocessing, cv2   # CPU-bound: processes

# ─── I/O BOUND: download 100 images ───────────────────────
async def download_one(session, url):
    async with session.get(url) as r:
        return await r.read()

async def download_all(urls):
    async with aiohttp.ClientSession() as sess:
        # Fire all 100 requests simultaneously — 1 thread, 0 blocking
        return await asyncio.gather(*[download_one(sess, u) for u in urls])

# ─── CPU BOUND: apply blur to 100 images ──────────────────
def blur_image(path):
    img = cv2.imread(path)
    return cv2.GaussianBlur(img, (51, 51), 0)

with multiprocessing.Pool(processes=4) as pool:
    # Divide 100 images across 4 CPU cores — true parallelism
    results = pool.map(blur_image, image_paths)`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// I/O BOUND: fetch 100 URLs — async, 1 thread is enough
const urls = Array.from({ length: 100 }, (_, i) => \`/image/\${i}.jpg\`)

// Fire all requests simultaneously (non-blocking)
const blobs = await Promise.all(urls.map(u => fetch(u).then(r => r.blob())))
console.log(\`Downloaded \${blobs.length} images\`)

// CPU BOUND: image processing — offload to Web Worker
// main.js
const worker = new Worker('process-worker.js')
worker.postMessage({ task: 'blur', imagePaths: [...] })
worker.onmessage = ({ data }) => console.log('Done:', data.count)

// process-worker.js (runs on a separate OS thread)
self.onmessage = ({ data }) => {
  const results = data.imagePaths.map(path => applyBlur(path)) // heavy CPU
  self.postMessage({ count: results.length })
}`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.concurrent.*;
import java.util.List;

// I/O BOUND: concurrent HTTP downloads
ExecutorService ioPool = Executors.newVirtualThreadPerTaskExecutor(); // Java 21
List<Future<byte[]>> futures = urls.stream()
    .map(url -> ioPool.submit(() -> fetchUrl(url)))
    .toList();
List<byte[]> images = futures.stream().map(Future::get).toList();
// Virtual threads: millions of concurrent "threads", tiny memory footprint

// CPU BOUND: parallel image processing using Fork/Join
ForkJoinPool cpuPool = new ForkJoinPool(Runtime.getRuntime().availableProcessors());
List<BufferedImage> processed = cpuPool.submit(() ->
    images.parallelStream()
          .map(ImageProcessor::applyBlur)  // heavy math, runs on all cores
          .toList()
).get();`,
  },
]

interface Scenario { id: 'io' | 'cpu'; label: string; tagline: string }
const SCENARIOS: Scenario[] = [
  { id: 'io', label: 'I/O-Bound', tagline: 'Download 100 images from the internet' },
  { id: 'cpu', label: 'CPU-Bound', tagline: 'Apply a blur filter to 100 images' },
]

const CORES = 4
const TASKS_PER_CORE = 4

const DOUBTS = [
  {
    q: 'I/O-bound vs CPU-bound — why is that the first question?',
    a: 'It decides the fix. CPU-bound and I/O-bound workloads need fundamentally different concurrency strategies, and choosing wrong wastes resources or leaves performance on the table.\n\nFor CPU-bound work (like image blur), your threads spend 100% of time doing actual math — there is no waiting. Adding more threads than cores just wastes CPU cycles on context switching; a pool sized to core count (e.g., 4 threads on a 4-core machine) is optimal. The ForkJoinPool in Java defaults to Runtime.getRuntime().availableProcessors().\n\nFor I/O-bound work (like downloading 100 images), threads spend ~95% of time stalled on network. A single thread can juggle dozens of I/O requests while waiting. You can either use dozens of OS threads, or skip threads entirely with async/await — one thread fires 100 requests and the runtime switches when one blocks.\n\n**Rule of thumb:** CPU-bound = pool size = core count; I/O-bound = as many threads (or async) as concurrent requests.',
  },
  {
    q: 'What does a context switch actually cost?',
    a: 'The direct cost — saving and restoring CPU registers — is just microseconds, but the real villain is cache pollution. When the CPU switches to a new thread, the L1/L2/L3 caches still contain data from the previous thread, which is now useless. The new thread encounters a cascade of cache misses while warming up its working set.\n\nA modern CPU might context-switch thousands of times per second under load. If each switch loses 5-20% throughput to cache cold-ness, thousands of switches silently drain double-digit percentages of your total performance — even though the register-save operation itself takes just microseconds. Example: in Python with asyncio, single-threaded async cuts context-switch overhead dramatically by keeping the same thread hot in cache.\n\n**Common mistake:** Thinking context-switch overhead is just the CPU register-save time — the real cost is the cache-miss storm that follows.',
  },
  {
    q: 'The OS shows 8 CPUs on my 4-core machine — do I have 8?',
    a: 'No — you have 4 cores, not 8. Hyper-threading (or SMT — Simultaneous Multi-Threading) gives each physical core two hardware thread slots that share the same execution units: ALU, caches, memory pipeline. Both threads run, but they compete for the same silicon.\n\nWhen one thread stalls on memory (L3 cache miss costing 200+ cycles), the other thread can execute instructions during that wait, improving overall throughput. But if both threads are CPU-bound, they fight for the same resources, and hyper-threading nets only 20-30% extra throughput compared to pure sequential work on one thread.\n\nExample: an Intel i7 with 4 physical cores reports 8 logical CPUs in Task Manager, but intensive work should be parallelized to 4 threads, not 8.\n\n**Rule of thumb:** size CPU-bound thread pools by PHYSICAL core count. Note that Java\'s `Runtime.getRuntime().availableProcessors()` returns LOGICAL CPUs (8 on this machine), so consider halving it for pure compute workloads.',
  },
]

export default function CPUThreadsVisualizer() {
  const [scene, setScene] = useState<'io' | 'cpu'>('io')

  const ioDesc = 'One chef (thread) starts all 100 orders simultaneously. They\'re mostly waiting on delivery (network). When an image arrives, the chef briefly processes it and moves on. The kitchen (CPU) is rarely busy — the bottleneck is the network wait.'
  const cpuDesc = '4 chefs (cores) each take 25 dishes. They\'re chopping non-stop (heavy math). No waiting — the knife work IS the bottleneck. Adding more chefs = direct speedup. One chef alone would take 4× longer.'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CPU, Cores & Threads</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">I/O-bound vs CPU-bound — the most important distinction in performance engineering</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Restaurant Kitchen Analogy</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>CPU = The Kitchen.</strong> <strong>Core = One Chef.</strong> <strong>Thread = A Recipe/Task.</strong>
          A quad-core CPU is a kitchen with 4 chefs who can cook 4 dishes in true parallel.
          But there are two kinds of work: waiting for the oven (I/O) and actually chopping vegetables (CPU).
          The right concurrency strategy depends on which one is your bottleneck.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">The Golden Rule</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-sm">
          <div className="text-emerald-700 dark:text-emerald-400">
            <strong>I/O-Bound</strong> → Use Async/Threads<br />
            <span className="text-xs">CPU sits idle during network/disk waits. 1 core can handle thousands of concurrent I/O ops via async or thread switching.</span>
          </div>
          <div className="text-emerald-700 dark:text-emerald-400">
            <strong>CPU-Bound</strong> → Use Processes/Cores<br />
            <span className="text-xs">CPU is fully occupied. More threads on 1 core don't help — you need more cores. Use multiprocessing or fork/join pools.</span>
          </div>
        </div>
      </div>

      {/* Scenario toggle */}
      <div className="flex gap-2">
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setScene(s.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
              scene === s.id
                ? s.id === 'io' ? 'bg-sky-600 text-white shadow' : 'bg-orange-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            <div className="font-semibold">{s.label}</div>
            <div className="text-xs opacity-80">{s.tagline}</div>
          </button>
        ))}
      </div>

      <div className="viz-container p-6 space-y-6">
        {scene === 'io' ? (
          <>
            {/* I/O Bound: 1 "chef" managing many async tasks */}
            <div className="text-center">
              <div className="text-sm font-semibold text-sky-700 dark:text-sky-300 mb-1">Single-threaded async — 1 core, 100 concurrent downloads</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">(Each cell = one image download request. Color = status.)</div>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 100 }, (_, i) => {
                const phase = i < 30 ? 'done' : i < 60 ? 'waiting' : i < 85 ? 'waiting' : 'pending'
                return (
                  <div key={i} className={`aspect-square rounded text-[8px] flex items-center justify-center font-mono transition-all ${
                    phase === 'done' ? 'bg-emerald-400 text-white' :
                    phase === 'waiting' ? 'bg-sky-300 dark:bg-sky-700 text-white' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {phase === 'done' ? '✓' : phase === 'waiting' ? '⟳' : ''}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-300 inline-block" /> Waiting on network</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 inline-block" /> Pending</span>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="text-center bg-sky-50 dark:bg-sky-950/30 rounded-xl p-3 border border-sky-200 dark:border-sky-800">
                <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">1</div>
                <div className="text-xs text-sky-600 dark:text-sky-400">OS Thread used</div>
              </div>
              <div className="text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">100</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Concurrent requests</div>
              </div>
              <div className="text-center bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">~8s</div>
                <div className="text-xs text-amber-600 dark:text-amber-400">vs 200s sequential</div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* CPU Bound: 4 cores, each handles 25 tasks */}
            <div className="text-center">
              <div className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">Multi-core parallel — 4 cores share 100 images</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">(Each group = one CPU core. Each cell = one image being blur-processed.)</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: CORES }, (_, coreIdx) => (
                <div key={coreIdx} className="rounded-xl border-2 border-orange-200 dark:border-orange-800 p-3 bg-orange-50/50 dark:bg-orange-950/10">
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2">
                    🍳 Core {coreIdx + 1} — Chef #{coreIdx + 1}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: TASKS_PER_CORE * (TASKS_PER_CORE + 1) }, (_, j) => {
                      const done = j < 15
                      return (
                        <div key={j} className={`aspect-square rounded text-[8px] flex items-center justify-center ${
                          done ? 'bg-orange-400 text-white' : 'bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-800 text-orange-500'
                        }`}>
                          {done ? '✓' : '⚙'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <div className="text-center bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">4</div>
                <div className="text-xs text-orange-600 dark:text-orange-400">Cores in parallel</div>
              </div>
              <div className="text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">~4×</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Speedup vs 1 core</div>
              </div>
              <div className="text-center bg-rose-50 dark:bg-rose-950/30 rounded-xl p-3 border border-rose-200 dark:border-rose-800">
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">✗</div>
                <div className="text-xs text-rose-600 dark:text-rose-400">Async wouldn't help here</div>
              </div>
            </div>
          </>
        )}

        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {scene === 'io' ? ioDesc : cpuDesc}
        </div>
      </div>

      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
