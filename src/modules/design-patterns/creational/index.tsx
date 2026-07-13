import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

type Pattern = 'singleton' | 'factory' | 'builder'

// ── Singleton (double-checked locking) ───────────────────────────────────────
type ThreadStatus = 'idle' | 'checking' | 'blocked' | 'creating' | 'done'
interface SingletonStep {
  threadA: ThreadStatus
  threadB: ThreadStatus
  lock: 'A' | 'B' | null
  instance: boolean
  action: string
  message: string
}

const SINGLETON_STEPS: SingletonStep[] = [
  { threadA: 'idle', threadB: 'idle', lock: null, instance: false, action: 'init', message: 'Two threads call DatabaseConnection.getInstance() at the same time. Only ONE instance may ever exist.' },
  { threadA: 'checking', threadB: 'idle', lock: null, instance: false, action: 'check', message: 'Thread-A: first check — instance == null → needs to create one.' },
  { threadA: 'checking', threadB: 'checking', lock: null, instance: false, action: 'race', message: 'Thread-B: first check — ALSO sees null. Without a lock, both would create an instance. This is the race.' },
  { threadA: 'checking', threadB: 'checking', lock: 'A', instance: false, action: 'lock', message: 'Thread-A wins the race for the class lock (synchronized block).' },
  { threadA: 'checking', threadB: 'blocked', lock: 'A', instance: false, action: 'block', message: 'Thread-B hits synchronized and blocks — it must wait for Thread-A to finish.' },
  { threadA: 'creating', threadB: 'blocked', lock: 'A', instance: true, action: 'create', message: 'Thread-A: second check — still null → creates the single instance. The volatile field prevents other threads seeing a half-built object.' },
  { threadA: 'done', threadB: 'blocked', lock: null, instance: true, action: 'return', message: 'Thread-A releases the lock and returns the instance.' },
  { threadA: 'done', threadB: 'checking', lock: 'B', instance: true, action: 'check', message: 'Thread-B enters the lock. Second check: instance != null → skips creation entirely.' },
  { threadA: 'done', threadB: 'done', lock: null, instance: true, action: 'return', message: 'Thread-B returns the SAME instance. Two callers, one object.' },
  { threadA: 'done', threadB: 'done', lock: null, instance: true, action: 'done', message: 'Double-checked locking: after first initialization, the fast path never takes a lock. (In practice, prefer the Holder idiom or an enum — see the code.)' },
]

// ── Factory Method ────────────────────────────────────────────────────────────
interface FactoryStep {
  request: string | null
  phase: 'request' | 'create' | 'use' | null
  created: string[]
  action: string
  message: string
}

const CHANNELS = ['EMAIL', 'SMS', 'PUSH']
const FACTORY_STEPS: FactoryStep[] = (() => {
  const steps: FactoryStep[] = [
    { request: null, phase: null, created: [], action: 'init', message: 'The client needs to send notifications but should NOT know which concrete class to instantiate. The factory owns that decision.' },
  ]
  const created: string[] = []
  for (const ch of CHANNELS) {
    steps.push({ request: ch, phase: 'request', created: [...created], action: 'request', message: `Client asks: NotificationFactory.create("${ch}") — no "new" in client code.` })
    created.push(ch)
    steps.push({ request: ch, phase: 'create', created: [...created], action: 'create', message: `Factory's switch picks the concrete class and instantiates ${ch.charAt(0) + ch.slice(1).toLowerCase()}Notification.` })
    steps.push({ request: ch, phase: 'use', created: [...created], action: 'use', message: `Client calls send() through the Notification interface — it never learns the concrete type.` })
  }
  steps.push({ request: null, phase: null, created, action: 'done', message: 'Adding a Slack channel later = one new class + one factory case. Zero client code changes. That is the Open/Closed Principle at work.' })
  return steps
})()

// ── Builder ───────────────────────────────────────────────────────────────────
interface BuilderStep {
  fields: { label: string; value: string }[]
  built: boolean
  action: string
  message: string
}

const BUILDER_FIELDS = [
  { label: 'url', value: '"https://api.example.com/orders"', message: 'builder("https://api.example.com/orders") — required fields go in the builder\'s constructor.' },
  { label: 'method', value: '"POST"', message: '.method("POST") — each setter mutates the builder and returns `this` for chaining.' },
  { label: 'header', value: 'Authorization: Bearer …', message: '.header("Authorization", "Bearer token123") — optional fields are just extra chained calls.' },
  { label: 'timeout', value: '5000 ms', message: '.timeout(5000) — compare with a 6-argument constructor where two ints are easy to swap.' },
]

const BUILDER_STEPS: BuilderStep[] = (() => {
  const steps: BuilderStep[] = [
    { fields: [], built: false, action: 'init', message: 'Problem: new HttpRequest(url, method, headers, body, timeout, retries) — the "telescoping constructor". Which int was timeout again?' },
  ]
  const acc: { label: string; value: string }[] = []
  for (const f of BUILDER_FIELDS) {
    acc.push({ label: f.label, value: f.value })
    steps.push({ fields: [...acc], built: false, action: 'set', message: f.message })
  }
  steps.push({ fields: [...acc], built: true, action: 'build', message: '.build() validates everything once, then constructs an IMMUTABLE HttpRequest. The builder is mutable; the product never is.' })
  steps.push({ fields: [...acc], built: true, action: 'done', message: 'Readable at the call site, safe to share across threads, impossible to pass arguments in the wrong order.' })
  return steps
})()

// ── Java code per pattern ─────────────────────────────────────────────────────
const JAVA_CODE: Record<Pattern, string> = {
  singleton: `public final class DatabaseConnection {
    // volatile: no thread can observe a half-constructed instance
    private static volatile DatabaseConnection instance;

    private DatabaseConnection() { }   // no outside instantiation

    public static DatabaseConnection getInstance() {
        if (instance == null) {                       // 1st check: lock-free fast path
            synchronized (DatabaseConnection.class) {
                if (instance == null) {               // 2nd check: only one creator
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
}

// Preferred: Initialization-on-demand Holder — the JVM guarantees
// lazy, thread-safe init with zero synchronization code
public final class Config {
    private Config() { }

    private static class Holder {                     // loaded on first access
        static final Config INSTANCE = new Config();
    }

    public static Config getInstance() {
        return Holder.INSTANCE;
    }
}

// Simplest + serialization/reflection safe: enum singleton
public enum AppRegistry {
    INSTANCE;

    public void register(String key) { /* ... */ }
}`,
  factory: `// Product interface — the ONLY type the client ever sees
public interface Notification {
    void send(String message);
}

class EmailNotification implements Notification {
    public void send(String msg) { System.out.println("Email: " + msg); }
}
class SmsNotification implements Notification {
    public void send(String msg) { System.out.println("SMS: " + msg); }
}
class PushNotification implements Notification {
    public void send(String msg) { System.out.println("Push: " + msg); }
}

// Simple factory — concrete class names live in exactly one place
public class NotificationFactory {
    public static Notification create(String channel) {
        return switch (channel) {
            case "EMAIL" -> new EmailNotification();
            case "SMS"   -> new SmsNotification();
            case "PUSH"  -> new PushNotification();
            default -> throw new IllegalArgumentException(channel);
        };
    }
}

// Factory METHOD (GoF) — subclasses decide which product to build
abstract class NotificationService {
    protected abstract Notification createNotification();  // the factory method

    public void notifyUser(String msg) {
        Notification n = createNotification();  // deferred to subclass
        n.send(msg);
    }
}

class EmailService extends NotificationService {
    protected Notification createNotification() {
        return new EmailNotification();
    }
}

// Client code — no "new", no concrete types
Notification n = NotificationFactory.create("SMS");
n.send("Your order has shipped!");`,
  builder: `public final class HttpRequest {
    private final String url;              // all fields final → immutable
    private final String method;
    private final Map<String, String> headers;
    private final int timeoutMs;

    private HttpRequest(Builder b) {       // only the Builder constructs
        this.url = b.url;
        this.method = b.method;
        this.headers = Map.copyOf(b.headers);
        this.timeoutMs = b.timeoutMs;
    }

    public static Builder builder(String url) {
        return new Builder(url);
    }

    public static class Builder {
        private final String url;                       // required
        private String method = "GET";                  // sensible defaults
        private final Map<String, String> headers = new HashMap<>();
        private int timeoutMs = 30000;

        private Builder(String url) { this.url = url; }

        public Builder method(String m) { this.method = m; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public Builder timeout(int ms) { this.timeoutMs = ms; return this; }

        public HttpRequest build() {
            if (timeoutMs <= 0) throw new IllegalStateException("timeout > 0");
            return new HttpRequest(this);   // validate once, construct once
        }
    }
}

// Fluent, self-documenting, impossible to swap two int params:
HttpRequest req = HttpRequest.builder("https://api.example.com/orders")
        .method("POST")
        .header("Authorization", "Bearer token123")
        .timeout(5000)
        .build();`,
}

const THREAD_STYLE: Record<ThreadStatus, string> = {
  idle: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500',
  checking: 'border-violet-400 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  blocked: 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
  creating: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  done: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
}

const THREAD_LABEL: Record<ThreadStatus, string> = {
  idle: 'waiting to call',
  checking: 'in getInstance()',
  blocked: 'blocked on lock',
  creating: 'new DatabaseConnection()',
  done: 'has the instance',
}

const PATTERN_META: Record<Pattern, { title: string; intent: string }> = {
  singleton: { title: 'Singleton', intent: 'Guarantee exactly one instance exists and give everyone a global access point to it' },
  factory: { title: 'Factory Method', intent: 'Let a dedicated factory decide which concrete class to instantiate, so clients depend only on interfaces' },
  builder: { title: 'Builder', intent: 'Assemble a complex immutable object step by step instead of a constructor with a mile of parameters' },
}

export default function CreationalPatternsViz() {
  const [pattern, setPattern] = useState<Pattern>('singleton')

  const steps = pattern === 'singleton' ? SINGLETON_STEPS : pattern === 'factory' ? FACTORY_STEPS : BUILDER_STEPS
  const ctrl = useSteps(steps.length)
  const cur = steps[Math.min(ctrl.step, steps.length - 1)] as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Creational Patterns</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Control how objects come into existence — one instance, the right subclass, or a step-by-step assembly</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Why creational patterns exist</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Every `new` scattered through a codebase is a hard-wired dependency on a concrete class. Creational patterns
          move object construction into one deliberate place: <strong>Singleton</strong> when there must be exactly one
          (connection pools, config), <strong>Factory</strong> when the concrete type varies at runtime (notification
          channels, parsers), <strong>Builder</strong> when construction has too many knobs for one constructor
          (requests, report configs — see <code>StringBuilder</code> and <code>HttpRequest.newBuilder()</code> in the JDK itself).
        </p>
      </div>

      {/* Pattern picker */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PATTERN_META) as Pattern[]).map(p => (
          <button key={p} onClick={() => { setPattern(p); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pattern === p ? 'bg-fuchsia-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {PATTERN_META[p].title}
          </button>
        ))}
      </div>

      <div className="bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800 rounded-xl p-3 text-sm text-fuchsia-700 dark:text-fuchsia-400">
        <strong>Intent:</strong> {PATTERN_META[pattern].intent}
      </div>

      <div className="viz-container p-6 space-y-6">
        {pattern === 'singleton' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {(['A', 'B'] as const).map(t => {
                const status: ThreadStatus = t === 'A' ? cur.threadA : cur.threadB
                return (
                  <div key={t} className={`rounded-xl border-2 p-4 transition-all ${THREAD_STYLE[status]}`}>
                    <div className="font-semibold text-sm mb-1">Thread-{t}</div>
                    <div className="text-xs font-mono">{THREAD_LABEL[status]}</div>
                    {cur.lock === t && (
                      <div className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-medium">
                        🔒 holds class lock
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-center">
              <div className={`rounded-xl border-2 px-8 py-4 text-center transition-all ${
                cur.instance
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-dashed border-slate-300 dark:border-slate-700'
              }`}>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">static volatile instance</div>
                <div className={`font-mono text-sm font-bold ${cur.instance ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {cur.instance ? 'DatabaseConnection@7a1e' : 'null'}
                </div>
              </div>
            </div>
          </div>
        )}

        {pattern === 'factory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className={`rounded-xl border-2 p-4 flex-1 text-center transition-all ${
                cur.phase === 'request' || cur.phase === 'use'
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/40'
                  : 'border-slate-300 dark:border-slate-700'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">Client</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {cur.phase === 'request' ? `create("${cur.request}")` : cur.phase === 'use' ? 'notification.send(...)' : 'knows only the interface'}
                </div>
              </div>
              <div className="text-slate-400 text-xl">→</div>
              <div className={`rounded-xl border-2 p-4 flex-1 text-center transition-all ${
                cur.phase === 'create'
                  ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40'
                  : 'border-slate-300 dark:border-slate-700'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">NotificationFactory</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {cur.phase === 'create' ? `new ${String(cur.request).charAt(0)}${String(cur.request).slice(1).toLowerCase()}Notification()` : 'switch (channel) { ... }'}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Products created (all implement Notification)</h4>
              <div className="flex gap-2 flex-wrap">
                {CHANNELS.map(ch => {
                  const made = cur.created.includes(ch)
                  const active = cur.request === ch && cur.phase === 'use'
                  return (
                    <div key={ch} className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                      active ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : made ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      : 'border-dashed border-slate-200 dark:border-slate-800 opacity-40'
                    }`}>
                      <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {ch.charAt(0) + ch.slice(1).toLowerCase()}Notification
                      </div>
                      <div className={`text-xs mt-1 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {active ? 'send() ✓' : made ? 'created' : 'not yet'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {pattern === 'builder' && (
          <div className="flex items-stretch gap-4 flex-wrap">
            <div className="rounded-xl border-2 border-violet-300 dark:border-violet-800 p-4 flex-1 min-w-56">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">HttpRequest.Builder <span className="normal-case">(mutable)</span></div>
              <div className="space-y-1.5">
                {BUILDER_FIELDS.map(f => {
                  const set = cur.fields.some((x: any) => x.label === f.label)
                  const isLast = set && cur.fields[cur.fields.length - 1]?.label === f.label && !cur.built
                  return (
                    <div key={f.label} className={`flex justify-between gap-2 text-xs font-mono rounded-lg px-2 py-1.5 transition-all ${
                      isLast ? 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
                      : set ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'text-slate-400 opacity-50'
                    }`}>
                      <span>.{f.label}</span>
                      <span className="truncate">{set ? f.value : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center text-slate-400 text-xl">
              {cur.built ? '→' : '⋯'}
            </div>
            <div className={`rounded-xl border-2 p-4 flex-1 min-w-56 transition-all ${
              cur.built ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'border-dashed border-slate-300 dark:border-slate-700 opacity-50'
            }`}>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">HttpRequest <span className="normal-case">(immutable)</span></div>
              {cur.built ? (
                <div className="space-y-1.5 text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  <div>POST https://api.example.com/orders</div>
                  <div>Authorization: Bearer …</div>
                  <div>timeout: 5000 ms</div>
                  <div className="pt-1 text-emerald-600 dark:text-emerald-500 font-bold">✓ built &amp; validated — final fields only</div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">nothing exists until .build()</div>
              )}
            </div>
          </div>
        )}

        {/* Action + message */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-medium uppercase bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300">
            {cur.action}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center max-w-lg">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={[{ lang: 'java', label: `Java — ${PATTERN_META[pattern].title}`, code: JAVA_CODE[pattern] }]} />
    </div>
  )
}
