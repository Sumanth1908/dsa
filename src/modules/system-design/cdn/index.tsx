import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface Step {
  requestAt: 'client' | 'edge-ny' | 'origin' | null
  responseAt: 'edge-ny' | 'client' | null
  cacheHit: boolean | null
  edgeCached: boolean
  activeArrows: string[]
  latencyLabel: string | null
  message: string
}

const cdnSteps = (): Step[] => {
  const base: Step = { requestAt: null, responseAt: null, cacheHit: null, edgeCached: false, activeArrows: [], latencyLabel: null, message: '' }
  return [
    { ...base, message: 'CDN is configured. 3 edge servers worldwide cache static assets near users. Origin server is in US-West.' },
    { ...base, requestAt: 'client', message: 'User in New York requests GET /assets/hero.jpg (1.2MB image). Browser sends HTTP request.' },
    { ...base, requestAt: 'edge-ny', activeArrows: ['client-edge'], message: 'DNS resolves to the nearest CDN edge in New York (~5ms). Request hits the NY edge server.' },
    { ...base, requestAt: 'edge-ny', activeArrows: ['client-edge'], cacheHit: false, message: 'Cache MISS: hero.jpg not in edge cache yet. Edge must fetch from origin (US-West).' },
    { ...base, requestAt: 'origin', activeArrows: ['edge-origin'], cacheHit: false, message: 'Edge fetches hero.jpg from origin server (US-West). Round-trip: 150ms.' },
    { ...base, requestAt: 'origin', activeArrows: ['edge-origin'], cacheHit: false, message: 'Origin sends hero.jpg with Cache-Control: public, max-age=86400 (24 hours).' },
    { ...base, responseAt: 'edge-ny', activeArrows: ['origin-edge'], cacheHit: false, edgeCached: true, latencyLabel: '155ms', message: 'Edge caches hero.jpg locally. Stores it for 24h (max-age=86400). Response continues to client.' },
    { ...base, responseAt: 'client', activeArrows: ['edge-client'], cacheHit: false, edgeCached: true, latencyLabel: '160ms total', message: 'First user receives hero.jpg in 160ms. Slightly slow — but this caches it for everyone nearby.' },

    { ...base, edgeCached: true, message: '24 hours pass. A second user in New York requests the same hero.jpg.' },
    { ...base, requestAt: 'client', edgeCached: true, message: 'Second user\'s request — same image. Goes to the same NY edge server.' },
    { ...base, requestAt: 'edge-ny', activeArrows: ['client-edge'], cacheHit: true, edgeCached: true, message: 'Cache HIT: NY edge still has hero.jpg cached (TTL not expired). No origin fetch needed!' },
    { ...base, responseAt: 'client', activeArrows: ['edge-client'], cacheHit: true, edgeCached: true, latencyLabel: '8ms!', message: 'Response served directly from edge in 8ms — 20× faster than the origin miss. Origin server sees zero traffic.' },
  ]
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'HTTP Headers',
    code: `// Server sets these headers on static asset responses
// CDN edges respect them to decide what/how long to cache

// Cache for 24 hours publicly (CDN + browser)
res.setHeader('Cache-Control', 'public, max-age=86400')

// Cache for 1 year — use content hash in filename for cache busting
// e.g., hero.abc123de.jpg — when file changes, new URL, instant update
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

// Revalidate with origin each time (stale-while-revalidate for CDN)
res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')

// ETag for conditional requests (304 Not Modified = no body transfer)
res.setHeader('ETag', '"abc123"')
// On re-request: If-None-Match: "abc123" → 304 if unchanged

// Never cache (user-specific data, auth pages)
res.setHeader('Cache-Control', 'private, no-store')`,
  },
  {
    lang: 'python' as const, label: 'Python (CloudFront / nginx config)',
    code: `# nginx config: cache rules
server {
    # Static assets — 1 year, cache-bust via hash
    location ~* \\.(?:css|js|woff2|png|jpg|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }

    # HTML — short TTL so updates propagate fast
    location ~* \\.html$ {
        expires 5m;
        add_header Cache-Control "public, must-revalidate";
    }

    # API responses — private, no CDN caching
    location /api/ {
        add_header Cache-Control "private, no-cache, no-store";
    }
}

# CloudFront (AWS) — invalidate cache after deploy
import boto3
cf = boto3.client('cloudfront')
cf.create_invalidation(
    DistributionId='E1234567890',
    InvalidationBatch={
        'Paths': {'Quantity': 1, 'Items': ['/*']},  # flush everything
        'CallerReference': str(time.time())
    }
)`,
  },
]

export default function CDNVisualizer() {
  const steps = cdnSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const isArrow = (a: string) => cur.activeArrows.includes(a)

  const nodeStyle = (active: boolean, color: string) =>
    `rounded-xl border-2 p-3 text-center transition-all duration-300 ${
      active ? `${color} scale-105 shadow-lg` : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CDN — Content Delivery Network</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">How edge servers slash latency by serving static assets from the closest geographic point</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Your origin server is in US-West (Oregon). A user in New York loads your homepage — hero.jpg is 1.2MB.
          Without a CDN, every request crosses the continent (150ms each way). With a CDN, the first request fetches from origin
          and caches at the NY edge; every subsequent user in New York gets it in <strong>8ms</strong>.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">When to use a CDN</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          CDNs are ideal for <strong>static assets</strong> (JS, CSS, images, fonts, video) that don't change per-user.
          Use <strong>immutable caching + content-hashed filenames</strong> (hero.abc123.jpg) for zero-downtime deploys:
          new file = new URL = instant global update, while old caches still serve yesterday's version to in-flight users.
          API responses and user-specific data should use <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">Cache-Control: private</code>.
        </p>
      </div>

      <div className="viz-container p-6 space-y-6">
        {/* Map SVG */}
        <svg viewBox="0 0 600 240" className="w-full">
          {/* Background */}
          <rect width="600" height="240" rx="12" fill="transparent" />

          {/* Arrows */}
          {isArrow('client-edge') && (
            <line x1="110" y1="120" x2="230" y2="120" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 3" markerEnd="url(#arrow-indigo)" />
          )}
          {isArrow('edge-origin') && (
            <line x1="280" y1="120" x2="440" y2="120" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" markerEnd="url(#arrow-amber)" />
          )}
          {isArrow('origin-edge') && (
            <line x1="440" y1="135" x2="280" y2="135" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 3" markerEnd="url(#arrow-green)" />
          )}
          {isArrow('edge-client') && (
            <line x1="230" y1="135" x2="110" y2="135" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 3" markerEnd="url(#arrow-green)" />
          )}

          {/* Arrow markers */}
          <defs>
            {['indigo:#6366f1', 'amber:#f59e0b', 'green:#22c55e'].map(s => {
              const [id, color] = s.split(':')
              return (
                <marker key={id} id={`arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={color} />
                </marker>
              )
            })}
          </defs>

          {/* Client */}
          <rect x="20" y="95" width="90" height="50" rx="10"
            fill={cur.requestAt === 'client' || cur.responseAt === 'client' ? '#6366f1' : '#f1f5f9'}
            stroke={cur.requestAt === 'client' || cur.responseAt === 'client' ? '#4f46e5' : '#e2e8f0'}
            strokeWidth="2" className="dark:fill-slate-800 dark:stroke-slate-600 transition-all duration-300" />
          <text x="65" y="116" textAnchor="middle" fontSize="10" fontWeight="600"
            fill={cur.requestAt === 'client' || cur.responseAt === 'client' ? 'white' : '#64748b'}>👤 User</text>
          <text x="65" y="130" textAnchor="middle" fontSize="8" fill={cur.requestAt === 'client' || cur.responseAt === 'client' ? '#c7d2fe' : '#94a3b8'}>New York</text>

          {/* Edge NY */}
          <rect x="235" y="80" width="90" height="80" rx="10"
            fill={cur.requestAt === 'edge-ny' || cur.responseAt === 'edge-ny' ? '#7c3aed' : '#f1f5f9'}
            stroke={cur.requestAt === 'edge-ny' || cur.responseAt === 'edge-ny' ? '#6d28d9' : cur.edgeCached ? '#22c55e' : '#e2e8f0'}
            strokeWidth={cur.edgeCached ? 3 : 2}
            className="dark:fill-slate-800 transition-all duration-300" />
          <text x="280" y="112" textAnchor="middle" fontSize="10" fontWeight="600"
            fill={cur.requestAt === 'edge-ny' || cur.responseAt === 'edge-ny' ? 'white' : '#64748b'}>⚡ Edge</text>
          <text x="280" y="126" textAnchor="middle" fontSize="8"
            fill={cur.requestAt === 'edge-ny' || cur.responseAt === 'edge-ny' ? '#ddd6fe' : '#94a3b8'}>NY PoP</text>
          {cur.edgeCached && (
            <text x="280" y="145" textAnchor="middle" fontSize="7" fontWeight="700" fill="#22c55e">✓ CACHED</text>
          )}

          {/* Edge London */}
          <rect x="235" y="30" width="65" height="35" rx="8"
            fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"
            className="dark:fill-slate-800 dark:stroke-slate-700" />
          <text x="267" y="48" textAnchor="middle" fontSize="8" fill="#94a3b8">⚡ London</text>
          <text x="267" y="60" textAnchor="middle" fontSize="7" fill="#cbd5e1">edge</text>

          {/* Edge Tokyo */}
          <rect x="235" y="175" width="65" height="35" rx="8"
            fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"
            className="dark:fill-slate-800 dark:stroke-slate-700" />
          <text x="267" y="193" textAnchor="middle" fontSize="8" fill="#94a3b8">⚡ Tokyo</text>
          <text x="267" y="205" textAnchor="middle" fontSize="7" fill="#cbd5e1">edge</text>

          {/* Origin */}
          <rect x="445" y="85" width="105" height="70" rx="10"
            fill={cur.requestAt === 'origin' ? '#f59e0b' : '#f1f5f9'}
            stroke={cur.requestAt === 'origin' ? '#d97706' : '#e2e8f0'}
            strokeWidth="2" className="dark:fill-slate-800 dark:stroke-slate-600 transition-all duration-300" />
          <text x="497" y="115" textAnchor="middle" fontSize="10" fontWeight="600"
            fill={cur.requestAt === 'origin' ? 'white' : '#64748b'}>🏭 Origin</text>
          <text x="497" y="129" textAnchor="middle" fontSize="8"
            fill={cur.requestAt === 'origin' ? '#fef3c7' : '#94a3b8'}>US-West</text>
          <text x="497" y="143" textAnchor="middle" fontSize="7"
            fill={cur.requestAt === 'origin' ? '#fde68a' : '#cbd5e1'}>Oregon</text>
        </svg>

        {/* Latency badge */}
        {cur.latencyLabel && (
          <div className="text-center">
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
              cur.cacheHit
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            }`}>
              {cur.cacheHit ? '⚡ Cache HIT — ' : '🔄 Cache MISS — '}{cur.latencyLabel}
            </span>
          </div>
        )}

        {/* Cache status legend */}
        <div className="flex flex-wrap gap-4 text-xs justify-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Cache HIT (~8ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Cache MISS (~160ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-emerald-500 inline-block" /> Edge has cached copy
          </span>
        </div>

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
