import React, { useState } from 'react'
import DoubtsBlock from '@/components/shared/DoubtsBlock'
import MemoryTip from '@/components/shared/MemoryTip'

type WorkloadId = 'identity' | 'orders' | 'queue' | 'projection' | 'search' | 'analytics' | 'geo' | 'timeseries'
type DocumentIndexId = 'nested' | 'multikey' | 'wildcard' | 'secondary' | 'hashed' | 'ttl' | 'search' | 'vector'
type IndexExampleId = 'inverted' | 'composite' | 'bitmap' | 'spatial' | 'brin' | 'vector'

interface Workload {
  id: WorkloadId
  label: string
  queryShape: string
  recommendation: string
  why: string
  tradeoff: string
  query: string
  definition: string
  color: string
}

const WORKLOADS: Workload[] = [
  {
    id: 'identity',
    label: 'Find user by email',
    queryShape: 'Exact equality + uniqueness',
    recommendation: 'Unique B-tree on email',
    why: 'A B-tree finds one value in logarithmic page reads and also enforces that two users cannot share the same email. A hash index can handle equality, but the B-tree is the safer general default.',
    tradeoff: 'Every insert and email change must update the tree and check uniqueness.',
    query: "SELECT * FROM users WHERE email = 'sam@example.com';",
    definition: 'CREATE UNIQUE INDEX users_email_idx ON users (email);',
    color: 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30',
  },
  {
    id: 'orders',
    label: 'Customer order history',
    queryShape: 'Equality + range + newest first',
    recommendation: 'Composite B-tree on (customer_id, created_at DESC)',
    why: 'Rows for one customer are adjacent and already ordered by time. The database can seek to the customer, scan only the requested date range, and often avoid an extra sort.',
    tradeoff: 'It does not efficiently serve created_at-only queries because customer_id is the leading column.',
    query: 'SELECT * FROM orders\nWHERE customer_id = 42 AND created_at >= CURRENT_DATE - 30\nORDER BY created_at DESC LIMIT 20;',
    definition: 'CREATE INDEX orders_customer_time_idx\nON orders (customer_id, created_at DESC);',
    color: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30',
  },
  {
    id: 'queue',
    label: 'Pending jobs only',
    queryShape: 'Small hot subset of a large table',
    recommendation: 'Partial/filtered B-tree on pending rows',
    why: 'The index stores only actionable rows instead of millions of completed jobs. It stays smaller, cheaper to cache, and faster to update.',
    tradeoff: 'The query predicate must imply the index predicate; it cannot help queries for completed jobs.',
    query: "SELECT id FROM jobs\nWHERE status = 'pending' ORDER BY run_at LIMIT 100;",
    definition: "CREATE INDEX pending_jobs_idx ON jobs (run_at)\nWHERE status = 'pending';",
    color: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
  },
  {
    id: 'projection',
    label: 'API list endpoint',
    queryShape: 'Filter by key, return a few extra columns',
    recommendation: 'Covering index using INCLUDE columns',
    why: 'The index contains every value the query needs, so the engine may answer directly from index pages without fetching each base-table row.',
    tradeoff: 'Included columns make the index larger and increase write amplification. Visibility rules can still require table access in some engines.',
    query: 'SELECT order_id, total, status FROM orders\nWHERE customer_id = 42;',
    definition: 'CREATE INDEX orders_customer_cover_idx\nON orders (customer_id) INCLUDE (order_id, total, status);',
    color: 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30',
  },
  {
    id: 'search',
    label: 'Search product text',
    queryShape: 'Words, tokens, phrases, and relevance',
    recommendation: 'Inverted/full-text index',
    why: 'An inverted index maps each normalized term to the documents containing it. It supports token search and ranking that a normal B-tree over the entire sentence cannot provide.',
    tradeoff: 'Tokenization, language rules, index refresh, and ranking configuration add complexity. It is not ideal for substring-anywhere matching without specialized operators.',
    query: "SELECT * FROM products\nWHERE search_vector @@ to_tsquery('wireless & mouse');",
    definition: 'CREATE INDEX products_search_idx\nON products USING GIN (search_vector);',
    color: 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-950/30',
  },
  {
    id: 'analytics',
    label: 'Warehouse dimensions',
    queryShape: 'Low-cardinality filters combined in analytics',
    recommendation: 'Bitmap index or columnar bitmap encoding',
    why: 'Compact bit vectors for values such as region, status, or plan can be ANDed and ORed extremely quickly across millions of rows.',
    tradeoff: 'Poor fit for high-concurrency OLTP writes because changing rows can touch shared bitmap structures. Most useful in warehouses and column stores.',
    query: "SELECT count(*) FROM events\nWHERE region = 'IN' AND plan = 'pro';",
    definition: '-- Engine-specific: bitmap indexes are common in\n-- warehouses and columnar databases.',
    color: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  },
  {
    id: 'geo',
    label: 'Nearby locations',
    queryShape: 'Containment, overlap, or nearest-neighbor geometry',
    recommendation: 'Spatial index: R-tree/GiST/SP-GiST',
    why: 'Spatial trees group nearby bounding regions and prune most geometry before running expensive distance or intersection checks.',
    tradeoff: 'Requires spatial data types and engine-specific operators. Latitude and longitude in separate B-trees do not model two-dimensional proximity well.',
    query: 'SELECT * FROM stores\nORDER BY location <-> :customer_point LIMIT 10;',
    definition: 'CREATE INDEX stores_location_idx\nON stores USING GIST (location);',
    color: 'border-cyan-300 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/30',
  },
  {
    id: 'timeseries',
    label: 'Huge append-only time series',
    queryShape: 'Naturally ordered data and broad time ranges',
    recommendation: 'BRIN / block-range index',
    why: 'BRIN stores tiny summaries such as the minimum and maximum timestamp for groups of physical pages. It skips unrelated page ranges while staying dramatically smaller than a B-tree.',
    tradeoff: 'It is lossy and less effective when physical row order is weakly correlated with the indexed value or when queries retrieve isolated points.',
    query: 'SELECT avg(cpu) FROM metrics\nWHERE recorded_at BETWEEN :start AND :end;',
    definition: 'CREATE INDEX metrics_time_brin_idx\nON metrics USING BRIN (recorded_at);',
    color: 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
  },
]

const INDEX_FAMILIES = [
  { name: 'B-tree / B+ tree', best: 'Equality, ranges, sorting, prefixes, min/max', use: 'Primary keys, timestamps, prices, foreign keys; the default OLTP index', avoid: 'Full-text tokens, arbitrary substrings, multidimensional distance' },
  { name: 'Hash', best: 'Exact equality only', use: 'In-memory hash tables and engines with a proven equality-only hash access path', avoid: 'Ranges, ORDER BY, prefix matching, min/max' },
  { name: 'Inverted / full-text', best: 'Term → matching documents', use: 'Product search, logs, article search, arrays/tags, JSON containment with engine-specific GIN indexes', avoid: 'Normal numeric ranges and strongly consistent primary-key lookup' },
  { name: 'Bitmap', best: 'Combining low-cardinality dimensions', use: 'Warehouses: status, plan, region, boolean flags', avoid: 'Write-heavy, row-oriented OLTP unless the engine manages bitmap encoding internally' },
  { name: 'Spatial (R-tree/GiST)', best: 'Overlap, containment, nearest neighbor', use: 'Maps, delivery zones, polygons, geospatial search', avoid: 'Treating latitude and longitude as unrelated one-dimensional ranges' },
  { name: 'BRIN / zone map', best: 'Skipping ranges of physically correlated pages', use: 'Very large append-only timestamps, sequential IDs, warehouse partitions', avoid: 'Random physical order or highly selective point lookups' },
]

const INDEX_EXAMPLES: Array<{
  id: IndexExampleId
  label: string
  query: string
  rows: string
  entries: string
  lookup: string
  lesson: string
}> = [
  { id: 'inverted', label: 'Inverted index', query: 'Find products matching: wireless AND mouse', rows: 'id  title\n17  Wireless mouse\n24  Wireless keyboard\n31  Wired mouse', entries: 'wireless → [17, 24]\nmouse    → [17, 31]\nkeyboard → [24]', lookup: 'Intersect the posting lists:\n[17, 24] ∩ [17, 31] = [17]', lesson: 'Think “word → documents,” not “document → words.” That reversal makes text search fast.' },
  { id: 'composite', label: 'Composite B-tree', query: 'Find customer 42’s newest orders', rows: 'id   customer_id  created_at\n901  42           Aug 26\n874  42           Aug 24\n880  99           Aug 25', entries: '(42, Aug 26) → 901\n(42, Aug 24) → 874\n(99, Aug 25) → 880', lookup: 'Seek to the first key beginning with 42, read adjacent entries in time order, then stop when 99 begins.', lesson: 'A composite key is a phone book sorted by its first field, then its second. The leftmost field decides where a seek can start.' },
  { id: 'bitmap', label: 'Bitmap', query: "Count events where region = 'IN' AND plan = 'pro'", rows: 'row        1 2 3 4 5\nregion=IN  1 0 1 1 0\nplan=pro   1 1 0 1 0', entries: 'The index stores one compact bit vector per value, rather than a long list of row pointers.', lookup: 'Bitwise AND:\n1 0 1 1 0\n1 1 0 1 0\n─────────\n1 0 0 1 0  → rows 1 and 4', lesson: 'Bitmap = one yes/no light per row. Combining filters is just combining lights, which is excellent for low-cardinality analytics.' },
  { id: 'spatial', label: 'Spatial', query: 'Find stores nearest to customer point (3, 3)', rows: 'store  coordinate\nA      (2, 2)\nB      (8, 2)\nC      (3, 7)', entries: 'Region P1: x=0–4, y=0–8 → A, C\nRegion P2: x=6–10, y=0–4 → B', lookup: 'The point falls in P1, so check A and C first; calculate exact distances only for promising candidates.', lesson: 'Spatial indexes first narrow the map by area, then do precise geometry. They do not treat latitude and longitude as unrelated lists.' },
  { id: 'brin', label: 'BRIN', query: 'Read metrics recorded on Jan 16', rows: 'physical pages  1–100     101–200    201–300\ntimestamps      Jan 1–7   Jan 8–14   Jan 15–21', entries: 'BRIN summaries:\npages 1–100   → min Jan 1,  max Jan 7\npages 101–200 → min Jan 8,  max Jan 14\npages 201–300 → min Jan 15, max Jan 21', lookup: 'Skip the first two page groups. Scan only pages 201–300, then apply the exact timestamp predicate.', lesson: 'BRIN is a table of contents for page ranges: tiny summaries tell the engine which chunks cannot possibly match.' },
  { id: 'vector', label: 'Vector / ANN', query: 'Search: “quiet computer accessory”', rows: 'document    tiny 2D view\nmouse       (0.91, 0.11)\nkeyboard    (0.84, 0.22)\nlaptop      (0.13, 0.89)', entries: 'Query embedding (illustrated in 2D):\n(0.88, 0.17)\n\nReal embeddings usually have hundreds or thousands of dimensions.', lookup: 'An ANN structure explores nearby vector neighborhoods first and returns mouse and keyboard as likely semantic matches.', lesson: 'Vectors answer “meaning is nearby,” not “these letters are identical.” Keep normal filters and keyword indexes for their own jobs.' },
]

const DOCUMENT_INDEXES: Array<{
  id: DocumentIndexId
  name: string
  badge: string
  purpose: string
  behavior: string
  use: string
  warning: string
  example: string
}> = [
  {
    id: 'nested',
    name: 'Nested-path & compound',
    badge: 'Document paths',
    purpose: 'Index scalar values inside embedded objects and order several paths together.',
    behavior: 'A path such as customer.address.zip is extracted from each document. Compound order still matters: { tenantId: 1, "customer.tier": 1, createdAt: -1 } supports the leading prefixes.',
    use: 'Tenant-scoped feeds, orders by an embedded customer attribute, sorting within one partition, and enforcing uniqueness on a nested identifier.',
    warning: 'Indexing the parent object is not the same as indexing each nested field. Match the exact paths and query operators used by the application.',
    example: 'db.orders.createIndex({\n  tenantId: 1,\n  "customer.tier": 1,\n  createdAt: -1\n})',
  },
  {
    id: 'multikey',
    name: 'Multikey / array',
    badge: 'One document → many keys',
    purpose: 'Find documents by values contained in arrays or arrays of embedded objects.',
    behavior: 'For tags: ["database", "scale"], the index emits entries database → doc 7 and scale → doc 7. MongoDB automatically treats an index as multikey when the indexed path contains an array.',
    use: 'Tags, product categories, user roles, movie genres, and fields inside repeated embedded objects.',
    warning: 'Arrays can multiply index entries and storage. Compound-array indexing has engine-specific restrictions, and predicates on the same array element may require an operator such as $elemMatch.',
    example: 'db.articles.createIndex({ tags: 1 })\n\ndb.articles.find({\n  tags: "database"\n})',
  },
  {
    id: 'wildcard',
    name: 'Wildcard & path policy',
    badge: 'Flexible schema',
    purpose: 'Cover fields whose names are unknown, tenant-defined, or change across document shapes.',
    behavior: 'MongoDB wildcard indexes can index arbitrary paths under $**. Cosmos DB instead uses a container indexing policy with included and excluded JSON paths and automatically maintains configured paths.',
    use: 'Product attributes that vary by category, user-defined metadata, polymorphic events, and exploratory workloads before the schema stabilizes.',
    warning: 'Targeted indexes usually perform better and cost less. Wildcard/path-all policies can create many entries, amplify writes, and index fields that are never queried.',
    example: 'db.products.createIndex({\n  "attributes.$**": 1\n})\n\n// Prefer targeted paths once\n// query patterns stabilize.',
  },
  {
    id: 'secondary',
    name: 'GSI / LSI access path',
    badge: 'Alternate key model',
    purpose: 'Query a partitioned key-value/document table using keys other than its primary partition/sort key.',
    behavior: 'In DynamoDB, a GSI can use a different partition key and optional sort key across the whole table. An LSI keeps the table partition key but supplies a different sort key within that partition.',
    use: 'Look up orders by status instead of orderId, list a customer’s items by price, or support another known access pattern without scanning the table.',
    warning: 'This is denormalized materialization, not a free general-purpose index. GSIs consume storage and write capacity and are asynchronously maintained; LSI design and lifecycle are more constrained.',
    example: 'Table PK: orderId\n\nGSI: status + createdAt\n  → all pending orders by time\n\nLSI: customerId + total\n  → one customer’s orders by total',
  },
  {
    id: 'hashed',
    name: 'Hashed',
    badge: 'Distribution',
    purpose: 'Store a hash of a field, commonly to distribute a monotonically increasing shard key more evenly.',
    behavior: 'Hashing destroys the original ordering. Equality can be routed by its hash, but nearby original values no longer remain adjacent.',
    use: 'Hashed sharding of ObjectId-like or sequential keys to avoid directing all new writes to one range shard.',
    warning: 'Not suitable for range queries or sorting. MongoDB hashed indexes also have restrictions around arrays, covered queries, and uniqueness.',
    example: 'db.events.createIndex({\n  eventId: "hashed"\n})\n\n// Good: eventId = 42\n// Poor: eventId > 42',
  },
  {
    id: 'ttl',
    name: 'TTL / expiry',
    badge: 'Lifecycle automation',
    purpose: 'Automatically expire documents based on a date path and retention period.',
    behavior: 'A background process uses the indexed time value to discover and delete expired documents. Expiry is normally asynchronous rather than an exact real-time deadline.',
    use: 'Sessions, password-reset tokens, temporary verification state, machine-generated logs, and short-lived cache documents.',
    warning: 'A sudden retention reduction can generate heavy delete load. TTL is not an authorization boundary—application logic must still reject an expired token before background deletion occurs.',
    example: 'db.sessions.createIndex(\n  { expiresAt: 1 },\n  { expireAfterSeconds: 0 }\n)',
  },
  {
    id: 'search',
    name: 'Text / search',
    badge: 'Lexical relevance',
    purpose: 'Tokenize text and map terms to documents for relevance-ranked lexical search.',
    behavior: 'The search index may apply analyzers, stemming, language rules, fuzzy matching, facets, and stored fields. Managed search indexes can be separate from ordinary operational indexes.',
    use: 'Catalog search, article search, autocomplete, log exploration, phrase matching, and hybrid lexical-plus-filter queries.',
    warning: 'Search indexes may refresh asynchronously and have different consistency behavior. Do not use them as the source of truth for permissions, balances, or existence checks.',
    example: '// Conceptual search mapping\n{\n  title: "text",\n  description: "text",\n  category: "filter"\n}',
  },
  {
    id: 'vector',
    name: 'Vector / ANN',
    badge: 'Semantic similarity',
    purpose: 'Find documents whose embedding vectors are closest to a query vector in high-dimensional space.',
    behavior: 'Approximate-nearest-neighbor structures such as HNSW trade perfect recall for speed. Exact-nearest-neighbor search checks more candidates. Metadata fields are often indexed for pre-filtering.',
    use: 'Semantic product search, recommendation, image similarity, duplicate detection, and retrieval-augmented generation.',
    warning: 'A vector index does not replace filters, keyword search, or operational indexes. Measure recall, latency, memory, embedding quality, and update freshness together.',
    example: '{\n  path: "embedding",\n  similarity: "cosine",\n  dimensions: 1536,\n  filters: ["tenantId", "category"]\n}',
  },
]

const DOCUMENT_ENGINE_MODELS = [
  { engine: 'MongoDB', model: 'Explicit indexes on document paths', special: 'Compound, multikey, wildcard, geospatial, hashed, text, clustered, TTL; Search and Vector Search use specialized indexes.' },
  { engine: 'DynamoDB', model: 'Primary partition/sort key plus secondary access paths', special: 'GSI changes the partition/sort key; LSI keeps the partition key and changes the sort key.' },
  { engine: 'Cosmos DB for NoSQL', model: 'Per-container indexing policy over JSON paths', special: 'Included/excluded paths plus composite, tuple, spatial, full-text, and vector index configuration.' },
  { engine: 'Search-oriented document stores', model: 'Schema mapping creates an inverted index', special: 'Text analyzers, keyword fields, facets, geospatial fields, and vectors; refresh may be asynchronous.' },
]

const COMPOSITE_QUERIES = [
  { predicate: 'tenant_id = ?', result: 'Good', reason: 'Uses the leading column.' },
  { predicate: 'tenant_id = ? AND status = ?', result: 'Great', reason: 'Uses the first two columns.' },
  { predicate: 'tenant_id = ? AND status = ? AND created_at > ?', result: 'Ideal', reason: 'Equality columns first, then the range.' },
  { predicate: 'tenant_id = ? AND created_at > ?', result: 'Partial', reason: 'Can seek by tenant, but skips status in the ordered key.' },
  { predicate: 'status = ?', result: 'Poor', reason: 'Cannot seek past the missing leading tenant_id.' },
]

const DOUBTS = [
  {
    q: 'Why does a database not automatically index every column?',
    a: 'Indexes are derived data structures that must be stored, cached, backed up, and updated. An insert into a table with eight indexes may require eight additional tree changes. More indexes consume memory, increase WAL and replication traffic, slow writes, lengthen maintenance, and give the optimizer more plans to compare. Add an index for a demonstrated query pattern, not merely because a column exists.',
  },
  {
    q: 'Why is B-tree usually the default?',
    a: 'A balanced B-tree supports equality, ranges, ordered scans, prefixes, min/max, and ORDER BY using the same structure. Its high fan-out means even a billion-row index often needs only a few page reads from root to leaf. Hash indexes can make equality simpler, but cannot provide ordering or range scans, so their useful surface is narrower.',
  },
  {
    q: 'How should I order columns in a composite index?',
    a: 'Start from real query predicates. A useful rule is: equality columns first, then range or ordering columns, while considering which leading prefix is shared by the most important queries. Cardinality alone is not a universal ordering rule. For `WHERE tenant_id=? AND status=? AND created_at>?`, `(tenant_id, status, created_at)` supports the complete search. The same index generally cannot seek efficiently for `status=?` alone because the leading tenant is unknown.',
  },
  {
    q: 'Should every foreign key have an index?',
    a: 'Frequently yes, especially when parents are deleted or updated and when joins navigate from parent to children. Many databases do not automatically create an index for the referencing foreign-key column. Without one, checking or cascading a parent change may scan the entire child table. Confirm your engine’s behavior and workload rather than assuming the constraint created it.',
  },
  {
    q: 'What is the difference between clustered and non-clustered indexes?',
    a: 'A clustered index determines or closely follows the physical organization of table rows, so a table normally has only one clustering order. A secondary/non-clustered index is a separate structure whose leaf entries point to rows or primary keys; a table can have many. Terminology and implementation differ across PostgreSQL, MySQL/InnoDB, SQL Server, and other engines, so reason about physical row order versus a separate lookup structure rather than relying only on the names.',
  },
  {
    q: 'Why might the optimizer ignore an index?',
    a: 'An index is not automatically faster. If a predicate returns a large portion of the table, sequentially reading table pages can be cheaper than bouncing between the index and table. Other causes include stale statistics, a function or implicit cast on the indexed column, a leading-wildcard pattern, a missing composite prefix, mismatched collation, or a very small table. Use `EXPLAIN` and actual execution statistics instead of forcing the index blindly.',
  },
  {
    q: 'Does an index make LIMIT fast?',
    a: 'Only when the index can satisfy the filtering and requested order. `ORDER BY created_at DESC LIMIT 20` can stop early on a matching ordered index. Without that order, the engine may still scan and sort a large result before returning twenty rows. A composite index should usually place equality filters before the ordering column.',
  },
  {
    q: 'When should an index be removed?',
    a: 'Consider removing an index when production usage statistics show no reads over a representative period, another index fully subsumes it, or its write/storage cost exceeds its benefit. First check rare but critical jobs, constraint dependencies, seasonal workloads, and replicas. Remove or disable it through a safe migration, observe query plans and latency, and retain a rollback path.',
  },
]

function formatRows(rows: number) {
  if (rows >= 1_000_000_000) return `${rows / 1_000_000_000}B`
  if (rows >= 1_000_000) return `${rows / 1_000_000}M`
  if (rows >= 1_000) return `${rows / 1_000}K`
  return String(rows)
}

export default function DatabaseIndexesVisualizer() {
  const [workloadId, setWorkloadId] = useState<WorkloadId>('orders')
  const [documentIndexId, setDocumentIndexId] = useState<DocumentIndexId>('multikey')
  const [indexExampleId, setIndexExampleId] = useState<IndexExampleId>('inverted')
  const [rowCount, setRowCount] = useState(1_000_000)
  const workload = WORKLOADS.find(item => item.id === workloadId) ?? WORKLOADS[0]
  const documentIndex = DOCUMENT_INDEXES.find(item => item.id === documentIndexId) ?? DOCUMENT_INDEXES[0]
  const indexExample = INDEX_EXAMPLES.find(item => item.id === indexExampleId) ?? INDEX_EXAMPLES[0]
  const btreePages = Math.ceil(Math.log(Math.max(rowCount, 2)) / Math.log(200)) + 1

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Database Indexes</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Choose an access path from the query shape—not from the column name</p>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
        <h3 className="mb-1 font-medium text-indigo-800 dark:text-indigo-300">The library catalog</h3>
        <p className="text-sm leading-relaxed text-indigo-700 dark:text-indigo-400">
          A table is a warehouse of books in arrival order. Without a catalog, finding one title means checking every shelf.
          An index stores selected values in a searchable structure plus a pointer to the row. Reads become dramatically faster,
          but every new book must update both the warehouse and each catalog.
        </p>
      </div>

      <MemoryTip>Index the query: filter, join, order, and returned columns—in that order of reasoning.</MemoryTip>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Index selection playground</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a real query shape to see the matching index and its cost.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="Query workloads">
          {WORKLOADS.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={workloadId === item.id}
              onClick={() => setWorkloadId(item.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${workloadId === item.id ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/40 dark:ring-indigo-900' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</div>
              <div className="mt-1 text-xs text-slate-500">{item.queryShape}</div>
            </button>
          ))}
        </div>

        <div className={`rounded-xl border p-5 ${workload.color}`} role="tabpanel" aria-live="polite">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommended access path</div>
              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{workload.recommendation}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{workload.why}</p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <strong>Cost:</strong> {workload.tradeoff}
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Query</div>
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-200"><code>{workload.query}</code></pre>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Possible definition</div>
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-emerald-300"><code>{workload.definition}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Why indexes change lookup cost</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">A simplified comparison for an exact lookup; actual plans depend on caching, selectivity, and page layout.</p>
        </div>
        <div className="viz-container p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Table size">
            {[1_000, 1_000_000, 1_000_000_000].map(rows => (
              <button key={rows} onClick={() => setRowCount(rows)} aria-pressed={rowCount === rows}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${rowCount === rows ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                {formatRows(rows)} rows
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-4" aria-live="polite">
            <div className="grid grid-cols-[105px_1fr_90px] items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Table scan</span>
              <div className="h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full w-full bg-slate-500" /></div>
              <span className="text-right font-mono text-xs text-slate-500">up to {formatRows(rowCount)}</span>
            </div>
            <div className="grid grid-cols-[105px_1fr_90px] items-center gap-3">
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">B-tree seek</span>
              <div className="h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full min-w-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.max(2, btreePages * 3)}%` }} /></div>
              <span className="text-right font-mono text-xs text-indigo-600 dark:text-indigo-400">~{btreePages} pages</span>
            </div>
            <div className="grid grid-cols-[105px_1fr_90px] items-center gap-3">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Hash lookup</span>
              <div className="h-6 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full w-[2%] min-w-2 rounded-full bg-emerald-500" /></div>
              <span className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">~O(1) avg</span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">B-tree fan-out is high because each page stores many keys. Hash is shown only for exact equality; it cannot replace the B-tree for ranges or ordering. A low-selectivity query may still make the table scan cheaper.</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Index families and where they are used</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">These are underlying access structures; composite, unique, covering, and partial describe how an index is configured.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
              <tr><th className="px-4 py-3">Family</th><th className="px-4 py-3">Best at</th><th className="px-4 py-3">Common use</th><th className="px-4 py-3">Avoid for</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
              {INDEX_FAMILIES.map(item => (
                <tr key={item.name}>
                  <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300">{item.name}</td>
                  <td className="px-4 py-3">{item.best}</td>
                  <td className="px-4 py-3">{item.use}</td>
                  <td className="px-4 py-3 text-slate-500">{item.avoid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Concrete examples: what an index actually stores</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Choose a family, then follow the data from table rows to index entries to the lookup.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3" role="tablist" aria-label="Concrete index examples">
          {INDEX_EXAMPLES.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={indexExampleId === item.id}
              onClick={() => setIndexExampleId(item.id)}
              className={`rounded-xl border p-3 text-left text-sm font-bold transition-colors ${indexExampleId === item.id ? 'border-violet-400 bg-violet-50 text-violet-800 ring-1 ring-violet-200 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-900 dark:bg-violet-950/20" role="tabpanel" aria-live="polite">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{indexExample.label}: follow one lookup</h3>
          <p className="mt-1 text-sm font-medium text-violet-800 dark:text-violet-300">Query: {indexExample.query}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Small table sample</h4>
              <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300"><code>{indexExample.rows}</code></pre>
            </div>
            <div className="rounded-lg bg-slate-950 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Index entries</h4>
              <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-emerald-300"><code>{indexExample.entries}</code></pre>
            </div>
            <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/30">
              <h4 className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Lookup path</h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-sky-900 dark:text-sky-200">{indexExample.lookup}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-violet-200 bg-white/80 p-3 text-sm leading-relaxed text-violet-900 dark:border-violet-800 dark:bg-slate-900/70 dark:text-violet-200"><strong>Remember:</strong> {indexExample.lesson}</div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document-database index styles</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Documents add nested paths, arrays, flexible fields, alternate partition keys, expiry, and semantic search to the indexing decision.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="Document index styles">
          {DOCUMENT_INDEXES.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={documentIndexId === item.id}
              onClick={() => setDocumentIndexId(item.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${documentIndexId === item.id ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/40 dark:ring-indigo-900' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
              <div className="mt-1 text-xs text-slate-500">{item.badge}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-indigo-200 bg-white p-5 dark:border-indigo-900 dark:bg-slate-900" role="tabpanel" aria-live="polite">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">{documentIndex.badge}</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{documentIndex.name}</h3>
              <p className="mt-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">{documentIndex.purpose}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">How it behaves</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{documentIndex.behavior}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Use it for</h4>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">{documentIndex.use}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"><strong>Watch out:</strong> {documentIndex.warning}</div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Example / mental model</div>
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-sky-300"><code>{documentIndex.example}</code></pre>
              {documentIndex.id === 'multikey' && (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
                  <div className="text-xs font-bold text-violet-800 dark:text-violet-300">One document creates multiple entries</div>
                  <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-xs">
                    <code className="rounded bg-white p-2 dark:bg-slate-900">tags: [db, scale]</code>
                    <span>→</span>
                    <div className="space-y-1"><div className="rounded bg-white p-1.5 dark:bg-slate-900">db → doc 7</div><div className="rounded bg-white p-1.5 dark:bg-slate-900">scale → doc 7</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
              <tr><th className="px-4 py-3">System style</th><th className="px-4 py-3">Indexing model</th><th className="px-4 py-3">Distinctive concepts</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
              {DOCUMENT_ENGINE_MODELS.map(item => (
                <tr key={item.engine}>
                  <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300">{item.engine}</td>
                  <td className="px-4 py-3">{item.model}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.special}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Official terminology references</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href="https://www.mongodb.com/docs/manual/core/indexes/index-types/" target="_blank" rel="noreferrer">MongoDB index types ↗</a>
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html" target="_blank" rel="noreferrer">DynamoDB secondary indexes ↗</a>
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href="https://learn.microsoft.com/en-us/cosmos-db/indexing-policies" target="_blank" rel="noreferrer">Cosmos DB indexing policies ↗</a>
            <a className="text-indigo-600 hover:underline dark:text-indigo-400" href="https://www.mongodb.com/docs/vector-search/" target="_blank" rel="noreferrer">MongoDB Vector Search ↗</a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/30">
          <h2 className="font-bold text-violet-900 dark:text-violet-200">Composite indexes: order matters</h2>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">For <code className="font-mono">(tenant_id, status, created_at)</code>, the useful search prefixes begin on the left.</p>
          <div className="mt-4 space-y-2">
            {COMPOSITE_QUERIES.map(item => (
              <div key={item.predicate} className="rounded-lg bg-white p-3 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <code className="text-xs text-slate-700 dark:text-slate-300">{item.predicate}</code>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.result === 'Ideal' || item.result === 'Great' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : item.result === 'Good' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>{item.result}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/30">
            <h2 className="font-bold text-sky-900 dark:text-sky-200">Four independent index choices</h2>
            <ul className="mt-3 space-y-2 text-sm text-sky-800 dark:text-sky-300">
              <li><strong>Structure:</strong> B-tree, hash, inverted, bitmap, spatial, BRIN.</li>
              <li><strong>Columns:</strong> single-column or composite ordered key.</li>
              <li><strong>Constraint:</strong> unique or non-unique.</li>
              <li><strong>Scope/storage:</strong> partial, covering, clustered, or secondary.</li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-sky-700 dark:text-sky-400">One definition can combine several: a unique, partial, composite B-tree with included columns.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
            <h2 className="font-bold text-amber-900 dark:text-amber-200">Validate with the query planner</h2>
            <ol className="mt-3 space-y-1.5 text-sm text-amber-800 dark:text-amber-300">
              <li>1. Capture the real query and parameter distribution.</li>
              <li>2. Run <code className="font-mono text-xs">EXPLAIN (ANALYZE, BUFFERS)</code> or the engine equivalent.</li>
              <li>3. Check estimated versus actual rows, scan type, sorting, and page reads.</li>
              <li>4. Measure read gain against write, storage, and cache cost.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-800 dark:bg-rose-950/30">
        <h2 className="font-bold text-rose-900 dark:text-rose-200">The bill every index creates</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Write amplification', 'INSERT, UPDATE, and DELETE maintain every affected index.'],
            ['Storage & cache', 'Index pages consume disk and compete with table pages for memory.'],
            ['Operational work', 'Builds, reindexing, vacuuming, statistics, and replication take resources.'],
            ['Planner complexity', 'Overlapping indexes create more candidate plans and can hide redundancy.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg bg-white p-3 dark:bg-slate-900/70">
              <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <DoubtsBlock doubts={DOUBTS} />
    </div>
  )
}
