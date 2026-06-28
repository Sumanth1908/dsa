import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  mode: 'sync' | 'async' | 'thread'
  barista1Task: string | null
  barista2Task: string | null
  kitchenTask: string | null
  eventLoopChecking: boolean
  callbackQueue: string[]
  output: string[]
  message: string
}

const syncSteps = (): Step[] => {
  const base: Step = { mode: 'sync', barista1Task: null, barista2Task: null, kitchenTask: null, eventLoopChecking: false, callbackQueue: [], output: [], message: '' }
  return [
    { ...base, message: 'Sync mode: one barista, one task at a time. Watch how waiting blocks the queue.' },
    { ...base, barista1Task: 'Take order: Alice wants a latte', output: ['Order taken from Alice'], message: 'Barista takes Alice\'s order: "One latte please."' },
    { ...base, barista1Task: '⏳ Steaming milk… (30 seconds)', kitchenTask: 'Milk steamer: BUSY', output: ['Order taken from Alice'], message: 'BLOCKING: Barista stands at the steamer doing nothing else. Bob is waiting at the counter.' },
    { ...base, barista1Task: '⏳ Steaming milk… almost done', kitchenTask: 'Milk steamer: BUSY', output: ['Order taken from Alice'], message: 'Still blocking. In sync code, no other task runs until the current one completes.' },
    { ...base, barista1Task: null, kitchenTask: null, output: ['Order taken from Alice', '☕ Alice served (30s elapsed)'], message: 'Finally done. Alice is served. Bob waited 30 seconds just standing at the counter.' },
    { ...base, barista1Task: 'Take order: Bob wants a cappuccino', output: ['Order taken from Alice', '☕ Alice served (30s elapsed)', 'Order taken from Bob'], message: 'Now Bob is served — but total time so far: 30s+ just for one customer.' },
  ]
}

const asyncSteps = (): Step[] => {
  const base: Step = { mode: 'async', barista1Task: null, barista2Task: null, kitchenTask: null, eventLoopChecking: false, callbackQueue: [], output: [], message: '' }
  return [
    { ...base, message: 'Async/Event Loop mode: same barista handles multiple customers by NOT blocking on I/O waits.' },
    { ...base, barista1Task: 'Take order: Alice wants a latte', output: ['Order taken from Alice'], message: 'Barista takes Alice\'s order.' },
    { ...base, barista1Task: 'Start steamer → step away', kitchenTask: 'Milk steamer: RUNNING (background)', output: ['Order taken from Alice'], message: 'START the steamer and immediately step away. Async: "call me when it\'s done" (callback registered).' },
    { ...base, barista1Task: 'Take order: Bob wants a cappuccino', kitchenTask: 'Milk steamer: RUNNING (background)', output: ['Order taken from Alice', 'Order taken from Bob'], message: 'WHILE the steamer runs, the barista serves the next customer. No blocking!' },
    { ...base, barista1Task: 'Take order: Carol wants an espresso', kitchenTask: 'Milk steamer: RUNNING (background)', callbackQueue: ['steamer_done callback'], output: ['Order taken from Alice', 'Order taken from Bob', 'Order taken from Carol'], message: 'Steamer finishes — callback is placed in the task queue. Barista keeps taking orders.' },
    { ...base, barista1Task: null, kitchenTask: null, eventLoopChecking: true, callbackQueue: ['steamer_done callback'], output: ['Order taken from Alice', 'Order taken from Bob', 'Order taken from Carol'], message: 'Event Loop checks the callback queue (call stack is empty). Picks up steamer_done.' },
    { ...base, barista1Task: 'Pour milk: Alice\'s latte', kitchenTask: null, eventLoopChecking: false, callbackQueue: [], output: ['Order taken from Alice', 'Order taken from Bob', 'Order taken from Carol', '☕ Alice served (non-blocking!)'], message: 'Alice\'s latte is poured. Total time: ~30s but 3 orders were taken during that wait.' },
  ]
}

const threadSteps = (): Step[] => {
  const base: Step = { mode: 'thread', barista1Task: null, barista2Task: null, kitchenTask: null, eventLoopChecking: false, callbackQueue: [], output: [], message: '' }
  return [
    { ...base, message: 'Multi-thread mode: 2 baristas working in parallel. Each runs independently (like 2 CPU cores).' },
    { ...base, barista1Task: 'Thread 1: Take Alice\'s order', barista2Task: 'Thread 2: Take Bob\'s order', output: ['Thread 1: serving Alice', 'Thread 2: serving Bob'], message: 'Both baristas work simultaneously — true parallelism. Ideal for CPU-bound tasks.' },
    { ...base, barista1Task: 'Thread 1: Steaming milk', barista2Task: 'Thread 2: Grinding beans', kitchenTask: '⚠️ RACE CONDITION: Both reach for the SAME milk jug!', output: ['Thread 1: serving Alice', 'Thread 2: serving Bob'], message: 'Race condition: Threads 1 & 2 compete for the shared milk jug at the same time!' },
    { ...base, barista1Task: 'Thread 1: 🔒 LOCKED milk jug', barista2Task: 'Thread 2: 🔒 waiting for lock', kitchenTask: 'Mutex lock prevents data corruption', output: ['Thread 1: serving Alice', 'Thread 2: serving Bob'], message: 'Mutex (lock): Thread 1 grabs the lock first. Thread 2 waits. This serializes shared-resource access.' },
    { ...base, barista1Task: 'Thread 1: Using milk, done → unlock', barista2Task: 'Thread 2: 🔒 got lock, using milk', output: ['Thread 1: serving Alice', 'Thread 2: serving Bob', '☕ Alice done', '☕ Bob done'], message: 'Thread 1 releases lock, Thread 2 picks it up. Both orders complete, no corruption.' },
  ]
}

const ALL_STEPS = [...syncSteps(), ...asyncSteps(), ...threadSteps()]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript (async)',
    code: `// SYNC — blocks the thread
function makeLatte_sync() {
  steamMilk()         // ← blocks for 30s
  pour()
}

// ASYNC — non-blocking with callbacks
function makeLatte_callback() {
  steamMilk({ onDone: (milk) => pour(milk) })
  takeNextOrder()     // ← runs immediately
}

// ASYNC — non-blocking with await (reads like sync, runs async)
async function makeLatte_await() {
  const milk = await steamMilk()  // suspends THIS fn, event loop continues
  pour(milk)
}

// THREADS — true parallelism (Web Workers in browsers)
const worker = new Worker('barista.js')
worker.postMessage({ task: 'makeLatte', customer: 'Alice' })
// main thread continues, Worker runs on a separate thread`,
  },
  {
    lang: 'python' as const, label: 'Python (asyncio)',
    code: `import asyncio

# Coroutines (polite workers — yield control voluntarily)
async def steam_milk():
    print("Steamer started")
    await asyncio.sleep(30)   # suspends, event loop runs other tasks
    return "steamed milk"

async def take_order(name):
    print(f"Order from {name}")
    await asyncio.sleep(0.1)  # tiny I/O delay
    return f"{name}'s order"

async def barista():
    # Fire both tasks — they run concurrently on ONE thread
    order_a, order_b = await asyncio.gather(
        take_order("Alice"),
        take_order("Bob"),
    )
    milk = await steam_milk()
    print(f"Made latte: {milk}")

asyncio.run(barista())`,
  },
  {
    lang: 'java' as const, label: 'Java (threads)',
    code: `// Multi-threading with synchronized (mutex)
class CoffeeMachine {
    private final Object milkJugLock = new Object();
    private int milkLevel = 500;  // shared mutable state ← danger!

    public void steamMilk(String baristaName, int ml) {
        synchronized (milkJugLock) {  // only one thread at a time
            if (milkLevel >= ml) {
                milkLevel -= ml;
                System.out.println(baristaName + " used " + ml + "ml. Remaining: " + milkLevel);
            }
        } // lock released here — next thread can enter
    }
}

// Two threads racing for the same milk jug
CoffeeMachine cm = new CoffeeMachine();
Thread t1 = new Thread(() -> cm.steamMilk("Barista-1", 200));
Thread t2 = new Thread(() -> cm.steamMilk("Barista-2", 200));
t1.start(); t2.start();`,
  },
]

export default function ConcurrencyVisualizer() {
  const ctrl = useSteps(ALL_STEPS.length)
  const cur = ALL_STEPS[ctrl.step]

  const MODE_COLORS = {
    sync: { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-500' },
    async: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-500' },
    thread: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-500' },
  }
  const mc = MODE_COLORS[cur.mode]
  const modeLabel = { sync: 'Synchronous (blocking)', async: 'Async / Event Loop', thread: 'Multi-threaded' }[cur.mode]

  const taskCard = (task: string | null, label: string) => (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-16">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      {task ? (
        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">{task}</div>
      ) : (
        <div className="text-xs text-slate-300 dark:text-slate-600 italic">idle</div>
      )}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Concurrency — The Coffee Shop</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Sync vs Async/Event Loop vs Multi-threading — visualized through a busy café</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A coffee shop needs to serve multiple customers. Making a latte requires steaming milk (I/O wait — 30 seconds).
          Three approaches: <strong>Sync</strong> (block until done — terrible for throughput),
          <strong>Async</strong> (start steaming, serve next customer while waiting — one thread, high throughput),
          <strong>Threads</strong> (two baristas in parallel — but sharing the milk jug causes a race condition requiring a mutex).
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">When to use which</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          <strong>Async/Coroutines</strong> → I/O-bound tasks (network, DB, file). One thread serves thousands of concurrent connections.
          <strong> Threads/Processes</strong> → CPU-bound tasks (image processing, ML inference). Need true parallelism across cores.
          Mixing them wrong (threads for I/O, sync for CPU) gives you the worst of both worlds.
        </p>
      </div>

      <div className={`viz-container p-6 space-y-4 border-2 ${mc.border} transition-all duration-300`}>
        {/* Mode badge */}
        <div className="flex items-center gap-2">
          <div className={`text-xs px-3 py-1 rounded-full text-white font-semibold ${mc.badge}`}>{modeLabel}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Step {ctrl.step + 1} of {ALL_STEPS.length}
          </div>
        </div>

        {/* Task cards */}
        <div className={`grid gap-3 ${cur.mode === 'thread' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {taskCard(cur.barista1Task, cur.mode === 'thread' ? '☕ Barista 1 (Thread 1)' : '☕ Barista (Main Thread)')}
          {cur.mode === 'thread' && taskCard(cur.barista2Task, '☕ Barista 2 (Thread 2)')}
        </div>

        {/* Kitchen / Kitchen + Event Loop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cur.kitchenTask && (
            <div className={`rounded-lg border p-3 ${cur.kitchenTask.includes('RACE') ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">🍳 Kitchen (Web APIs / System)</div>
              <div className={`text-xs font-medium ${cur.kitchenTask.includes('RACE') ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>{cur.kitchenTask}</div>
            </div>
          )}

          {cur.mode === 'async' && (
            <div className={`rounded-lg border p-3 transition-all ${cur.eventLoopChecking ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 scale-105' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                ⟳ Event Loop {cur.eventLoopChecking ? '(ACTIVE)' : '(idle)'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {cur.callbackQueue.length > 0
                  ? `Queue: [${cur.callbackQueue.join(', ')}]`
                  : 'Queue: empty'}
              </div>
            </div>
          )}
        </div>

        {/* Output log */}
        {cur.output.length > 0 && (
          <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-3 space-y-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">console output</div>
            {cur.output.map((line, i) => (
              <div key={i} className="text-xs font-mono text-emerald-400">{line}</div>
            ))}
          </div>
        )}

        {/* Message */}
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {cur.message}
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
