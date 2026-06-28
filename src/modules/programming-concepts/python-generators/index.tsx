import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

// Simulated log lines — our generator streams these one at a time
const LOG_LINES = [
  'GET  /api/users         200   12ms',
  'POST /api/orders        201   45ms',
  'GET  /api/products/88   200    8ms',
  'PUT  /api/users/42      200   30ms',
  'GET  /assets/logo.png   404    3ms',
  'POST /api/payments      500  120ms',
  'GET  /api/users         200   11ms',
]

interface Step {
  phase: 'idle' | 'created' | 'running' | 'yielded' | 'exhausted'
  fnLine: number          // which line of generator fn is "active" (0-indexed)
  emitted: string[]       // values yielded so far
  memoryLines: number     // how many lines are in memory at once
  nextCallCount: number
  message: string
}

const genSteps = (): Step[] => [
  {
    phase: 'idle', fnLine: -1, emitted: [], memoryLines: 0, nextCallCount: 0,
    message: 'log_stream() is defined but NOT called yet. The generator body is completely frozen — zero execution.',
  },
  {
    phase: 'created', fnLine: 0, emitted: [], memoryLines: 0, nextCallCount: 0,
    message: 'gen = log_stream("access.log") — calling a generator function returns a generator OBJECT. No code runs yet! File is not even opened.',
  },
  {
    phase: 'running', fnLine: 1, emitted: [], memoryLines: 1, nextCallCount: 1,
    message: 'next(gen) #1 — generator wakes up, opens the file, reads ONE line into memory: "GET /api/users 200 12ms"',
  },
  {
    phase: 'yielded', fnLine: 2, emitted: [LOG_LINES[0]], memoryLines: 1, nextCallCount: 1,
    message: 'Hits yield — pauses execution, hands the value to the caller, and REMEMBERS where it paused. Memory: 1 line.',
  },
  {
    phase: 'running', fnLine: 1, emitted: [LOG_LINES[0]], memoryLines: 1, nextCallCount: 2,
    message: 'next(gen) #2 — resumes immediately after the yield. Reads the NEXT line. Previous line is released from memory.',
  },
  {
    phase: 'yielded', fnLine: 2, emitted: [LOG_LINES[0], LOG_LINES[1]], memoryLines: 1, nextCallCount: 2,
    message: 'Yields "POST /api/orders 201 45ms". Still only 1 line in memory — regardless of file size.',
  },
  {
    phase: 'running', fnLine: 1, emitted: [LOG_LINES[0], LOG_LINES[1]], memoryLines: 1, nextCallCount: 3,
    message: 'next(gen) #3 — resumes, reads line 3.',
  },
  {
    phase: 'yielded', fnLine: 2, emitted: LOG_LINES.slice(0, 3), memoryLines: 1, nextCallCount: 3,
    message: 'Yields line 3. A list comprehension would have loaded ALL 10M lines before returning anything.',
  },
  {
    phase: 'running', fnLine: 1, emitted: LOG_LINES.slice(0, 3), memoryLines: 1, nextCallCount: 4,
    message: 'Processing continues — yielding line 4, 5, 6, 7...',
  },
  {
    phase: 'yielded', fnLine: 2, emitted: LOG_LINES, memoryLines: 1, nextCallCount: 7,
    message: 'All 7 sample lines yielded. In real life this is 10 million lines — memory cost is still just 1 line.',
  },
  {
    phase: 'exhausted', fnLine: 3, emitted: LOG_LINES, memoryLines: 0, nextCallCount: 8,
    message: 'next(gen) #8 — function body finishes (loop ends). Python auto-raises StopIteration. for-loop catches this and exits cleanly.',
  },
]

const FN_LINES = [
  { code: 'def log_stream(filename):', indent: 0 },
  { code: '    for line in open(filename):  # reads ONE line at a time', indent: 1 },
  { code: '        yield line.strip()       # pause here → return value', indent: 2 },
  { code: '    # StopIteration raised automatically', indent: 1 },
]

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python',
    code: `# ─── GENERATOR FUNCTION ────────────────────────────────────
def log_stream(filename):
    """Yields one log line at a time — O(1) memory regardless of file size."""
    for line in open(filename):
        yield line.strip()   # pause + emit; resumes here on next next()

# ─── CONSUMER (for-loop hides the next() calls) ──────────────
error_count = 0
for entry in log_stream("access.log"):   # works on 10M-line file!
    if "500" in entry:
        error_count += 1
print(f"Found {error_count} server errors")

# ─── GENERATOR EXPRESSION (one-liner version) ────────────────
errors = (line for line in open("access.log") if "500" in line)

# ─── CHAINING GENERATORS (pipeline pattern) ──────────────────
def parse(lines):
    for line in lines:
        parts = line.split()
        yield {"method": parts[0], "path": parts[1], "status": int(parts[2])}

def only_errors(records):
    for r in records:
        if r["status"] >= 500:
            yield r

# Build a lazy pipeline — nothing runs until we iterate
pipeline = only_errors(parse(log_stream("access.log")))
for error in pipeline:
    print(error)  # processes one record at a time through all 3 stages`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (Generator Functions)',
    code: `// JS generators use function* and yield — same idea as Python

function* logStream(lines) {
    for (const line of lines) {
        yield line.trim()   // pause + emit value
    }
}

// Infinite sequence generator — never runs out
function* fibonacci() {
    let [a, b] = [0, 1]
    while (true) {
        yield a
        ;[a, b] = [b, a + b]
    }
}

const fib = fibonacci()
console.log(fib.next().value)  // 0  — calls resume generator
console.log(fib.next().value)  // 1
console.log(fib.next().value)  // 1
console.log(fib.next().value)  // 2

// Async generator — yield values from async source
async function* streamLogs(url) {
    const response = await fetch(url)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield decoder.decode(value)
    }
}

for await (const chunk of streamLogs('/api/logs')) {
    console.log(chunk)   // processes each chunk as it arrives
}`,
  },
  {
    lang: 'java' as const, label: 'Java (Iterator pattern)',
    code: `import java.io.*;
import java.util.Iterator;
import java.util.NoSuchElementException;

// Java has no yield keyword — must manually implement Iterator protocol
public class LogStream implements Iterable<String>, Iterator<String> {
    private final BufferedReader reader;
    private String nextLine;

    public LogStream(String filename) throws IOException {
        this.reader = new BufferedReader(new FileReader(filename));
        advance();  // pre-load first line
    }

    private void advance() {
        try {
            nextLine = reader.readLine();  // reads ONE line — O(1) memory
        } catch (IOException e) {
            nextLine = null;
        }
    }

    @Override public boolean hasNext() { return nextLine != null; }

    @Override public String next() {
        if (!hasNext()) throw new NoSuchElementException();
        String current = nextLine;
        advance();  // load next line ready for next call
        return current.strip();
    }

    @Override public Iterator<String> iterator() { return this; }
}

// Usage — same pattern as Python for-loop
long errorCount = 0;
try (LogStream logs = new LogStream("access.log")) {
    for (String line : logs) {      // iterates lazily, 1 line at a time
        if (line.contains("500")) errorCount++;
    }
}  // file closed here — try-with-resources = context manager
System.out.println("Errors: " + errorCount);`,
  },
]

export default function PyGeneratorsVisualizer() {
  const steps = genSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]
  const [showComparison, setShowComparison] = useState(false)

  const PHASE_COLOR = {
    idle: 'border-slate-300 dark:border-slate-600',
    created: 'border-blue-400 dark:border-blue-600',
    running: 'border-amber-400 dark:border-amber-600',
    yielded: 'border-emerald-400 dark:border-emerald-600',
    exhausted: 'border-rose-400 dark:border-rose-600',
  }

  const PHASE_LABEL = {
    idle: { label: 'Not called', color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
    created: { label: 'Object created', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
    running: { label: 'Running ▶', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
    yielded: { label: 'Yielded — paused', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
    exhausted: { label: 'Exhausted ✓', color: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' },
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Python — Generators & Iterators</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">yield</code> turns a function into a lazy stream — pausing at each value, resuming on demand
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A server's <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">access.log</code> is <strong>10 million lines</strong>.
          Loading it all into a list: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">lines = open(f).readlines()</code> — blows up RAM (~8 GB).
          A generator reads <em>one line at a time</em>, processes it, releases it — constant O(1) memory no matter how large the file.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">When to use generators</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Any time you process a large sequence and don't need all values at once: reading huge files, streaming API responses, database cursors, infinite sequences (Fibonacci, IDs), or building lazy data pipelines where multiple transforms chain together.
          Rule of thumb: if you'd normally write <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">result = []</code> + <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">result.append(x)</code>, consider <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">yield x</code> instead.
        </p>
      </div>

      <div className="viz-container p-6 space-y-5">
        {/* State badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${PHASE_LABEL[cur.phase].color}`}>
            {PHASE_LABEL[cur.phase].label}
          </span>
          {cur.nextCallCount > 0 && (
            <span className="text-xs text-slate-500">next() called {cur.nextCallCount}× so far</span>
          )}
          {cur.memoryLines > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Memory: {cur.memoryLines} line
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Generator function with line highlight */}
          <div className={`rounded-xl border-2 p-4 space-y-2 transition-all duration-300 ${PHASE_COLOR[cur.phase]}`}>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Generator Function</div>
            <div className="rounded-lg bg-slate-900 p-3 font-mono text-xs space-y-1">
              {FN_LINES.map((fl, i) => (
                <div key={i} className={`px-1 rounded transition-all duration-200 ${
                  cur.fnLine === i
                    ? 'bg-amber-500/30 text-amber-200'
                    : 'text-slate-400'
                }`}>
                  {cur.fnLine === i && <span className="text-amber-400 mr-1">▶</span>}
                  {fl.code}
                </div>
              ))}
            </div>
            {cur.phase === 'yielded' && (
              <div className="text-[10px] text-emerald-400 font-mono bg-slate-900 rounded px-2 py-1">
                ↑ paused here, holding state
              </div>
            )}
          </div>

          {/* File source (simulated) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              access.log <span className="text-slate-400 font-normal">(10M lines)</span>
            </div>
            <div className="space-y-1">
              {LOG_LINES.map((line, i) => {
                const isEmitted = i < cur.emitted.length
                const isActive = cur.phase === 'running' && i === cur.emitted.length
                return (
                  <div key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-all duration-200 ${
                    isActive ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40' :
                    isEmitted ? 'text-emerald-400 line-through opacity-50' :
                    'text-slate-500'
                  }`}>
                    {i + 1}. {line}
                  </div>
                )
              })}
              <div className="text-[10px] text-slate-600 font-mono px-1.5">... 9,999,993 more lines</div>
            </div>
          </div>

          {/* Yielded values */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              Yielded values <span className="text-slate-400 font-normal">({cur.emitted.length})</span>
            </div>
            {cur.emitted.length === 0 ? (
              <div className="text-xs text-slate-400 italic">none yet</div>
            ) : (
              <div className="space-y-1.5">
                {cur.emitted.map((v, i) => (
                  <div key={i} className={`text-[10px] font-mono px-2 py-1 rounded border transition-all duration-300 ${
                    v.includes('500') ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' :
                    'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {v}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comparison toggle */}
        <button
          onClick={() => setShowComparison(s => !s)}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
        >
          {showComparison ? 'Hide' : 'Show'} generator vs list comparison
        </button>

        {showComparison && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 p-3">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-2">❌ List (eager)</div>
              <div className="font-mono text-xs text-rose-600 dark:text-rose-400 space-y-0.5">
                <div>lines = open(f).readlines()</div>
                <div className="text-[10px] text-slate-500"># loads ALL 10M lines → ~8GB RAM</div>
                <div className="text-[10px] text-slate-500"># nothing returned until done</div>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">✓ Generator (lazy)</div>
              <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 space-y-0.5">
                <div>for line in open(f):  yield line</div>
                <div className="text-[10px] text-slate-500"># 1 line in memory at a time → ~200 bytes</div>
                <div className="text-[10px] text-slate-500"># starts yielding immediately</div>
              </div>
            </div>
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
