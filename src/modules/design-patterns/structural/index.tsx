import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

type Pattern = 'decorator' | 'adapter' | 'facade'

// ── Decorator ─────────────────────────────────────────────────────────────────
interface DecoratorStep {
  layers: { name: string; cost: number }[]
  resolving: number  // -1 = not computing cost; otherwise index of layer being resolved
  total: number | null
  action: string
  message: string
}

const DECORATOR_STEPS: DecoratorStep[] = [
  { layers: [], resolving: -1, total: null, action: 'init', message: 'A coffee shop with add-ons. Subclassing every combo (EspressoWithMilkAndMocha…) explodes. Instead, each add-on WRAPS the drink.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }], resolving: -1, total: null, action: 'create', message: 'Start with the concrete component: new Espresso(). It implements Beverage.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }], resolving: -1, total: null, action: 'wrap', message: 'new Milk(espresso) — Milk IS a Beverage and HAS a Beverage. Same interface, extra behaviour.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: -1, total: null, action: 'wrap', message: 'new Mocha(milk) — decorators stack. The client still just holds a Beverage reference.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: 2, total: null, action: 'cost()', message: 'order.cost() hits the outermost layer first: Mocha asks its inner beverage for ITS cost, then adds $1.00.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: 1, total: null, action: 'cost()', message: 'Milk asks its inner beverage, then adds $0.50. The call cascades inward…' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: 0, total: null, action: 'cost()', message: 'Espresso is the base case: returns $3.00. Now the results unwind back out.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: -1, total: 4.5, action: 'return', message: '3.00 + 0.50 + 1.00 = $4.50. Each layer contributed without knowing about the others.' },
  { layers: [{ name: 'Espresso', cost: 3.0 }, { name: 'Milk', cost: 0.5 }, { name: 'Mocha', cost: 1.0 }], resolving: -1, total: 4.5, action: 'done', message: 'This is exactly how Java I/O works: new BufferedReader(new InputStreamReader(new FileInputStream(f))).' },
]

// ── Adapter ───────────────────────────────────────────────────────────────────
type AdapterPhase = 'idle' | 'call' | 'translate-in' | 'legacy' | 'translate-out' | 'done'
interface AdapterStep {
  phase: AdapterPhase
  action: string
  message: string
}

const ADAPTER_STEPS: AdapterStep[] = [
  { phase: 'idle', action: 'init', message: 'The client speaks a modern interface: getStock(sku) → int. The 15-year-old inventory system only speaks XML. Neither can change.' },
  { phase: 'call', action: 'call', message: 'Client calls adapter.getStock("SKU-42") — the adapter implements the interface the client expects.' },
  { phase: 'translate-in', action: 'translate', message: 'Adapter translates the call into what the legacy system understands: fetchStockXml("SKU-42").' },
  { phase: 'legacy', action: 'legacy', message: 'Legacy system does its thing and answers in its native tongue: <stock><qty>17</qty></stock>' },
  { phase: 'translate-out', action: 'translate', message: 'Adapter parses the XML and converts the answer to the modern type: int 17.' },
  { phase: 'done', action: 'return', message: 'Client receives 17. It never learned XML exists. Swap the legacy system later → only the adapter changes.' },
]

// ── Facade ────────────────────────────────────────────────────────────────────
const SUBSYSTEMS = [
  { name: 'InventoryService', call: 'reserve("SKU-42")', result: 'reserved ✓' },
  { name: 'PaymentGateway', call: 'charge($59.99)', result: 'txn-981 ✓' },
  { name: 'ShippingService', call: 'schedule("12 Main St")', result: 'TRK-4415 ✓' },
  { name: 'EmailService', call: 'confirm("a@b.com")', result: 'sent ✓' },
]

interface FacadeStep {
  completed: number     // how many subsystems finished
  current: number       // index currently executing, -1 = none
  finished: boolean
  action: string
  message: string
}

const FACADE_STEPS: FacadeStep[] = (() => {
  const steps: FacadeStep[] = [
    { completed: 0, current: -1, finished: false, action: 'init', message: 'Checkout touches four subsystems in a strict order. Without a facade, EVERY caller must know all four and the ordering rules.' },
    { completed: 0, current: -1, finished: false, action: 'call', message: 'Client makes ONE call: checkoutFacade.checkout(sku, amount, address, email).' },
  ]
  SUBSYSTEMS.forEach((s, i) => {
    steps.push({ completed: i, current: i, finished: false, action: 'delegate', message: `Facade step ${i + 1}: ${s.name}.${s.call}` })
  })
  steps.push({ completed: SUBSYSTEMS.length, current: -1, finished: true, action: 'return', message: 'Facade returns the tracking number. The client saw one method; the subsystems stay independently testable behind it.' })
  return steps
})()

// ── Java code per pattern ─────────────────────────────────────────────────────
const JAVA_CODE: Record<Pattern, string> = {
  decorator: `public interface Beverage {
    String description();
    double cost();
}

class Espresso implements Beverage {
    public String description() { return "Espresso"; }
    public double cost() { return 3.00; }
}

// The decorator base: IS a Beverage, HAS a Beverage
abstract class AddOn implements Beverage {
    protected final Beverage inner;
    protected AddOn(Beverage inner) { this.inner = inner; }
}

class Milk extends AddOn {
    Milk(Beverage b) { super(b); }
    public String description() { return inner.description() + " + Milk"; }
    public double cost() { return inner.cost() + 0.50; }
}

class Mocha extends AddOn {
    Mocha(Beverage b) { super(b); }
    public String description() { return inner.description() + " + Mocha"; }
    public double cost() { return inner.cost() + 1.00; }
}

// Stack behaviours at runtime — no subclass explosion
Beverage order = new Mocha(new Milk(new Espresso()));
order.description();  // "Espresso + Milk + Mocha"
order.cost();         // 4.50

// The JDK is full of this exact shape:
Reader r = new BufferedReader(          // adds buffering
           new InputStreamReader(       // adds byte→char decoding
           new FileInputStream("f.txt")));`,
  adapter: `// Target interface — what the client wants to talk to
public interface InventoryClient {
    int getStock(String sku);
}

// Adaptee — legacy class you cannot change, wrong interface
class LegacyInventoryService {
    String fetchStockXml(String productCode) {
        return "<stock><qty>17</qty></stock>";
    }
}

// Adapter — implements the target, wraps the adaptee, translates
class InventoryAdapter implements InventoryClient {
    private final LegacyInventoryService legacy;

    InventoryAdapter(LegacyInventoryService legacy) {
        this.legacy = legacy;
    }

    public int getStock(String sku) {
        String xml = legacy.fetchStockXml(sku);   // 1. delegate
        String qty = xml.replaceAll(".*<qty>(\\\\d+)</qty>.*", "$1");
        return Integer.parseInt(qty);             // 2. translate
    }
}

// Client code — clean, XML-free
InventoryClient inventory = new InventoryAdapter(new LegacyInventoryService());
int stock = inventory.getStock("SKU-42");   // 17

// JDK adapters you already use:
List<Integer> list = Arrays.asList(1, 2, 3);      // array → List
Reader reader = new InputStreamReader(inputStream); // bytes → chars`,
  facade: `// Four independent subsystems, each with its own API
class InventoryService { void reserve(String sku) { /* ... */ } }
class PaymentGateway   { String charge(double amt) { return "txn-981"; } }
class ShippingService  { String schedule(String addr) { return "TRK-4415"; } }
class EmailService     { void confirm(String to, String trk) { /* ... */ } }

// Facade: one intention-revealing entry point over the mess
public class CheckoutFacade {
    private final InventoryService inventory = new InventoryService();
    private final PaymentGateway payment = new PaymentGateway();
    private final ShippingService shipping = new ShippingService();
    private final EmailService email = new EmailService();

    public String checkout(String sku, double amount,
                           String address, String customer) {
        inventory.reserve(sku);                    // ordering rules live
        String txn = payment.charge(amount);       // in ONE place now,
        String tracking = shipping.schedule(address); // not in every caller
        email.confirm(customer, tracking);
        return tracking;
    }
}

// Client: one dependency, one call
String tracking = new CheckoutFacade()
        .checkout("SKU-42", 59.99, "12 Main St", "a@b.com");

// The subsystems stay public — facade is a convenience, not a prison.
// Power users can still call PaymentGateway directly when needed.`,
}

const PATTERN_META: Record<Pattern, { title: string; intent: string }> = {
  decorator: { title: 'Decorator', intent: 'Wrap an object to add behaviour at runtime — same interface, stackable, no subclass explosion' },
  adapter: { title: 'Adapter', intent: 'Translate between an interface clients expect and an incompatible one you cannot change' },
  facade: { title: 'Facade', intent: 'Put one simple, intention-revealing method in front of a complicated subsystem' },
}

export default function StructuralPatternsViz() {
  const [pattern, setPattern] = useState<Pattern>('decorator')

  const steps = pattern === 'decorator' ? DECORATOR_STEPS : pattern === 'adapter' ? ADAPTER_STEPS : FACADE_STEPS
  const ctrl = useSteps(steps.length)
  const cur = steps[Math.min(ctrl.step, steps.length - 1)] as any

  const adapterBox = (active: boolean, extra = '') =>
    `rounded-xl border-2 p-4 flex-1 text-center transition-all ${extra} ${
      active ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-300 dark:border-slate-700'
    }`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Structural Patterns</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Compose objects into larger structures — wrap, translate, or simplify without touching existing code</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Story</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Your laptop's plug doesn't fit the socket abroad — you don't rewire the laptop, you slot in a travel
          adapter (Adapter). When it gets cold you don't grow thicker skin — you put on a jacket, and a raincoat
          over that; each layer adds something without changing you (Decorator). And at a hotel you press one
          button, "concierge", instead of ringing the kitchen, laundry, and taxi desk separately (Facade). Three
          everyday moves — structural patterns apply them to objects.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Why structural patterns exist</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Real systems grow by combining objects, not editing them. <strong>Decorator</strong> adds behaviour by wrapping
          (Java's entire I/O stack), <strong>Adapter</strong> lets incompatible interfaces cooperate (every legacy
          integration you'll ever do), and <strong>Facade</strong> hides a subsystem behind one friendly method
          (think SLF4J over five logging frameworks). All three rely on the same weapon: composition over inheritance.
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
        {pattern === 'decorator' && (
          <div className="space-y-4">
            {/* Nested layer rings, outermost last-added */}
            <div className="flex justify-center py-2">
              {cur.layers.length === 0 ? (
                <div className="text-sm text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-8 py-6">no beverage yet</div>
              ) : (
                (cur.layers as { name: string; cost: number }[]).reduce((child: React.ReactNode, layer: any) => {
                  const idx = cur.layers.findIndex((l: any) => l.name === layer.name)
                  const isResolving = cur.resolving === idx
                  return (
                    <div className={`rounded-2xl border-2 p-3 transition-all ${
                      isResolving ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40'
                      : idx === 0 ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30'
                      : 'border-violet-300 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20'
                    }`}>
                      <div className="flex items-center justify-between gap-4 text-xs font-mono mb-1 px-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{layer.name}</span>
                        <span className={isResolving ? 'text-fuchsia-600 dark:text-fuchsia-400 font-bold' : 'text-slate-500'}>
                          {idx === 0 ? `$${layer.cost.toFixed(2)}` : `inner.cost() + $${layer.cost.toFixed(2)}`}
                        </span>
                      </div>
                      {child}
                    </div>
                  )
                }, null as React.ReactNode)
              )}
            </div>
            {cur.total !== null && (
              <div className="text-center text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                order.cost() = ${cur.total.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {pattern === 'adapter' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className={adapterBox(cur.phase === 'call' || cur.phase === 'done')}>
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">Client</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                {cur.phase === 'call' ? 'getStock("SKU-42")' : cur.phase === 'done' ? 'stock = 17 ✓' : 'speaks int/JSON'}
              </div>
            </div>
            <div className="text-slate-400">⇄</div>
            <div className={adapterBox(cur.phase === 'translate-in' || cur.phase === 'translate-out')}>
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">InventoryAdapter</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                {cur.phase === 'translate-in' ? '→ fetchStockXml("SKU-42")'
                  : cur.phase === 'translate-out' ? 'parse XML → 17'
                  : 'implements InventoryClient'}
              </div>
            </div>
            <div className="text-slate-400">⇄</div>
            <div className={adapterBox(cur.phase === 'legacy')}>
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">LegacyInventory</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                {cur.phase === 'legacy' ? '<stock><qty>17</qty></stock>' : 'speaks XML only'}
              </div>
            </div>
          </div>
        )}

        {pattern === 'facade' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`rounded-xl border-2 px-6 py-3 text-center transition-all ${
                cur.action === 'call' || cur.finished
                  ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40'
                  : 'border-slate-300 dark:border-slate-700'
              }`}>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">CheckoutFacade</div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {cur.finished ? 'return "TRK-4415" ✓' : 'checkout(sku, amount, address, email)'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUBSYSTEMS.map((s, i) => {
                const isCurrent = cur.current === i
                const isDone = i < cur.completed
                return (
                  <div key={s.name} className={`rounded-xl border-2 p-3 text-center transition-all ${
                    isCurrent ? 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40'
                    : isDone ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-dashed border-slate-300 dark:border-slate-700 opacity-50'
                  }`}>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.name}</div>
                    <div className={`text-xs font-mono mt-1 ${
                      isDone ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-400'
                    }`}>
                      {isCurrent ? s.call : isDone ? s.result : 'idle'}
                    </div>
                  </div>
                )
              })}
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
