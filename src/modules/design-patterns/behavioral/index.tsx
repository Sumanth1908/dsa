import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'

type Pattern = 'strategy' | 'observer' | 'command'

// ── Strategy ──────────────────────────────────────────────────────────────────
interface StrategyStep {
  strategy: string | null
  executing: boolean
  receipts: string[]
  action: string
  message: string
}

const STRATEGY_STEPS: StrategyStep[] = [
  { strategy: null, executing: false, receipts: [], action: 'init', message: 'Checkout needs to charge $120. Payment method varies per user — but we refuse to write if (card) … else if (paypal) … else if (crypto) chains.' },
  { strategy: 'CreditCardPayment', executing: false, receipts: [], action: 'inject', message: 'checkout.setStrategy(new CreditCardPayment()) — the context stores an algorithm behind the PaymentStrategy interface.' },
  { strategy: 'CreditCardPayment', executing: true, receipts: [], action: 'delegate', message: 'checkout.pay(120) — the context delegates blindly: strategy.pay(120). It has no idea which algorithm runs.' },
  { strategy: 'CreditCardPayment', executing: false, receipts: ['💳 Charged $120.00 to card ending 4242'], action: 'result', message: 'CreditCardPayment executed its own flow: validate card → charge → receipt.' },
  { strategy: 'PayPalPayment', executing: false, receipts: ['💳 Charged $120.00 to card ending 4242'], action: 'swap', message: 'User switches payment method. setStrategy(new PayPalPayment()) — swapped AT RUNTIME. Zero changes to the context.' },
  { strategy: 'PayPalPayment', executing: true, receipts: ['💳 Charged $120.00 to card ending 4242'], action: 'delegate', message: 'checkout.pay(120) again — the exact same context line now runs a completely different algorithm.' },
  { strategy: 'PayPalPayment', executing: false, receipts: ['💳 Charged $120.00 to card ending 4242', '🅿️ PayPal transfer of $120.00 complete'], action: 'result', message: 'PayPalPayment ran its OAuth-redirect flow instead. Same interface, different behaviour.' },
  { strategy: 'PayPalPayment', executing: false, receipts: ['💳 Charged $120.00 to card ending 4242', '🅿️ PayPal transfer of $120.00 complete'], action: 'done', message: 'Adding Crypto = one new class. Context untouched, no conditionals. In modern Java a strategy is often just a lambda — Comparator is the classic example.' },
]

// ── Observer ──────────────────────────────────────────────────────────────────
const OBSERVERS = ['MobileApp', 'Dashboard', 'AlertBot']
interface ObserverStep {
  subscribed: string[]
  price: number
  notifying: string | null
  action: string
  message: string
}

const OBSERVER_STEPS: ObserverStep[] = [
  { subscribed: [], price: 100, notifying: null, action: 'init', message: 'A StockTicker holds ACME at $100. Interested parties should react to changes WITHOUT the ticker knowing their concrete types.' },
  { subscribed: ['MobileApp'], price: 100, notifying: null, action: 'subscribe', message: 'ticker.subscribe(mobileApp) — the subject just keeps a List<PriceObserver>.' },
  { subscribed: ['MobileApp', 'Dashboard'], price: 100, notifying: null, action: 'subscribe', message: 'ticker.subscribe(dashboard)' },
  { subscribed: ['MobileApp', 'Dashboard', 'AlertBot'], price: 100, notifying: null, action: 'subscribe', message: 'ticker.subscribe(alertBot) — three observers registered.' },
  { subscribed: ['MobileApp', 'Dashboard', 'AlertBot'], price: 105, notifying: null, action: 'event', message: 'ticker.setPrice(105) — state changed. The subject loops its list and pushes the update to everyone.' },
  { subscribed: ['MobileApp', 'Dashboard', 'AlertBot'], price: 105, notifying: 'MobileApp', action: 'notify', message: 'mobileApp.onPriceChange("ACME", 105) → shows a push notification.' },
  { subscribed: ['MobileApp', 'Dashboard', 'AlertBot'], price: 105, notifying: 'Dashboard', action: 'notify', message: 'dashboard.onPriceChange("ACME", 105) → redraws the chart.' },
  { subscribed: ['MobileApp', 'Dashboard', 'AlertBot'], price: 105, notifying: 'AlertBot', action: 'notify', message: 'alertBot.onPriceChange("ACME", 105) → price below alert threshold, stays quiet.' },
  { subscribed: ['MobileApp', 'AlertBot'], price: 105, notifying: null, action: 'unsubscribe', message: 'ticker.unsubscribe(dashboard) — the user closed the dashboard tab. Observers come and go freely.' },
  { subscribed: ['MobileApp', 'AlertBot'], price: 98, notifying: null, action: 'event', message: 'ticker.setPrice(98) — another change. Only current subscribers get notified.' },
  { subscribed: ['MobileApp', 'AlertBot'], price: 98, notifying: 'MobileApp', action: 'notify', message: 'mobileApp notified.' },
  { subscribed: ['MobileApp', 'AlertBot'], price: 98, notifying: 'AlertBot', action: 'notify', message: 'alertBot notified → $98 < $99 threshold → fires a SELL alert! 🔔' },
  { subscribed: ['MobileApp', 'AlertBot'], price: 98, notifying: null, action: 'done', message: 'One-to-many, loosely coupled. This is the heart of every event system: DOM events, Kafka consumers, React state subscriptions.' },
]

// ── Command ───────────────────────────────────────────────────────────────────
interface CommandStep {
  doc: string
  undoStack: string[]
  executing: string | null
  action: string
  message: string
}

const COMMAND_STEPS: CommandStep[] = [
  { doc: '', undoStack: [], executing: null, action: 'init', message: 'A text editor with undo. Trick: turn every action into an OBJECT that knows how to execute itself — and how to reverse itself.' },
  { doc: '', undoStack: [], executing: 'InsertText("Hello")', action: 'execute', message: 'editor.run(new InsertText(doc, "Hello")) — the invoker calls command.execute()…' },
  { doc: 'Hello', undoStack: ['InsertText("Hello")'], executing: null, action: 'push', message: '…then pushes the command onto the undo stack. History comes for free.' },
  { doc: 'Hello', undoStack: ['InsertText("Hello")'], executing: 'InsertText(" World")', action: 'execute', message: 'editor.run(new InsertText(doc, " World"))' },
  { doc: 'Hello World', undoStack: ['InsertText("Hello")', 'InsertText(" World")'], executing: null, action: 'push', message: 'Document is "Hello World", two commands in history.' },
  { doc: 'Hello World', undoStack: ['InsertText("Hello")', 'InsertText(" World")'], executing: 'undo', action: 'undo', message: 'Ctrl+Z → editor.undo() pops the top command and calls its undo() — each command knows how to reverse ITSELF.' },
  { doc: 'Hello', undoStack: ['InsertText("Hello")'], executing: null, action: 'pop', message: 'InsertText(" World").undo() deleted the last 6 chars. Document back to "Hello".' },
  { doc: 'Hello', undoStack: ['InsertText("Hello")'], executing: 'undo', action: 'undo', message: 'Ctrl+Z again…' },
  { doc: '', undoStack: [], executing: null, action: 'pop', message: 'Empty document, empty history.' },
  { doc: '', undoStack: [], executing: null, action: 'done', message: 'Because actions are objects, you can also queue them (job queues), log them (event sourcing), or batch them (macros). Runnable is the JDK\'s minimal command.' },
]

// ── Java code per pattern ─────────────────────────────────────────────────────
const JAVA_CODE: Record<Pattern, string> = {
  strategy: `// The strategy interface — one algorithm family
public interface PaymentStrategy {
    void pay(double amount);
}

class CreditCardPayment implements PaymentStrategy {
    public void pay(double amt) {
        System.out.println("Charged $" + amt + " to card ending 4242");
    }
}

class PayPalPayment implements PaymentStrategy {
    public void pay(double amt) {
        System.out.println("PayPal transfer of $" + amt + " complete");
    }
}

// Context — delegates, never branches on payment type
public class Checkout {
    private PaymentStrategy strategy;

    public void setStrategy(PaymentStrategy s) { this.strategy = s; }

    public void pay(double amount) {
        strategy.pay(amount);   // no if/else — polymorphism does the routing
    }
}

Checkout checkout = new Checkout();
checkout.setStrategy(new CreditCardPayment());
checkout.pay(120.00);

checkout.setStrategy(new PayPalPayment());   // swapped at runtime
checkout.pay(120.00);

// Modern Java: a strategy is often just a lambda.
// sort() is the context; the Comparator is the strategy:
users.sort(Comparator.comparing(User::lastName));`,
  observer: `// Observer interface — how subscribers receive updates
public interface PriceObserver {
    void onPriceChange(String symbol, double price);
}

// Subject — knows a LIST of observers, none of their concrete types
public class StockTicker {
    private final List<PriceObserver> observers = new ArrayList<>();
    private double price;

    public void subscribe(PriceObserver o)   { observers.add(o); }
    public void unsubscribe(PriceObserver o) { observers.remove(o); }

    public void setPrice(double newPrice) {
        this.price = newPrice;
        for (PriceObserver o : observers) {       // push to everyone
            o.onPriceChange("ACME", newPrice);
        }
    }
}

class AlertBot implements PriceObserver {
    public void onPriceChange(String symbol, double price) {
        if (price < 99.0) System.out.println("SELL alert: " + symbol);
    }
}

StockTicker ticker = new StockTicker();
ticker.subscribe(new AlertBot());
ticker.subscribe((sym, p) -> chart.redraw(sym, p));  // lambda observer

ticker.setPrice(98.0);   // every subscriber reacts, ticker stays ignorant

// Production notes: use CopyOnWriteArrayList if threads subscribe
// mid-notify, and consider weak references to avoid the classic
// "forgotten listener" memory leak.`,
  command: `// Command interface — an action reified as an object
public interface Command {
    void execute();
    void undo();
}

class InsertText implements Command {
    private final StringBuilder doc;
    private final String text;

    InsertText(StringBuilder doc, String text) {
        this.doc = doc;
        this.text = text;
    }

    public void execute() { doc.append(text); }

    public void undo() {   // every command knows its own reverse
        doc.delete(doc.length() - text.length(), doc.length());
    }
}

// Invoker — runs commands and keeps history; knows NOTHING about text
public class Editor {
    private final StringBuilder doc = new StringBuilder();
    private final Deque<Command> undoStack = new ArrayDeque<>();

    public void run(Command c) {
        c.execute();
        undoStack.push(c);           // history for free
    }

    public void undo() {
        if (!undoStack.isEmpty()) {
            undoStack.pop().undo();
        }
    }
}

Editor editor = new Editor();
editor.run(new InsertText(editor.doc(), "Hello"));
editor.run(new InsertText(editor.doc(), " World"));
editor.undo();   // back to "Hello"

// Same shape powers job queues, transactional outboxes, and macros.
// java.lang.Runnable is the JDK's minimal Command.`,
}

const PATTERN_META: Record<Pattern, { title: string; intent: string }> = {
  strategy: { title: 'Strategy', intent: 'Make algorithms interchangeable — inject the one you need, swap it at runtime, never branch on type' },
  observer: { title: 'Observer', intent: 'Let many objects react to one object\'s state changes without the subject knowing who they are' },
  command: { title: 'Command', intent: 'Turn an action into an object so it can be queued, logged, and undone' },
}

const DOUBTS: Record<string, { q: string; a: string }[]> = {
  strategy: [
    {
      q: 'Strategy vs State — the diagrams look identical?',
      a: 'Ask WHO drives the change. Strategy: the CLIENT picks the algorithm, and it typically stays fixed for the interaction. State: the object TRANSITIONS ITSELF as events happen — states know about other states; strategies are strangers to each other. Example: a Checkout is Strategy — you set the payment method at the top and it stays for the whole transaction. A MediaPlayer in a music app is State — it transitions from stopped → playing → paused → finished autonomously as you press buttons and songs end. State\'s transitions are internal knowledge; Strategy\'s algorithms have no dependency on each other. **Rule of thumb:** if objects ask "who picked this?", it is Strategy; if they ask "what should I become next?", it is State.',
    },
    {
      q: 'Is Strategy obsolete when I can just pass a function?',
      a: 'A lambda often IS the strategy in modern languages. Reach for the full pattern when strategies carry their own state or configuration, need several related methods, or deserve named, discoverable, independently testable classes. Example: if you need one sorting rule, `users.sort((a, b) -> a.age - b.age)` is perfect. But if you have complex payment flows, each one maintaining transaction logs, retry counts, and fraud checks, a full `CreditCardPayment` class makes sense. Three criteria: does the strategy have internal state? Does it have multiple methods? Should it be unit-tested and reused across the codebase? If any are yes, a class wins. **Common mistake:** using a lambda when the logic grows, forcing refactors later.',
    },
  ],
  observer: [
    {
      q: 'Observer vs pub-sub — same pattern?',
      a: 'Nearly — minus the middleman. Observers subscribe DIRECTLY to the subject: in-process references, usually synchronous. Pub-sub inserts a broker so publisher and subscriber never know each other — enabling different processes, async delivery, and durability. Example: in our StockTicker, the Dashboard calls `ticker.subscribe(this)` directly — tight coupling, but instant. Kafka or RabbitMQ are pub-sub brokers: a service publishes price updates to a topic, completely unaware of consumers; subscribers pull from that topic on their own schedule, even hours later. Brokers decouple in space (different servers) and time (async). **Rule of thumb:** Observer for in-app event wiring; pub-sub for distributed systems.',
    },
    {
      q: 'What bugs bite Observer users the most?',
      a: 'Forgotten unsubscribes — the subject keeps "dead" listeners reachable, leaking memory and firing zombie updates — and cascade storms where one notification triggers others. Example: a Dashboard subscribes to a StockTicker but the user closes the tab without calling unsubscribe. The ticker\'s observer list still holds a reference, the Dashboard remains in memory, and each `setPrice()` fires on a ghost object. In reentrant cascades, one observer\'s update changes the subject\'s state, triggering another round of notifications. Prevention: always unsubscribe on component teardown (useEffect cleanup in React), keep handlers synchronous and non-blocking, and consider weak references. **Common mistake:** storing long-lived observers without cleanup in SPAs.',
    },
  ],
  command: [
    {
      q: 'Why wrap a method call in an object — what does that buy?',
      a: 'Once a call is DATA (an `execute()` plus its parameters), you can queue it, log it, retry it, schedule it, and reverse it with `undo()`. That is the backbone of editor undo stacks, job queues, and transactional task systems. Example: in our Editor, `new InsertText(doc, "Hello")` is a self-contained object holding both the action (insert) and its data ("Hello"). You can push it onto a queue, persist it to disk, replay it for redo, or send it over a network. Job queues in Celery or Sidekiq use this exact pattern: a task becomes a serializable object that workers pick up and execute later. **Rule of thumb:** if your action needs to exist independent of the caller — logged, retried, scheduled, or undone — Command is your answer.',
    },
    {
      q: 'How does undo actually work with Command?',
      a: 'Each command captures what it needs to reverse itself (previous value, position). Executed commands go on a stack; undo pops and calls `undo()`, redo re-executes. When the state is too big to capture inline, pair with Memento snapshots. Example: `InsertText` stores the text to reverse (delete that many chars). `DeleteText` would store what was deleted (to re-insert). But if you are editing a huge Photoshop canvas with millions of pixels, capturing each undo state is expensive — pair Command with Memento: before executing, snap a full image state; undo restores that snapshot. Redo works by replaying commands forward. **Common mistake:** forgetting that undo must be EXACT — an InsertText that doesn\'t remove EXACTLY what was inserted will corrupt the undo chain.',
    },
  ],
}

export default function BehavioralPatternsViz() {
  const [pattern, setPattern] = useState<Pattern>('strategy')

  const steps = pattern === 'strategy' ? STRATEGY_STEPS : pattern === 'observer' ? OBSERVER_STEPS : COMMAND_STEPS
  const ctrl = useSteps(steps.length)
  const cur = steps[Math.min(ctrl.step, steps.length - 1)] as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Behavioral Patterns</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">How objects communicate and divide responsibility — swap algorithms, broadcast events, reify actions</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A navigation app offers "fastest", "no tolls", "walking" — same trip, three swappable route-picking
          brains you choose between at tap-time (Strategy). A YouTube channel doesn't phone each fan when a
          video drops — fans subscribe, and everyone gets notified (Observer). And a restaurant order ticket
          turns "table 9 wants pasta" into a thing the waiter can hand off, queue up, or even cancel — without
          cooking anything himself (Command). Behavioral patterns decide who chooses, who gets told, and who
          does the work.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Why behavioral patterns exist</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          The hardest coupling to break isn't structural — it's behavioural: giant if/else chains on type
          (<strong>Strategy</strong> kills those), objects that must know exactly who to update
          (<strong>Observer</strong> inverts that), and actions welded to the button that triggers them
          (<strong>Command</strong> pries them apart). These three are the most-asked patterns in Java interviews,
          and they map directly onto <code>Comparator</code>, event listeners, and <code>Runnable</code> in the JDK.
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
        {pattern === 'strategy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`rounded-xl border-2 p-4 flex-1 text-center transition-all ${
                cur.executing ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-300 dark:border-slate-700'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">Checkout (context)</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {cur.executing ? 'strategy.pay(120.00)' : 'holds a PaymentStrategy'}
                </div>
              </div>
              <div className="text-slate-400 text-xl">→</div>
              <div className={`rounded-xl border-2 p-4 flex-1 text-center transition-all ${
                cur.strategy
                  ? cur.executing
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-violet-300 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20'
                  : 'border-dashed border-slate-300 dark:border-slate-700 opacity-50'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">{cur.strategy ?? 'no strategy injected'}</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {cur.strategy ? 'implements PaymentStrategy' : 'setStrategy(...) first'}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Receipts</h4>
              {cur.receipts.length === 0
                ? <div className="text-xs text-slate-400">none yet</div>
                : <div className="space-y-1">
                    {cur.receipts.map((r: string) => (
                      <div key={r} className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">{r}</div>
                    ))}
                  </div>}
            </div>
          </div>
        )}

        {pattern === 'observer' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`rounded-xl border-2 px-6 py-3 text-center transition-all ${
                cur.action === 'event' ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-300 dark:border-slate-700'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">StockTicker (subject)</div>
                <div className="text-lg font-mono font-bold mt-1 text-slate-800 dark:text-slate-200">
                  ACME <span className={cur.price < 100 ? 'text-rose-500' : 'text-emerald-500'}>${cur.price}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {OBSERVERS.map(o => {
                const isSubscribed = cur.subscribed.includes(o)
                const isNotifying = cur.notifying === o
                return (
                  <div key={o} className={`rounded-xl border-2 p-3 text-center transition-all ${
                    isNotifying ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40 scale-105'
                    : isSubscribed ? 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900'
                    : 'border-dashed border-slate-300 dark:border-slate-700 opacity-40'
                  }`}>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{o}</div>
                    <div className={`text-xs font-mono mt-1 ${isNotifying ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400'}`}>
                      {isNotifying ? `onPriceChange(${cur.price})` : isSubscribed ? 'subscribed' : 'not subscribed'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pattern === 'command' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Document</h4>
              <div className="rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 min-h-20 font-mono text-lg text-slate-800 dark:text-slate-200">
                {cur.doc || <span className="text-slate-300 dark:text-slate-600">∅ empty</span>}
                <span className="animate-pulse text-fuchsia-500">|</span>
              </div>
              {cur.executing && (
                <div className="mt-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300 inline-block">
                  {cur.executing === 'undo' ? 'editor.undo()' : `run(new ${cur.executing})`}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Undo stack (top first)</h4>
              <div className="border-2 border-slate-200 dark:border-slate-700 rounded-xl min-h-20 p-2 flex flex-col gap-1">
                {[...cur.undoStack].reverse().map((c: string, i: number) => (
                  <div key={c + i} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    {c}
                  </div>
                ))}
                {cur.undoStack.length === 0 && <div className="text-xs text-slate-400 text-center py-2">empty — nothing to undo</div>}
              </div>
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
      <CodeTabs doubts={DOUBTS[pattern]} examples={[{ lang: 'java', label: `Java — ${PATTERN_META[pattern].title}`, code: JAVA_CODE[pattern] }]} />
    </div>
  )
}
