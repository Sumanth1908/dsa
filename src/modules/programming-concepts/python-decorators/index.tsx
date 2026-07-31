import React from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'

interface Step {
  phase: 'define' | 'apply' | 'call' | 'enter-wrapper' | 'call-original' | 'original-runs' | 'original-returns' | 'exit-wrapper' | 'done'
  wrapperActive: boolean
  originalActive: boolean
  startTime: string | null
  endTime: string | null
  elapsed: string | null
  returnValue: string | null
  logOutput: string[]
  message: string
}

const decoratorSteps = (): Step[] => [
  {
    phase: 'define', wrapperActive: false, originalActive: false,
    startTime: null, endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: 'Define log_execution_time — it\'s just a regular function that accepts another function as its argument.',
  },
  {
    phase: 'apply', wrapperActive: false, originalActive: false,
    startTime: null, endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: '@log_execution_time above get_user is syntactic sugar for: get_user = log_execution_time(get_user). Python replaces the original with wrapper.',
  },
  {
    phase: 'call', wrapperActive: false, originalActive: false,
    startTime: null, endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: 'Caller invokes get_user(user_id=123). Because of the decorator, this actually calls wrapper(user_id=123).',
  },
  {
    phase: 'enter-wrapper', wrapperActive: true, originalActive: false,
    startTime: '12:00:00.000', endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: 'wrapper() starts. Records start time: t₀ = 12:00:00.000. The original get_user hasn\'t been touched yet.',
  },
  {
    phase: 'call-original', wrapperActive: true, originalActive: false,
    startTime: '12:00:00.000', endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: 'wrapper() calls the original get_user(user_id=123) and waits for it to finish.',
  },
  {
    phase: 'original-runs', wrapperActive: true, originalActive: true,
    startTime: '12:00:00.000', endTime: null, elapsed: null, returnValue: null, logOutput: [],
    message: 'Original get_user runs: hits the database, waits for query (85ms). Wrapper is paused, waiting.',
  },
  {
    phase: 'original-returns', wrapperActive: true, originalActive: true,
    startTime: '12:00:00.000', endTime: '12:00:00.085', elapsed: null, returnValue: '{"id": 123, "name": "Alice"}',
    logOutput: [],
    message: 'get_user returns {"id": 123, "name": "Alice"}. Control passes back to wrapper.',
  },
  {
    phase: 'exit-wrapper', wrapperActive: true, originalActive: false,
    startTime: '12:00:00.000', endTime: '12:00:00.085', elapsed: '85ms',
    returnValue: '{"id": 123, "name": "Alice"}',
    logOutput: ['🕐 get_user(user_id=123) took 85ms'],
    message: 'wrapper records end time, computes elapsed = 85ms, logs it. The original function was never modified.',
  },
  {
    phase: 'done', wrapperActive: false, originalActive: false,
    startTime: '12:00:00.000', endTime: '12:00:00.085', elapsed: '85ms',
    returnValue: '{"id": 123, "name": "Alice"}',
    logOutput: ['🕐 get_user(user_id=123) took 85ms'],
    message: '✓ Caller receives the original result. Timing was added with zero changes to get_user\'s code. Stack any number of decorators: @cache @retry @log_time def get_user().',
  },
]

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python',
    code: `import time
import functools

# ─── DECORATOR DEFINITION ────────────────────────────────────
def log_execution_time(func):
    @functools.wraps(func)   # preserves __name__, __doc__ of original
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)   # call the original
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"🕐 {func.__name__}({', '.join(str(a) for a in args)}) took {elapsed_ms:.1f}ms")
        return result
    return wrapper

# ─── APPLYING THE DECORATOR ──────────────────────────────────
@log_execution_time              # ← same as: get_user = log_execution_time(get_user)
def get_user(user_id):
    return db.query("SELECT * FROM users WHERE id = ?", user_id)

get_user(123)
# Console: 🕐 get_user(123) took 85.3ms

# ─── CHAINING DECORATORS (applied bottom-up) ─────────────────
def retry(max_attempts=3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(0.5 ** attempt)
        return wrapper
    return decorator

@log_execution_time   # applied second (outer)
@retry(max_attempts=3)  # applied first (inner)
def fetch_data(url):
    return requests.get(url).json()
# Execution order: log_execution_time(retry(fetch_data))(url)`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (Higher-Order Functions)',
    code: `// JS has no @decorator syntax, but the same pattern via HOFs

// ─── DECORATOR PATTERN (function wrapping) ────────────────────
const withTiming = (fn) => {
    return (...args) => {
        const start = performance.now()
        const result = fn(...args)   // call original
        const elapsed = (performance.now() - start).toFixed(1)
        console.log(\`\${fn.name}(\${args}) took \${elapsed}ms\`)
        return result
    }
}

const getUser = (userId) => db.query('SELECT * FROM users WHERE id = ?', userId)
const timedGetUser = withTiming(getUser)
timedGetUser(123)  // 🕐 getUser(123) took 85.1ms

// ─── CLASS METHOD DECORATORS (ES2022 proposal, Stage 3) ────────
class UserService {
    @log              // native decorator syntax — currently experimental
    @retry({ attempts: 3 })
    async getUser(id) {
        return await db.users.findById(id)
    }
}

// ─── COMPOSITION (without special syntax) ────────────────────
const compose = (...fns) => (fn) => fns.reduceRight((f, g) => g(f), fn)
const enhance = compose(withTiming, withRetry, withCache)
const enhancedGetUser = enhance(getUser)`,
  },
  {
    lang: 'java' as const, label: 'Java (AOP / Proxy)',
    code: `// Java achieves the same via annotations + Spring AOP or dynamic proxies

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

// ─── DECLARE THE ANNOTATION ──────────────────────────────────
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogTime {}

// ─── DEFINE THE ASPECT (equivalent to the decorator function) ─
@Aspect
@Component
public class TimingAspect {
    @Around("@annotation(LogTime)")  // runs around any @LogTime method
    public Object logTime(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();   // call the original method
            long elapsed = System.currentTimeMillis() - start;
            System.out.printf("🕐 %s took %dms%n", pjp.getSignature().getName(), elapsed);
            return result;
        } catch (Throwable t) {
            System.out.printf("✗ %s failed after %dms%n",
                pjp.getSignature().getName(),
                System.currentTimeMillis() - start);
            throw t;
        }
    }
}

// ─── APPLYING THE ANNOTATION ─────────────────────────────────
@Service
public class UserService {
    @LogTime      // ← applied like Python @decorator
    public User getUser(Long userId) {
        return userRepository.findById(userId).orElseThrow();
    }
}`,
  },
]

const DOUBTS = [
  {
    q: 'When does decorator code actually run?',
    a: 'Decorator code runs at **definition time**, not call time. The moment Python encounters `@log_time` above `def fetch_user()`, it immediately calls `log_time(fetch_user)` and rebinds the name `fetch_user` to whatever the decorator returns (usually the wrapper). This substitution happens once, during module import or class definition—before any code calls `fetch_user()`. The wrapper function itself runs every time you call the decorated function. This two-level execution is crucial: if your decorator has side effects (like registering a global callback or opening a file), those fire at import time, potentially surprising you if you only expected them during function calls. **Rule of thumb:** decorators execute definition-time code once; wrappers execute call-time code repeatedly.',
  },
  {
    q: 'Why does a decorator WITH arguments need three nested functions?',
    a: 'A parameterized decorator like `@retry(times=3)` requires three nested functions because of the call chain: `retry(times=3)` must first return a decorator function, which then receives the function being decorated, which finally returns the wrapper. The outer function (`retry`) is a factory—it takes parameters and builds a decorator. The middle function is the actual decorator that matches the `@syntax`—it receives the target function. The innermost function is the wrapper that runs each time the decorated function is called. Without this nesting, you cannot both parameterize the decorator AND access the target function. For example: `@retry(times=3)` calls `retry(times=3)` (factory → returns decorator), which is applied to `get_user` (decorator receives it → returns wrapper), and `get_user(id)` calls the wrapper. **Common mistake:** forgetting that parameterized decorators need an extra layer; writing `@retry` instead of `@retry()` binds the factory itself, not a decorator.',
  },
  {
    q: 'What does functools.wraps actually fix?',
    a: '`functools.wraps` copies the original function\'s metadata onto the wrapper so introspection tools and debuggers see the correct identity. Without it, `f.__name__` becomes `\'wrapper\'`, docstrings vanish, and debugging becomes confusing—stack traces show `wrapper()` instead of the actual function name. When you inspect `help(decorated_function)`, it shows the wrapper\'s generic docstring rather than the original\'s. `@functools.wraps(original_func)` copies `__name__`, `__doc__`, `__module__`, `__qualname__`, `__annotations__`, and `__dict__` from the original onto the wrapper before the wrapper is returned. This is especially important in testing frameworks and API documentation tools that rely on function names and docstrings. **Rule of thumb:** always use `@functools.wraps` on wrapper functions—it costs nothing and prevents subtle debugging headaches. **Common mistake:** omitting it, then spending hours wondering why your stack traces show `\'wrapper\'` instead of your function\'s real name.',
  },
  {
    q: 'Is @decorator different from writing f = deco(f)?',
    a: 'No—the `@` syntax is pure syntactic sugar for the assignment `f = deco(f)`. When Python sees `@timer` above `def fetch()`, it is literally equivalent to writing `fetch = timer(fetch)` on the line after the function body. This demystifies stacking: `@cache` over `@retry` over `def get_data()` expands to `get_data = cache(retry(get_data))`. The bottom decorator (`@retry`) applies first (innermost call), wrapping the original function, then the top decorator (`@cache`) wraps that result. This inside-out order surprises many people but follows function composition rules: compose(cache, retry, get_data) applies right-to-left. You can even omit the `@` syntax and write the assignment explicitly—both forms are identical. Understanding this equivalence helps reason about decorator order and behavior. **Rule of thumb:** decorators are just function wrappers; the `@` syntax is just shorthand for rebinding a name to a function call.',
  },
]

export default function PyDecoratorsVisualizer() {
  const steps = decoratorSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const boxCls = (active: boolean, color: string) =>
    `rounded-xl border-2 p-4 transition-all duration-300 ${active ? `${color} scale-[1.02] shadow-lg` : 'border-slate-200 dark:border-slate-700'}`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Python — Decorators</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Functions that wrap functions — add logging, caching, retries, or auth without touching the original code
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You have a <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">get_user()</code> function that hits a database.
          You want to log how long it takes — without cluttering <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">get_user</code> with timing code.
          A decorator is a function that takes <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">get_user</code>, wraps it in a timing shell, and returns the shell.
          The caller never knows the difference.
        </p>
      </div>

      <MemoryTip>Take a function, wrap a function, return a function.</MemoryTip>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Why this works — Python functions are first-class</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          In Python, functions are objects — they can be assigned to variables, passed as arguments, and returned from other functions.
          <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs mx-1">@log_execution_time</code> is just sugar for
          <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs mx-1">get_user = log_execution_time(get_user)</code>.
          Stack multiple decorators to compose behaviours: <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">@cache @retry @log_time</code>.
        </p>
      </div>

      <div className="viz-container p-6 space-y-5">
        {/* Wrapper box contains original box */}
        <div className="space-y-3">
          {/* Outer: wrapper function */}
          <div className={boxCls(cur.wrapperActive, 'border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-950/20')}>
            <div className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3">
              wrapper() — the decorator shell
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className={`rounded-lg p-2.5 text-center border transition-all ${cur.startTime ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Start time (t₀)</div>
                <div className={`font-mono text-xs mt-1 font-bold ${cur.startTime ? 'text-violet-700 dark:text-violet-300' : 'text-slate-400'}`}>
                  {cur.startTime ?? '—'}
                </div>
              </div>
              <div className={`rounded-lg p-2.5 text-center border transition-all ${cur.endTime ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">End time (t₁)</div>
                <div className={`font-mono text-xs mt-1 font-bold ${cur.endTime ? 'text-violet-700 dark:text-violet-300' : 'text-slate-400'}`}>
                  {cur.endTime ?? '—'}
                </div>
              </div>
              <div className={`rounded-lg p-2.5 text-center border transition-all ${cur.elapsed ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Elapsed</div>
                <div className={`font-mono text-xs mt-1 font-bold ${cur.elapsed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                  {cur.elapsed ?? '—'}
                </div>
              </div>
            </div>

            {/* Inner: original function */}
            <div className={boxCls(cur.originalActive, 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20')}>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                get_user(user_id=123) — original function
              </div>
              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-900 rounded-lg p-3 space-y-1">
                <div className={cur.originalActive ? 'text-amber-300' : 'text-slate-500'}>def get_user(user_id):</div>
                <div className={cur.originalActive ? 'text-emerald-300' : 'text-slate-500'}>    return db.query(</div>
                <div className={cur.originalActive ? 'text-emerald-300' : 'text-slate-500'}>        "SELECT * FROM users WHERE id = ?",</div>
                <div className={cur.originalActive ? 'text-emerald-300' : 'text-slate-500'}>        user_id</div>
                <div className={cur.originalActive ? 'text-emerald-300' : 'text-slate-500'}>    )</div>
              </div>
              {cur.returnValue && (
                <div className="mt-2 font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2">
                  ↳ returns {cur.returnValue}
                </div>
              )}
            </div>
          </div>

          {/* Log output */}
          {cur.logOutput.length > 0 && (
            <div className="rounded-lg bg-slate-900 p-3">
              {cur.logOutput.map((line, i) => (
                <div key={i} className="font-mono text-xs text-emerald-400">{line}</div>
              ))}
            </div>
          )}

          {/* Phase label */}
          {cur.phase === 'apply' && (
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 font-mono text-xs text-indigo-700 dark:text-indigo-300">
              {'# @decorator applied — Python rewrites this as:'}
              <br />
              {'get_user = log_execution_time(get_user)'}
              <br />
              {'# get_user now points to wrapper, original is stored inside wrapper'}
            </div>
          )}
        </div>

        {/* Message */}
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {cur.message}
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
