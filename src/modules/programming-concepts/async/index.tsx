import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface StackFrame { fn: string; status: 'running' | 'waiting' | 'done' }
interface Step {
  callStack: StackFrame[]
  taskQueue: string[]
  microtaskQueue: string[]
  webApis: string[]
  output: string[]
  message: string
}

function eventLoopSteps(): Step[] {
  const steps: Step[] = []
  const push = (s: Partial<Step> & { message: string }) => {
    const prev = steps[steps.length - 1]
    const base: Step = { callStack: [], taskQueue: [], microtaskQueue: [], webApis: [], output: [], message: '' }
    steps.push({ ...base, ...prev, ...s })
  }

  steps.push({ callStack: [], taskQueue: [], microtaskQueue: [], webApis: [], output: [], message: 'Empty event loop. Call stack, queues are empty.' })

  push({ callStack: [{ fn: 'main()', status: 'running' }], message: 'Script starts executing — main() on call stack' })
  push({ callStack: [{ fn: 'main()', status: 'running' }, { fn: 'console.log("Start")', status: 'running' }], message: 'console.log("Start") pushed to call stack' })
  push({ callStack: [{ fn: 'main()', status: 'running' }], output: ['Start'], message: 'console.log pops. Output: "Start"' })

  push({ callStack: [{ fn: 'main()', status: 'running' }, { fn: 'setTimeout(cb, 1000)', status: 'running' }], message: 'setTimeout() called — registers with Web APIs' })
  push({ callStack: [{ fn: 'main()', status: 'running' }], webApis: ['Timer: 1000ms'], message: 'setTimeout pops. Timer running in Web API thread.' })

  push({ callStack: [{ fn: 'main()', status: 'running' }, { fn: 'Promise.then(cb)', status: 'running' }], message: 'Promise.then() registers a microtask callback' })
  push({ callStack: [{ fn: 'main()', status: 'running' }], microtaskQueue: ['Promise callback'], message: 'Promise resolved — callback added to microtask queue' })

  push({ callStack: [{ fn: 'main()', status: 'running' }, { fn: 'console.log("End")', status: 'running' }], message: 'console.log("End") called' })
  push({ callStack: [{ fn: 'main()', status: 'running' }], output: ['Start', 'End'], message: 'Output: "End". main() about to return.' })
  push({ callStack: [], output: ['Start', 'End'], message: 'Call stack empty. Event loop checks microtask queue FIRST.' })

  push({ callStack: [{ fn: 'Promise callback', status: 'running' }], microtaskQueue: [], message: 'Drain microtask queue: run Promise callback' })
  push({ callStack: [], output: ['Start', 'End', 'Promise resolved'], message: 'Promise callback done. Microtask queue empty. Check task queue.' })

  push({ callStack: [], taskQueue: ['setTimeout callback'], webApis: [], message: 'Timer fires — setTimeout callback moved from Web APIs → Task Queue' })
  push({ callStack: [{ fn: 'setTimeout callback', status: 'running' }], taskQueue: [], message: 'Event loop picks setTimeout callback from Task Queue' })
  push({ callStack: [], output: ['Start', 'End', 'Promise resolved', 'Timeout!'], message: 'setTimeout callback runs. Output: "Timeout!"' })
  push({ callStack: [], output: ['Start', 'End', 'Promise resolved', 'Timeout!'], message: 'All done. Order: synchronous → microtasks → macrotasks' })
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `console.log("Start");           // 1st

setTimeout(() => {
  console.log("Timeout!");        // 4th (macrotask)
}, 1000);

Promise.resolve().then(() => {
  console.log("Promise resolved"); // 3rd (microtask)
});

console.log("End");               // 2nd

// Output order:
// Start
// End
// Promise resolved  ← microtask runs before setTimeout
// Timeout!          ← macrotask runs last`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `import asyncio

async def main():
    print("Start")

    # Schedule a coroutine (like setTimeout)
    asyncio.create_task(delayed())

    # Await suspends here, yields control
    result = await fetch_data()
    print(f"Data: {result}")

    print("End")

async def delayed():
    await asyncio.sleep(1)
    print("Delayed!")

async def fetch_data():
    await asyncio.sleep(0)  # simulate IO
    return "hello"

asyncio.run(main())
# Python uses an event loop too — same concept,
# but explicit with 'async/await' syntax`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `import java.util.concurrent.CompletableFuture;

public class AsyncDemo {
    public static void main(String[] args) throws Exception {
        System.out.println("Start");

        // Like Promise — non-blocking
        CompletableFuture<String> future =
            CompletableFuture.supplyAsync(() -> {
                // Runs on ForkJoinPool thread
                return "async result";
            }).thenApply(result -> {
                System.out.println("Got: " + result);
                return result.toUpperCase();
            });

        System.out.println("End (before future completes)");
        future.get(); // block until done
    }
}`,
  },
]

const STATUS_COLOR: Record<string, string> = {
  running: 'bg-violet-500 text-white',
  waiting: 'bg-amber-400 text-slate-900',
  done: 'bg-emerald-500 text-white',
}

export default function EventLoopVisualizer() {
  const steps = eventLoopSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">JavaScript Event Loop</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Call stack, Web APIs, microtask queue, and task queue — visualized step by step
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>JavaScript is <strong>single-threaded</strong> — there is exactly one call stack, and only one function runs at a time. But a browser or Node.js can handle thousands of concurrent I/O operations. How? Not with threads — with the <strong>event loop</strong>. When you call <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">setTimeout</code> or <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">fetch()</code>, the work is handed off to a background Web API (a browser thread, or libuv in Node). The JS thread stays free to do other work. When the timer fires or the fetch resolves, a callback is placed in a queue and picked up by the event loop when the call stack is empty.</p>
        <p><strong>This is why blocking the event loop is so dangerous.</strong> If you run a CPU-heavy computation synchronously (e.g., sorting a million items), the call stack stays occupied — no other callbacks can run, no requests can be served, the browser UI freezes. The fix: offload to a Web Worker (browser) or worker thread (Node.js), or break the work into chunks with <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">setImmediate</code>.</p>
        <p><strong>async/await is syntax sugar over Promises.</strong> Writing <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">const data = await fetch(url)</code> is equivalent to <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">fetch(url).then(data =&gt; ...)</code>. Under the hood, the <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">await</code> suspends the async function and places a continuation in the microtask queue — which is why Promise callbacks always run before <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">setTimeout</code> callbacks, even if the timeout is 0ms.</p>
      </div>

      <div className="viz-container p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Call Stack */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Call Stack</h4>
            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl min-h-32 p-2 space-y-1 flex flex-col-reverse">
              {cur.callStack.map((frame, i) => (
                <div key={i} className={`px-2 py-1.5 rounded-lg text-xs font-mono truncate ${STATUS_COLOR[frame.status]}`}>
                  {frame.fn}
                </div>
              ))}
              {cur.callStack.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-2">empty</div>
              )}
            </div>
          </div>

          {/* Web APIs */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Web APIs</h4>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl min-h-32 p-2 space-y-1 bg-slate-50 dark:bg-slate-800/50">
              {cur.webApis.map((api, i) => (
                <div key={i} className="px-2 py-1.5 rounded-lg text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                  {api}
                </div>
              ))}
              {cur.webApis.length === 0 && <div className="text-xs text-slate-400 text-center py-2">idle</div>}
            </div>
          </div>

          {/* Queues */}
          <div className="space-y-2">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Microtask Queue</h4>
              <div className="border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-2 min-h-14 bg-emerald-50 dark:bg-emerald-950/20">
                {cur.microtaskQueue.map((m, i) => (
                  <div key={i} className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg px-2 py-1 font-mono">{m}</div>
                ))}
                {cur.microtaskQueue.length === 0 && <div className="text-xs text-slate-400 text-center py-1">empty</div>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Task Queue</h4>
              <div className="border-2 border-amber-200 dark:border-amber-800 rounded-xl p-2 min-h-14 bg-amber-50 dark:bg-amber-950/20">
                {cur.taskQueue.map((t, i) => (
                  <div key={i} className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg px-2 py-1 font-mono">{t}</div>
                ))}
                {cur.taskQueue.length === 0 && <div className="text-xs text-slate-400 text-center py-1">empty</div>}
              </div>
            </div>
          </div>

          {/* Output */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Console Output</h4>
            <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl min-h-32 p-2 bg-slate-900 space-y-1">
              {cur.output.map((o, i) => (
                <div key={i} className="text-xs font-mono text-emerald-400">&gt; {o}</div>
              ))}
              {cur.output.length === 0 && <div className="text-xs text-slate-600 font-mono">_</div>}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block">
            {cur.message}
          </p>
        </div>
      </div>

      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-sky-700 dark:text-sky-400 mb-2">Priority order</h3>
        <div className="flex items-center gap-2 flex-wrap text-sky-700 dark:text-sky-400">
          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300">1. Call Stack</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300">2. Microtasks (Promises)</span>
          <span>→</span>
          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 rounded-full text-xs font-medium text-amber-700 dark:text-amber-300">3. Macrotasks (setTimeout)</span>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
