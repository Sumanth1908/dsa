import React, { useState } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

type Operation = 'get-product' | 'create-order' | 'authenticate'

const OPS: { id: Operation; label: string; icon: string }[] = [
  { id: 'get-product', label: 'Get Product', icon: '📦' },
  { id: 'create-order', label: 'Create Order', icon: '🛒' },
  { id: 'authenticate', label: 'Authenticate User', icon: '🔐' },
]

interface APIRequest { method: string; url: string; body?: object }
interface APIResponse { status: number; body: object }

interface Example {
  rest: { request: APIRequest; response: APIResponse; notes: string[] }
  rpc: { request: APIRequest; response: APIResponse; notes: string[] }
}

const EXAMPLES: Record<Operation, Example> = {
  'get-product': {
    rest: {
      request: { method: 'GET', url: '/products/123' },
      response: { status: 200, body: { id: 123, name: 'Wireless Headphones', price: 99.99, stock: 42 } },
      notes: ['Uses GET — result is cacheable (CDN, browser)', 'URL is a noun (resource)', 'No request body needed'],
    },
    rpc: {
      request: { method: 'POST', url: '/rpc', body: { method: 'getProduct', params: { id: 123 } } },
      response: { status: 200, body: { result: { id: 123, name: 'Wireless Headphones', price: 99.99, stock: 42 } } },
      notes: ['Always POST — not cacheable by default', 'Single endpoint /rpc', 'Method name in body'],
    },
  },
  'create-order': {
    rest: {
      request: { method: 'POST', url: '/orders', body: { userId: 456, items: [{ productId: 123, qty: 2 }], shippingAddress: { city: 'New York' } } },
      response: { status: 201, body: { orderId: 'ord_789', status: 'confirmed', total: 199.98 } },
      notes: ['POST creates a resource, returns 201', 'URL is /orders (collection)', 'Response includes Location header'],
    },
    rpc: {
      request: { method: 'POST', url: '/rpc', body: { method: 'placeOrder', params: { userId: 456, items: [{ productId: 123, qty: 2 }], runStockCheck: true, chargeNow: false } } },
      response: { status: 200, body: { result: { orderId: 'ord_789', status: 'confirmed' }, meta: { stockChecked: true, charged: false } } },
      notes: ['Complex business logic fits naturally (runStockCheck, chargeNow)', 'Action-oriented naming', 'Can bundle multiple operations in one call'],
    },
  },
  'authenticate': {
    rest: {
      request: { method: 'POST', url: '/auth/login', body: { email: 'alice@example.com', password: '••••••••' } },
      response: { status: 200, body: { accessToken: 'eyJhbGci...', refreshToken: 'dGhpcyBp...', expiresIn: 3600 } },
      notes: ['POST /auth/login — action doesn\'t fit CRUD cleanly', 'Returning a token, not creating a User resource', 'Many REST APIs use RPC-style for auth'],
    },
    rpc: {
      request: { method: 'POST', url: '/rpc', body: { method: 'authenticateUser', params: { email: 'alice@example.com', password: '••••••••' } } },
      response: { status: 200, body: { result: { accessToken: 'eyJhbGci...', refreshToken: 'dGhpcyBp...', expiresIn: 3600 } } },
      notes: ['Actions fit RPC naturally — "authenticate" is a verb', 'No awkward URL design needed', 'gRPC uses this model with Protobuf'],
    },
  },
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'REST (Express)',
    code: `// REST: resource-oriented, HTTP method carries semantic
app.get('/products/:id', async (req, res) => {
  const product = await db.products.findById(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)                    // 200 OK
})

app.post('/orders', authenticate, async (req, res) => {
  const { items, shippingAddress } = req.body
  const order = await orderService.create({ userId: req.user.id, items, shippingAddress })
  res
    .status(201)                       // Created
    .location(\`/orders/\${order.id}\`) // Where to find the new resource
    .json(order)
})

app.delete('/orders/:id', authenticate, async (req, res) => {
  await orderService.cancel(req.params.id, req.user.id)
  res.status(204).send()              // No Content
})`,
  },
  {
    lang: 'python' as const, label: 'gRPC (RPC)',
    code: `# proto file — strongly typed, language-agnostic contracts
# order_service.proto
service OrderService {
  rpc GetProduct  (GetProductRequest)  returns (Product);
  rpc PlaceOrder  (PlaceOrderRequest)  returns (OrderResult);
  rpc CancelOrder (CancelOrderRequest) returns (google.protobuf.Empty);
}
message GetProductRequest { int64 id = 1; }
message Product { int64 id = 1; string name = 2; float price = 3; }

# Python server implementation
class OrderServicer(order_pb2_grpc.OrderServiceServicer):
    def GetProduct(self, request, context):
        product = db.get_product(request.id)
        return order_pb2.Product(id=product.id, name=product.name, price=product.price)

    def PlaceOrder(self, request, context):
        if not stock_check(request.items):
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Out of stock")
        order = create_order(request)
        return order_pb2.OrderResult(order_id=order.id, status="confirmed")`,
  },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  POST: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  PUT: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  DELETE: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  PATCH: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
}

const STATUS_COLOR = (s: number) => s < 300 ? 'text-emerald-600 dark:text-emerald-400' : s < 400 ? 'text-amber-600' : 'text-rose-600'

function RequestPanel({ req, label, color }: { req: Example['rest'] | Example['rpc']; label: string; color: string }) {
  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${color}`}>
      <div className="font-bold text-sm">{label}</div>

      <div>
        <div className="text-xs text-slate-500 mb-1 font-medium">Request</div>
        <div className="rounded-lg bg-slate-900 p-3 space-y-1.5 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${METHOD_COLOR[req.request.method] ?? 'bg-slate-700 text-white'}`}>
              {req.request.method}
            </span>
            <span className="text-slate-300">{req.request.url}</span>
          </div>
          {req.request.body && (
            <pre className="text-emerald-400 text-[10px] overflow-x-auto">
              {JSON.stringify(req.request.body, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-1 font-medium">Response</div>
        <div className="rounded-lg bg-slate-900 p-3 space-y-1.5 font-mono text-xs">
          <div className={`font-bold ${STATUS_COLOR(req.response.status)}`}>HTTP {req.response.status}</div>
          <pre className="text-violet-300 text-[10px] overflow-x-auto">
            {JSON.stringify(req.response.body, null, 2)}
          </pre>
        </div>
      </div>

      <div className="space-y-1">
        {req.notes.map((n, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="text-slate-400 flex-shrink-0">•</span>
            <span>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function APIDesignVisualizer() {
  const [op, setOp] = useState<Operation>('get-product')
  const ex = EXAMPLES[op]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Design — REST vs RPC</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Same e-commerce operations, two paradigms — compare request shape, HTTP semantics, and trade-offs</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You're designing an e-commerce platform API. <strong>REST</strong> models everything as resources (products, orders, users)
          with standard CRUD verbs (GET/POST/PUT/DELETE). <strong>RPC</strong> models everything as function calls
          (getProduct, placeOrder, authenticateUser) — one endpoint, action in the body.
          Most real systems use a hybrid: REST for CRUD, RPC-style for complex operations.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-2">When to use which</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="text-emerald-700 dark:text-emerald-400">
            <strong>REST</strong>: public APIs (3rd-party integrations), CRUD on clear resources, when HTTP caching matters (GET requests), OpenAPI/Swagger documentation, browser clients.
          </div>
          <div className="text-emerald-700 dark:text-emerald-400">
            <strong>RPC / gRPC</strong>: internal microservice communication, complex operations (multi-step, non-CRUD), performance-critical paths (gRPC + Protobuf = binary, compact), streaming use cases.
          </div>
        </div>
      </div>

      {/* Operation tabs */}
      <div className="flex gap-2">
        {OPS.map(o => (
          <button key={o.id} onClick={() => setOp(o.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              op === o.id
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RequestPanel req={ex.rest} label="REST" color="border-emerald-200 dark:border-emerald-800" />
        <RequestPanel req={ex.rpc} label="RPC (JSON-RPC / gRPC)" color="border-blue-200 dark:border-blue-800" />
      </div>

      {/* Key differences summary */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-left p-3 text-slate-600 dark:text-slate-400 font-semibold">Dimension</th>
              <th className="text-left p-3 text-emerald-700 dark:text-emerald-400 font-semibold">REST</th>
              <th className="text-left p-3 text-blue-700 dark:text-blue-400 font-semibold">RPC / gRPC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ['URL design', 'Resource nouns: /products/123', 'Single endpoint: /rpc or /service.Method'],
              ['HTTP verbs', 'GET, POST, PUT, PATCH, DELETE', 'Usually POST only'],
              ['Caching', 'GET is cacheable by default (CDN!)', 'POST not cacheable — custom headers needed'],
              ['Complex operations', 'Awkward: POST /orders/123/cancel', 'Natural: cancelOrder({id: 123})'],
              ['Type safety', 'OpenAPI/Swagger spec', 'Protobuf schema — compile-time checks'],
              ['Browser clients', 'Native fetch support', 'gRPC needs proxy (Envoy, grpc-web)'],
            ].map(([dim, rest, rpc]) => (
              <tr key={dim} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{dim}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{rest}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{rpc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
