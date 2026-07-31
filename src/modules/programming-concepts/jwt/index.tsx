import React, { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import CodeTabs from '@/components/shared/CodeTabs'

const TOKENS = {
  valid: {
    label: 'Valid Token',
    header: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    payload: 'eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGljZSBTbWl0aCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzM1Njg5NjAwfQ',
    signature: 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    headerDecoded: { alg: 'HS256', typ: 'JWT' },
    payloadDecoded: { sub: 'user_123', name: 'Alice Smith', role: 'admin', iat: 1700000000, exp: 1735689600 },
  },
  expired: {
    label: 'Expired Token',
    header: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    payload: 'eyJzdWIiOiJ1c2VyXzQ1NiIsIm5hbWUiOiJCb2IgSm9uZXMiLCJyb2xlIjoidXNlciIsImlhdCI6MTY3MDAwMDAwMCwiZXhwIjoxNjcwMDg2NDAwfQ',
    signature: 'xKn9G3_dQ7mPvL2RkEaWjHsYoNuB4TiCfIqAeUh8pZ0',
    headerDecoded: { alg: 'HS256', typ: 'JWT' },
    payloadDecoded: { sub: 'user_456', name: 'Bob Jones', role: 'user', iat: 1670000000, exp: 1670086400 },
  },
}

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'Node.js (jsonwebtoken)',
    code: `import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET  // never hard-code!

// Sign — creates the token
const token = jwt.sign(
  { sub: 'user_123', name: 'Alice Smith', role: 'admin' },
  SECRET,
  { expiresIn: '24h', algorithm: 'HS256' }
)
// → "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.SflK..."

// Verify — validates signature + expiry, returns payload
try {
  const payload = jwt.verify(token, SECRET)
  console.log(payload.role) // "admin"
} catch (e) {
  if (e.name === 'TokenExpiredError') res.status(401).send('Token expired')
  else res.status(401).send('Invalid token')
}

// Decode without verifying (client-side only — don't trust for auth!)
const decoded = jwt.decode(token)  // ← no signature check`,
  },
  {
    lang: 'python' as const, label: 'Python (PyJWT)',
    code: `import jwt
from datetime import datetime, timedelta, timezone

SECRET = "your-256-bit-secret"  # store in env var

# Sign
payload = {
    "sub": "user_123",
    "name": "Alice Smith",
    "role": "admin",
    "iat": datetime.now(tz=timezone.utc),
    "exp": datetime.now(tz=timezone.utc) + timedelta(hours=24),
}
token = jwt.encode(payload, SECRET, algorithm="HS256")

# Verify
try:
    decoded = jwt.decode(token, SECRET, algorithms=["HS256"])
    print(decoded["role"])  # "admin"
except jwt.ExpiredSignatureError:
    print("Token expired — force re-login")
except jwt.InvalidTokenError:
    print("Invalid token — reject request")`,
  },
  {
    lang: 'java' as const, label: 'Java (JJWT)',
    code: `import io.jsonwebtoken.*;
import java.security.Key;
import io.jsonwebtoken.security.Keys;

Key key = Keys.hmacShaKeyFor(secretBytes); // 256-bit key

// Sign
String token = Jwts.builder()
    .subject("user_123")
    .claim("role", "admin")
    .claim("name", "Alice Smith")
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + 86_400_000)) // 24h
    .signWith(key)
    .compact();

// Verify
try {
    Claims claims = Jwts.parser()
        .verifyWith(key).build()
        .parseSignedClaims(token)
        .getPayload();
    String role = claims.get("role", String.class); // "admin"
} catch (ExpiredJwtException e) {
    // token expired
} catch (JwtException e) {
    // invalid signature
}`,
  },
]

const CLAIM_DOCS: Record<string, string> = {
  sub: 'Subject — who this token identifies (usually user ID)',
  name: 'Custom claim — displayable user name',
  role: 'Custom claim — authorization role (admin, user, viewer)',
  iat: 'Issued At — Unix timestamp of when the token was created',
  exp: 'Expiration — Unix timestamp after which the token is invalid',
  alg: 'Algorithm — HMAC-SHA256 (symmetric) or RS256 (asymmetric)',
  typ: 'Type — always "JWT" for JSON Web Tokens',
}

const formatTimestamp = (unix: number) => new Date(unix * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

const DOUBTS = [
  {
    q: 'Is a JWT encrypted?',
    a: 'No — JWTs are **signed**, not encrypted. The header and payload are merely base64url-encoded, so anyone holding the token can decode and read them instantly — they\'re visible in browser DevTools. The signature ensures tamper-proof-ness: you can verify the token hasn\'t been modified, but you cannot hide its contents.\n\nThe key consequence: never store passwords, credit card numbers, or sensitive personally identifiable information (PII) inside claims. Treat JWT payloads as public data. When Alice\'s browser decodes the token, her `role`, user ID, and custom claims are readable on her machine.\n\nIf you truly need secrecy — encrypting the payload itself — you need JWE (JSON Web Encryption), which wraps the JWT in an additional encryption layer. JWE is more complex and usually unnecessary; JWTs are designed for **authentication** (proving identity) and stateless bearer tokens, not data confidentiality.\n\n**Rule of thumb:** Use JWTs for stateless auth and non-sensitive claims; use JWE only if the payload contains secrets.',
  },
  {
    q: 'How can the server trust a token it never stored?',
    a: 'The signature — it\'s the entire foundation of JWT trust. The server signs the header+payload using a symmetric key (HMAC-SHA256) or its private key (RSA/ECDSA) when issuing the token. Every time a client sends that token back, the server re-verifies: it recomputes the signature using the same header and payload data, then checks if the result matches the signature on the token.\n\nIf even a single character in the payload changes — say an attacker edits the `role` claim from `user` to `admin` — the recomputed signature will be completely different. Verification fails instantly, and the server rejects the request. No database lookup, no session table required.\n\nExample: Alice\'s token contains `role: user`. An attacker intercepts it and manually changes the base64 payload to `role: admin`. When the server re-verifies, it hashes the tampered payload, but the signature doesn\'t match what HMAC-SHA256 would produce. The math proves forgery.\n\nThis is the superpower of statelessness: the server trusts the cryptographic math, not a session table. Horizontal scaling becomes trivial because every server can verify independently.',
  },
  {
    q: 'How do you log someone out if JWTs cannot be revoked?',
    a: 'You mostly cannot — short-lived access tokens are the pragmatic solution. Instead of indefinite tokens, issue access tokens with a short expiry (5–15 minutes) paired with a longer-lived refresh token stored server-side in an `HttpOnly` cookie.\n\nWhen a user logs out, you revoke the refresh token in your database. On the client, the access token is lost (stored in memory, not persistent). The next time it expires naturally, the client tries to use the refresh token to get a new access token — but the server rejects it because it\'s been revoked. Boom: user is logged out.\n\nThis hybrid approach avoids the pure-statelessness contradiction. The refresh token reintroduces a small amount of server-side state, but it\'s lighter than full session management: you maintain only a blacklist or denylist, checked during refresh, not on every request.\n\nFor instant bans (compromised account), you\'d check a denylist on every API request, which quietly reintroduces statefulness on every call. It\'s a trade-off: true statelessness sacrifices revocation; real-world systems usually add state for security.\n\n**Common mistake:** Using long-lived access tokens and hoping to revoke them — it won\'t work without a per-request denylist check.',
  },
  {
    q: 'Where do I store it in the browser — localStorage or cookie?',
    a: 'localStorage is vulnerable to XSS (cross-site scripting): if an attacker injects malicious JavaScript into your page, `localStorage.getItem("token")` exposes the token instantly. Cookies have a built-in defense: the `HttpOnly` flag prevents JavaScript from reading them, blocking XSS theft completely.\n\nHowever, `HttpOnly` cookies open a CSRF (cross-site request forgery) attack vector: a malicious site can trick a user\'s browser into sending the token automatically on a cross-origin request. You must defend with `SameSite` attributes (`Strict` or `Lax`) and additional token-based CSRF checks.\n\nA hardened pattern: store a long-lived refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (not readable by JavaScript). Keep short-lived access tokens (5–15 minute expiry) in memory — a plain JavaScript variable. Refresh tokens are revocable server-side; access tokens die on page reload, mitigating XSS impact since there\'s nothing to steal.\n\nExample: on login, send `Set-Cookie: refresh_token=xyz;HttpOnly;Secure;SameSite=Strict`. JavaScript holds the access token in a `let` variable, never localStorage. No token in DOM, no XSS theft.\n\n**Rule of thumb:** `HttpOnly` cookie for refresh token, memory-held short-lived access token for API calls.',
  },
]

export default function JWTVisualizer() {
  const [tokenKey, setTokenKey] = useState<'valid' | 'expired'>('valid')
  const [activeField, setActiveField] = useState<string | null>(null)
  const tok = TOKENS[tokenKey]
  const payloadDecoded = tok.payloadDecoded
  const isExpired = tokenKey === 'expired'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">JWT Authentication</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">A JWT is a self-contained, signed token — click any claim to learn what it does</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Alice logs in → server creates a JWT signed with its secret → sends it to Alice's browser → Alice includes it as <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">Authorization: Bearer &lt;token&gt;</code> on every request → server verifies the signature without hitting the database.
          No sessions, no shared state — stateless auth scales horizontally.
        </p>
      </div>

      <MemoryTip>Header says how, payload says what, signature proves unchanged — signed does not mean secret.</MemoryTip>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Structure: Header.Payload.Signature</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          The signature is <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">HMAC-SHA256(base64url(header) + "." + base64url(payload), secret)</code>.
          Anyone can <em>read</em> the payload (it's just base64) — but nobody can <em>forge</em> or <em>modify</em> it without the secret.
          Never put passwords or sensitive data in a JWT payload.
        </p>
      </div>

      {/* Token picker */}
      <div className="flex gap-2">
        {(['valid', 'expired'] as const).map(k => (
          <button key={k} onClick={() => { setTokenKey(k); setActiveField(null) }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tokenKey === k
                ? k === 'valid' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {TOKENS[k].label}
          </button>
        ))}
      </div>

      <div className="viz-container p-5 space-y-5">
        {/* Token string */}
        <div>
          <div className="text-xs text-slate-500 mb-2 font-medium">Raw Token String</div>
          <div className="rounded-lg bg-slate-900 p-3 font-mono text-xs break-all leading-6">
            <span className="text-rose-400">{tok.header}</span>
            <span className="text-slate-500">.</span>
            <span className="text-violet-400">{tok.payload}</span>
            <span className="text-slate-500">.</span>
            <span className="text-amber-400">{tok.signature}</span>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-400 inline-block" /> Header</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-400 inline-block" /> Payload</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Signature</span>
          </div>
        </div>

        {/* Decoded */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Header */}
          <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 p-4">
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3">Header (decoded)</div>
            <div className="space-y-2">
              {Object.entries(tok.headerDecoded).map(([k, v]) => (
                <div key={k} onClick={() => setActiveField(activeField === k ? null : k)}
                  className={`flex items-start gap-2 rounded-lg p-2 cursor-pointer transition-all ${activeField === k ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400 w-10 flex-shrink-0">{k}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">"{v}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payload */}
          <div className={`rounded-xl border-2 p-4 ${isExpired ? 'border-rose-300 dark:border-rose-700' : 'border-violet-200 dark:border-violet-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Payload (decoded)</div>
              {isExpired && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold">EXPIRED</span>
              )}
            </div>
            <div className="space-y-2">
              {Object.entries(payloadDecoded).map(([k, v]) => {
                const isTs = k === 'iat' || k === 'exp'
                const isExpiredField = k === 'exp' && isExpired
                return (
                  <div key={k} onClick={() => setActiveField(activeField === k ? null : k)}
                    className={`flex items-start gap-2 rounded-lg p-2 cursor-pointer transition-all ${
                      activeField === k ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-300 dark:border-violet-700' :
                      isExpiredField ? 'bg-rose-50 dark:bg-rose-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                    <span className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400 w-12 flex-shrink-0">{k}</span>
                    <span className={`text-xs font-mono ${isExpiredField ? 'text-rose-600 dark:text-rose-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                      {isTs ? `${v} (${formatTimestamp(v as number)})` : `"${v}"`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Signature section */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 p-4">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Signature</div>
          <div className="font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
            HMAC-SHA256(base64url(header) + "." + base64url(payload), <span className="text-rose-500">SECRET_KEY</span>)
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            The signature binds the header and payload together. Changing even one character in the payload invalidates the signature — forgery is computationally impossible without the secret.
          </p>
        </div>

        {/* Field explanation */}
        {activeField && CLAIM_DOCS[activeField] && (
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mr-2">{activeField}:</span>
            <span className="text-xs text-indigo-700 dark:text-indigo-300">{CLAIM_DOCS[activeField]}</span>
          </div>
        )}

        {/* Status banner */}
        <div className={`rounded-xl p-3 text-center text-sm font-semibold ${
          isExpired
            ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
        }`}>
          {isExpired
            ? `✗ Token EXPIRED at ${formatTimestamp(payloadDecoded.exp)} — server returns 401`
            : `✓ Token VALID — user "${payloadDecoded.name}" authenticated as ${payloadDecoded.role}`}
        </div>
      </div>

      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
