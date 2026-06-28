import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

// ─── STACK vs HEAP ANIMATION ──────────────────────────────────

interface StackFrame { fn: string; locals: { name: string; value: string; note?: string }[] }
interface HeapObj { id: string; label: string; fields: string[]; reachable: boolean }
interface MemStep {
  stack: StackFrame[]
  heap: HeapObj[]
  gcRoots: string[]
  message: string
  phase: 'allocate' | 'gc' | 'idle'
}

function memSteps(): MemStep[] {
  const steps: MemStep[] = []

  const push = (s: MemStep) => steps.push(s)

  push({ stack: [], heap: [], gcRoots: [], phase: 'idle',
    message: 'Program starts. Stack is empty. Heap is empty.' })

  push({ stack: [{ fn: 'main()', locals: [] }], heap: [], gcRoots: [], phase: 'idle',
    message: 'main() is called → stack frame pushed. Local variables live here.' })

  push({
    stack: [{ fn: 'main()', locals: [{ name: 'x', value: '42', note: 'primitive — lives on stack' }] }],
    heap: [], gcRoots: [], phase: 'allocate',
    message: 'let x = 42 — primitive value stored directly in the stack frame. No heap allocation.',
  })

  push({
    stack: [{ fn: 'main()', locals: [
      { name: 'x', value: '42' },
      { name: 'user', value: '→ H1', note: 'reference to heap' },
    ] }],
    heap: [{ id: 'H1', label: 'User object', fields: ['name: "Alice"', 'age: 30'], reachable: true }],
    gcRoots: ['main.user → H1'], phase: 'allocate',
    message: 'let user = { name: "Alice", age: 30 } — object allocated on HEAP. Stack holds a reference (pointer) to it.',
  })

  push({
    stack: [
      { fn: 'main()', locals: [{ name: 'x', value: '42' }, { name: 'user', value: '→ H1' }] },
      { fn: 'greet(user)', locals: [{ name: 'u', value: '→ H1', note: 'same heap object' }] },
    ],
    heap: [{ id: 'H1', label: 'User object', fields: ['name: "Alice"', 'age: 30'], reachable: true }],
    gcRoots: ['main.user → H1', 'greet.u → H1'], phase: 'allocate',
    message: 'greet(user) called — new stack frame. Parameter u is a COPY of the reference, both point to H1 on heap.',
  })

  push({
    stack: [
      { fn: 'main()', locals: [{ name: 'x', value: '42' }, { name: 'user', value: '→ H1' }] },
      { fn: 'greet(user)', locals: [
        { name: 'u', value: '→ H1' },
        { name: 'msg', value: '→ H2', note: 'new string on heap' },
      ] },
    ],
    heap: [
      { id: 'H1', label: 'User object', fields: ['name: "Alice"', 'age: 30'], reachable: true },
      { id: 'H2', label: '"Hello, Alice!"', fields: [], reachable: true },
    ],
    gcRoots: ['main.user → H1', 'greet.u → H1', 'greet.msg → H2'], phase: 'allocate',
    message: 'let msg = "Hello, " + u.name — string concatenation creates a NEW string object on heap (strings are immutable).',
  })

  push({
    stack: [
      { fn: 'main()', locals: [{ name: 'x', value: '42' }, { name: 'user', value: '→ H1' }] },
    ],
    heap: [
      { id: 'H1', label: 'User object', fields: ['name: "Alice"', 'age: 30'], reachable: true },
      { id: 'H2', label: '"Hello, Alice!"', fields: [], reachable: false },
    ],
    gcRoots: ['main.user → H1'], phase: 'gc',
    message: 'greet() returns — its stack frame is POPPED instantly. H2 ("Hello, Alice!") lost its last reference → unreachable.',
  })

  push({
    stack: [
      { fn: 'main()', locals: [{ name: 'x', value: '42' }, { name: 'user', value: '→ H1' }] },
    ],
    heap: [
      { id: 'H1', label: 'User object', fields: ['name: "Alice"', 'age: 30'], reachable: true },
    ],
    gcRoots: ['main.user → H1'], phase: 'gc',
    message: 'Garbage Collector runs — traces from GC roots, finds H2 unreachable, frees its memory. H1 still reachable from main.',
  })

  push({
    stack: [],
    heap: [],
    gcRoots: [], phase: 'gc',
    message: 'main() returns — stack frame popped, H1 loses its last reference. GC frees H1. Memory fully reclaimed.',
  })

  return steps
}

// ─── GC ALGORITHM CARDS ───────────────────────────────────────

const GC_ALGORITHMS = [
  {
    name: 'Reference Counting',
    lang: 'CPython',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    how: 'Every object carries a counter of how many references point to it. Counter increments on assignment, decrements on delete/out-of-scope. When count hits 0, the object is freed immediately — no pause.',
    pro: 'Immediate reclamation, predictable latency, no GC pause.',
    con: 'Cannot collect cycles (A → B → A). Python has a separate cycle-detector that runs periodically to handle this.',
    example: 'a = [1, 2]  # refcount=1\nb = a        # refcount=2\ndel a        # refcount=1\ndel b        # refcount=0 → freed immediately',
  },
  {
    name: 'Mark and Sweep',
    lang: 'JVM (old GC), early V8',
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    how: 'Phase 1 (Mark): start from GC roots (stack, globals, registers), traverse all reachable objects and mark them. Phase 2 (Sweep): scan the entire heap, free everything unmarked.',
    pro: 'Handles cycles correctly. Simple to implement.',
    con: '"Stop-the-world" pause during GC — threads freeze while GC runs. Causes latency spikes.',
    example: 'GC roots → Object A → Object B\n         → Object C → Object D\nObject E (unreachable) → freed\nObject F → Object E → freed (cycle handled)',
  },
  {
    name: 'Generational GC',
    lang: 'JVM (G1, ZGC), V8, .NET',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    how: '"Most objects die young" — the generational hypothesis. New objects go into Young Gen (Eden + Survivor). Most die here; survivors are promoted to Old Gen. Young GC is fast (small space). Old GC (Full GC) is rare.',
    pro: 'Much faster than full mark-sweep. Short pauses for young GC. Old GC infrequent.',
    con: 'Promoted objects that become garbage waste Old Gen space until Full GC. Complex to tune.',
    example: 'Young Gen: Eden → [Minor GC] → S0/S1 → [after N cycles] → Old Gen\nOld Gen: [Major/Full GC when full]\nMetaspace: class definitions, JIT code',
  },
]

// ─── MEMORY LEAK PATTERNS ─────────────────────────────────────

const LEAK_PATTERNS = [
  {
    lang: 'JavaScript',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    patterns: [
      {
        name: 'Forgotten event listeners',
        leak: `// LEAK: listener keeps component alive forever\nfunction setup() {\n  const el = document.getElementById('btn')\n  el.addEventListener('click', heavyHandler)\n  // heavyHandler closes over large data\n}`,
        fix: `// FIX: remove listener when done\nconst ctrl = new AbortController()\nel.addEventListener('click', handler, { signal: ctrl.signal })\n// cleanup:\nctrl.abort()  // removes all listeners`,
      },
      {
        name: 'Closures holding large scope',
        leak: `function outer() {\n  const bigArray = new Array(1_000_000).fill(0)\n  return function inner() {\n    // Only uses one value, but closes over\n    // entire bigArray scope — never freed\n    return bigArray[0]\n  }\n}`,
        fix: `function outer() {\n  const bigArray = new Array(1_000_000).fill(0)\n  const first = bigArray[0]   // extract only what's needed\n  // bigArray can now be GC'd\n  return function inner() { return first }\n}`,
      },
    ],
  },
  {
    lang: 'Python',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    patterns: [
      {
        name: 'Reference cycles (pre-3.4)',
        leak: `class Node:\n    def __init__(self):\n        self.other = None\n\na = Node()\nb = Node()\na.other = b  # a → b\nb.other = a  # b → a  (cycle!)\ndel a, b\n# refcount never hits 0 — cycle detector needed`,
        fix: `import gc\nimport weakref  # doesn't increment refcount\n\nclass Node:\n    def __init__(self):\n        self.other = None\n\na = Node()\nb = Node()\na.other = weakref.ref(b)  # weak reference — no cycle\n# OR: just call gc.collect() to break cycles`,
      },
      {
        name: 'Unclosed resources',
        leak: `# LEAK: file handle not closed on exception\ndef read_data(path):\n    f = open(path)\n    data = f.read()   # if this raises, f stays open\n    f.close()\n    return data`,
        fix: `# FIX: context manager guarantees close\ndef read_data(path):\n    with open(path) as f:   # __exit__ closes even on exception\n        return f.read()`,
      },
    ],
  },
  {
    lang: 'Java / JVM',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    patterns: [
      {
        name: 'Unbounded static collections',
        leak: `public class Cache {\n    // LEAK: grows forever, GC can never collect\n    static final Map<String, byte[]> CACHE = new HashMap<>();\n\n    public static void store(String key, byte[] data) {\n        CACHE.put(key, data);  // entries never removed\n    }\n}`,
        fix: `// FIX: use WeakHashMap or a bounded LRU cache\nstatic final Map<String, byte[]> CACHE =\n    Collections.synchronizedMap(\n        new LinkedHashMap<>(1000, 0.75f, true) {\n            protected boolean removeEldestEntry(Map.Entry e) {\n                return size() > 1000;  // evict oldest\n            }\n        }\n    );`,
      },
      {
        name: 'Unclosed streams / connections',
        leak: `// LEAK: if exception thrown before close()\npublic void readFile(String path) throws IOException {\n    BufferedReader reader = new BufferedReader(new FileReader(path));\n    String line = reader.readLine();   // might throw\n    reader.close();  // never called if above throws\n}`,
        fix: `// FIX: try-with-resources (Java 7+)\npublic void readFile(String path) throws IOException {\n    try (BufferedReader reader = new BufferedReader(new FileReader(path))) {\n        String line = reader.readLine();\n    }  // reader.close() called automatically\n}`,
      },
    ],
  },
]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript (V8)',
    code: `// ─── STACK vs HEAP ───────────────────────────────────────────
function example() {
    let num = 42              // primitive → STACK (copied by value)
    let str = "hello"         // string → HEAP (immutable, interned)
    let obj = { x: 1 }       // object → HEAP (reference on stack)
    let arr = [1, 2, 3]      // array → HEAP

    // Pass by value (primitive)
    function double(n) { n *= 2 }  // n is a copy — original unchanged
    double(num)                     // num is still 42

    // Pass by reference (object)
    function mutate(o) { o.x = 99 }  // same object in heap
    mutate(obj)                        // obj.x is now 99
}

// ─── CHECKING FOR LEAKS (Node.js) ─────────────────────────────
const used = process.memoryUsage()
console.log({
    rss:       (used.rss / 1024 / 1024).toFixed(2) + ' MB',  // total RSS
    heapTotal: (used.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    heapUsed:  (used.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
    external:  (used.external / 1024 / 1024).toFixed(2) + ' MB',
})

// ─── WEAK REFERENCES (ES2021) ─────────────────────────────────
const cache = new WeakMap()  // keys are weakly held — GC can collect them
function memoize(obj, compute) {
    if (!cache.has(obj)) cache.set(obj, compute(obj))
    return cache.get(obj)
    // When obj is no longer referenced elsewhere, WeakMap entry is GC'd
}`,
  },
  {
    lang: 'python' as const, label: 'Python (CPython)',
    code: `import sys
import gc
import tracemalloc

# ─── REFERENCE COUNTING ───────────────────────────────────────
a = [1, 2, 3]
print(sys.getrefcount(a))  # 2 (a + the getrefcount call itself)

b = a                       # same list, refcount now 3
print(sys.getrefcount(a))  # 3

del b                       # refcount drops to 2
# list is NOT freed yet — 'a' still holds it

del a                       # refcount → 0 → freed immediately
# No GC pause needed — just reference counting

# ─── DETECTING CYCLES ─────────────────────────────────────────
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

n1 = Node(1)
n2 = Node(2)
n1.next = n2
n2.next = n1   # cycle: n1 → n2 → n1

del n1, n2     # refcount never hits 0 due to cycle
gc.collect()   # cycle detector runs, breaks the cycle, frees both

# ─── MEMORY PROFILING ─────────────────────────────────────────
tracemalloc.start()

# ... your code here ...
data = {i: [i] * 1000 for i in range(1000)}

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:5]:
    print(stat)   # shows which lines allocate the most memory`,
  },
  {
    lang: 'java' as const, label: 'Java (JVM / G1GC)',
    code: `// ─── STACK vs HEAP in JVM ────────────────────────────────────
public class MemoryDemo {
    // Static fields → MetaSpace (class data)
    static int staticVal = 10;

    public static void main(String[] args) {
        int stackPrimitive = 42;    // STACK — copied by value
        String str = "hello";       // HEAP — String pool (interned)
        int[] arr = new int[100];   // HEAP — array object
        Object obj = new Object();  // HEAP — object instance

        // Stack frame for main() stores:
        // - primitive values directly (stackPrimitive = 42)
        // - references to heap objects (str, arr, obj are pointers)
    }
}

// ─── FORCING GC (rarely do this in production) ────────────────
System.gc();   // hint to JVM — not guaranteed to run immediately
Runtime.getRuntime().gc();

// ─── MONITORING HEAP (JVM flags) ─────────────────────────────
// Run with: java -Xmx512m -Xms256m -verbose:gc -Xlog:gc* MyApp
// -Xmx: max heap size
// -Xms: initial heap size
// -verbose:gc: print GC events

// ─── HEAP DUMP ANALYSIS ───────────────────────────────────────
// jmap -dump:format=b,file=heap.hprof <pid>
// Then open heap.hprof in Eclipse MAT or VisualVM
// Look for: retained heap, shortest paths to GC roots

// ─── SOFT / WEAK / PHANTOM REFERENCES ────────────────────────
import java.lang.ref.*;

Object obj = new Object();

WeakReference<Object> weak = new WeakReference<>(obj);
// weak ref: GC can collect obj even if only weakly referenced
// Use for caches that should not prevent GC

SoftReference<Object> soft = new SoftReference<>(obj);
// soft ref: collected only when JVM is low on memory
// Good for memory-sensitive caches

obj = null;  // remove strong reference
System.gc();
System.out.println(weak.get());  // null — obj was collected`,
  },
]

export default function MemoryModelViz() {
  const [tab, setTab] = useState<'stack-heap' | 'gc' | 'leaks'>('stack-heap')
  const [leakLang, setLeakLang] = useState(0)
  const [leakPattern, setLeakPattern] = useState(0)
  const [showFix, setShowFix] = useState(false)

  const steps = memSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const lang = LEAK_PATTERNS[leakLang]
  const pattern = lang.patterns[leakPattern]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Memory Model</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Stack vs Heap, garbage collection algorithms, and how memory leaks happen
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 space-y-2">
        <p>Every program has two main memory regions. The <strong>Stack</strong> is a region managed automatically by the CPU: when a function is called, a frame is pushed (holding local variables and return address); when it returns, the frame is popped in microseconds — no GC needed. Stack is fast but small (typically 1–8 MB).</p>
        <p>The <strong>Heap</strong> is a large pool for dynamic allocations — objects, arrays, strings. Heap memory must be explicitly reclaimed: either manually (C/C++) or by a <strong>garbage collector</strong> (Java, Python, JavaScript). GC tracks which objects are still reachable and frees the rest. The challenge: GC introduces pauses and complexity.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'stack-heap' as const, label: 'Stack vs Heap' },
          { id: 'gc' as const, label: 'GC Algorithms' },
          { id: 'leaks' as const, label: 'Memory Leaks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Stack vs Heap ── */}
      {tab === 'stack-heap' && (
        <div className="viz-container p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Stack */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500"></span> Call Stack
              </div>
              <div className="border-2 border-violet-200 dark:border-violet-800 rounded-xl min-h-40 p-2 flex flex-col-reverse gap-1.5 bg-violet-50/50 dark:bg-violet-950/20">
                {cur.stack.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">empty</div>
                )}
                {cur.stack.map((frame, fi) => (
                  <div key={fi} className={`rounded-lg border ${fi === cur.stack.length - 1 ? 'border-violet-400 dark:border-violet-600 bg-violet-100 dark:bg-violet-900/40' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} p-2`}>
                    <div className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">{frame.fn}</div>
                    {frame.locals.map((l, li) => (
                      <div key={li} className="flex items-center gap-1.5 text-xs">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{l.name}: </span>
                        <span className={`font-mono font-bold ${l.value.startsWith('→') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{l.value}</span>
                        {l.note && <span className="text-slate-400 text-[10px]">({l.note})</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 mt-1 text-center">↓ Bottom (fixed)</div>
            </div>

            {/* Heap */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Heap
              </div>
              <div className="border-2 border-emerald-200 dark:border-emerald-800 rounded-xl min-h-40 p-2 space-y-1.5 bg-emerald-50/50 dark:bg-emerald-950/20">
                {cur.heap.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">empty</div>
                )}
                {cur.heap.map(obj => (
                  <div key={obj.id} className={`rounded-lg border p-2 transition-all duration-300 ${obj.reachable ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30' : 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 opacity-60'}`}>
                    <div className={`text-xs font-bold mb-1 flex items-center gap-1 ${obj.reachable ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1 rounded">{obj.id}</span>
                      {obj.label}
                      {!obj.reachable && <span className="ml-auto text-[10px]">unreachable</span>}
                    </div>
                    {obj.fields.map((f, i) => (
                      <div key={i} className="text-xs font-mono text-slate-600 dark:text-slate-400">{f}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GC Roots */}
          {cur.gcRoots.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-500">GC Roots: </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">{cur.gcRoots.join(' | ')}</span>
            </div>
          )}

          <div className={`rounded-lg px-4 py-2.5 text-sm text-center transition-all ${
            cur.phase === 'gc' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300' :
            cur.phase === 'allocate' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' :
            'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {cur.phase === 'gc' && <span className="font-bold mr-1">GC: </span>}
            {cur.phase === 'allocate' && <span className="font-bold mr-1">Alloc: </span>}
            {cur.message}
          </div>

          <StepControls ctrl={ctrl} />
        </div>
      )}

      {/* ── GC Algorithms ── */}
      {tab === 'gc' && (
        <div className="space-y-4">
          {GC_ALGORITHMS.map(gc => (
            <div key={gc.name} className={`rounded-xl border ${gc.border} ${gc.bg} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`font-bold text-base ${gc.color}`}>{gc.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">Used by: {gc.lang}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">How it works</div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{gc.how}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Advantage</div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{gc.pro}</p>
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1 mt-3">Limitation</div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{gc.con}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Example</div>
                  <pre className="font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre overflow-x-auto leading-relaxed bg-white/60 dark:bg-black/20 rounded p-2">{gc.example}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Memory Leaks ── */}
      {tab === 'leaks' && (
        <div className="space-y-4">
          {/* Language selector */}
          <div className="flex gap-2">
            {LEAK_PATTERNS.map((l, i) => (
              <button key={l.lang} onClick={() => { setLeakLang(i); setLeakPattern(0); setShowFix(false) }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${leakLang === i ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                {l.lang}
              </button>
            ))}
          </div>

          {/* Pattern selector */}
          <div className="flex gap-2">
            {lang.patterns.map((p, i) => (
              <button key={p.name} onClick={() => { setLeakPattern(i); setShowFix(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${leakPattern === i ? `${lang.border} ${lang.bg} ${lang.color}` : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                {p.name}
              </button>
            ))}
          </div>

          <div className={`rounded-xl border ${lang.border} ${lang.bg} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold text-sm ${lang.color}`}>{pattern.name}</h3>
              <button onClick={() => setShowFix(!showFix)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${showFix ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                {showFix ? 'Show leak' : 'Show fix'}
              </button>
            </div>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${showFix ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {showFix ? 'Fixed version' : 'Memory leak'}
              </div>
              <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre bg-white/70 dark:bg-black/20 rounded-lg p-3 overflow-x-auto leading-relaxed">
                {showFix ? pattern.fix : pattern.leak}
              </pre>
            </div>
          </div>
        </div>
      )}

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
