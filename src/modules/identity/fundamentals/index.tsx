import { useState } from 'react'
import { Link } from 'react-router-dom'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import type { CodeExample } from '@/components/shared/CodeBlock'
import FlowDiagram, { Actor, FlowMsg, VariantPicker, StoryPanel, KeyIdea, InfoCards } from '../shared/FlowDiagram'

type Variant = 'session' | 'token' | 'sso'

interface Scenario {
  label: string
  story: string
  intro: string
  actors: Actor[]
  msgs: FlowMsg[]
}

const BROWSER: Actor = { id: 'browser', label: 'Browser', icon: '🧑‍💻', color: '#8b5cf6', sub: 'the user' }

const SCENARIOS: Record<Variant, Scenario> = {
  session: {
    label: 'Session cookie',
    story: 'A coat check. You hand over your coat (prove who you are once), the attendant keeps it in the back room and gives you a numbered ticket. The ticket itself is worthless — it only means something because the attendant\'s back room has a matching hook. Lose the ticket? The attendant can simply cancel that number.',
    intro: 'Classic server-side sessions: the server remembers you, the browser only carries a random ID.',
    actors: [BROWSER, { id: 'app', label: 'Web App', icon: '🖥️', color: '#0d9488', sub: 'shop.example' }, { id: 'store', label: 'Session Store', icon: '🗄️', color: '#f59e0b', sub: 'Redis / DB' }],
    msgs: [
      { from: 'browser', to: 'app', label: 'POST /login', channel: 'front', note: 'Authentication: the user proves who they are with something they know (password).', payload: 'POST /login\nContent-Type: application/x-www-form-urlencoded\n\nemail=asha@example.com&password=••••••••' },
      { from: 'app', to: 'app', label: 'bcrypt.compare()', channel: 'local', note: 'Never store passwords — store a slow salted hash (bcrypt/argon2) and compare against it.' },
      { from: 'app', to: 'store', label: 'SET sess:9f2c…', channel: 'back', note: 'Create a session record keyed by a long random ID. All the real state lives server-side.', payload: 'SET sess:9f2c71e0… \'{"userId":42,"roles":["customer"]}\' EX 1800' },
      { from: 'app', to: 'browser', label: 'Set-Cookie: sid', channel: 'front', note: 'The browser only gets the random ID. HttpOnly hides it from JavaScript (XSS), Secure forces HTTPS, SameSite blocks most CSRF.', payload: 'HTTP/1.1 302 Found\nLocation: /orders\nSet-Cookie: sid=9f2c71e0…; HttpOnly; Secure; SameSite=Lax; Max-Age=1800' },
      { from: 'browser', to: 'app', label: 'GET /orders + Cookie', channel: 'front', note: 'The browser automatically attaches the cookie to every request to this site.', payload: 'GET /orders\nCookie: sid=9f2c71e0…' },
      { from: 'app', to: 'store', label: 'GET sess:9f2c…', channel: 'back', note: 'One lookup per request turns the opaque ID back into "user 42".' },
      { from: 'app', to: 'app', label: 'authorize: owns order?', channel: 'local', note: 'Authorization is a separate question: user 42 is logged in — but may they see order #881? Check ownership/roles here.' },
      { from: 'app', to: 'browser', label: '200 orders', channel: 'front', note: 'Response rendered for user 42.' },
      { from: 'browser', to: 'app', label: 'POST /logout', channel: 'front', note: 'Logout deletes the record (DEL sess:9f2c…). The cookie is now a ticket for a hook that no longer exists — instant revocation, the big win of sessions.' },
    ],
  },
  token: {
    label: 'Bearer token',
    story: 'A wristband at a music festival. The gate checks your ID once and snaps on a tamper-proof band that says "Adult · VIP · Saturday". Every bar and stage just looks at the band — no phone call back to the gate. Fast and scalable… but a band can\'t be "cancelled" from afar; it simply stops working when Saturday ends.',
    intro: 'Stateless tokens: the server signs a statement about you and hands it over. Any service with the public key can verify it without a lookup.',
    actors: [{ id: 'client', label: 'Client', icon: '📱', color: '#8b5cf6', sub: 'SPA / mobile app' }, { id: 'auth', label: 'Auth Service', icon: '🔐', color: '#0d9488', sub: 'issues tokens' }, { id: 'api', label: 'Orders API', icon: '📦', color: '#f59e0b', sub: 'resource server' }],
    msgs: [
      { from: 'client', to: 'auth', label: 'POST /login', channel: 'back', note: 'Authenticate once against the auth service.' },
      { from: 'auth', to: 'auth', label: 'sign JWT (private key)', channel: 'local', note: 'The token carries the facts (claims) and a signature. Short lifetime limits damage if it leaks.', payload: '{\n  "iss": "https://auth.shop.example",\n  "sub": "42",\n  "aud": "orders-api",\n  "scope": "orders:read",\n  "exp": 1762780500   // 15 minutes\n}' },
      { from: 'auth', to: 'client', label: '{ access_token }', channel: 'back', note: 'Client stores the token (memory is safest for SPAs; secure storage on mobile).' },
      { from: 'client', to: 'api', label: 'Authorization: Bearer', channel: 'back', note: '"Bearer" means whoever holds it may use it — like cash. Always send it over HTTPS.', payload: 'GET /orders\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs…' },
      { from: 'api', to: 'api', label: 'verify sig + exp + aud', channel: 'local', note: 'The API checks the signature with the auth service\'s PUBLIC key, plus expiry and audience. No database call — that is why tokens scale across many services.' },
      { from: 'api', to: 'api', label: 'scope has orders:read?', channel: 'local', note: 'Authorization from the claims: the token proves who, the scope/role decides what.' },
      { from: 'api', to: 'client', label: '200 orders', channel: 'back', note: 'Done — and the auth service was never contacted. Trade-off: to revoke early you need short expiry + refresh tokens, or a deny-list.' },
    ],
  },
  sso: {
    label: 'Federated SSO',
    story: 'An international hotel chain. You show your passport at the first hotel and get a loyalty card. At every other hotel in the chain, the front desk just phones head office: "is this card good?" — "yes, that\'s Asha". You never show your passport again, and no individual hotel ever keeps a copy of it.',
    intro: 'Federation: apps stop handling passwords and trust a central Identity Provider (IdP). Log in once, and the IdP\'s own session silently logs you into the next app.',
    actors: [BROWSER, { id: 'wiki', label: 'Wiki App', icon: '📚', color: '#0d9488', sub: 'relying party' }, { id: 'idp', label: 'Company IdP', icon: '🏢', color: '#f59e0b', sub: 'Okta / Entra / Google' }, { id: 'chat', label: 'Chat App', icon: '💬', color: '#0ea5e9', sub: 'relying party' }],
    msgs: [
      { from: 'browser', to: 'wiki', label: 'GET /docs', channel: 'front', note: 'No local session at the Wiki yet.' },
      { from: 'wiki', to: 'browser', label: '302 → IdP', channel: 'front', note: 'Instead of showing its own password form, the Wiki redirects to the IdP (via OIDC or SAML).' },
      { from: 'browser', to: 'idp', label: 'login: password + MFA', channel: 'front', note: 'The ONLY place the password is ever typed. The IdP also sets its own session cookie on idp.company.com.', payload: 'Set-Cookie: idp_session=…; Domain=idp.company.com; HttpOnly; Secure' },
      { from: 'idp', to: 'browser', label: '302 → Wiki + proof', channel: 'front', note: 'IdP sends the browser back with a signed proof of identity (an OIDC code / SAML assertion).' },
      { from: 'browser', to: 'wiki', label: 'deliver proof', channel: 'front', note: 'Wiki verifies the proof and creates its own local session. Asha is in.' },
      { from: 'browser', to: 'chat', label: 'GET /channels', channel: 'front', note: 'Later, Asha opens Chat — a completely different app with no session.' },
      { from: 'chat', to: 'browser', label: '302 → IdP', channel: 'front', note: 'Chat also redirects to the same IdP.' },
      { from: 'browser', to: 'idp', label: 'idp_session cookie', channel: 'front', note: 'The browser carries the IdP\'s cookie. IdP: "I already know you" — no password prompt. THIS is single sign-on.' },
      { from: 'idp', to: 'browser', label: '302 → Chat + proof', channel: 'front', note: 'Instant redirect back with a fresh proof for Chat.' },
      { from: 'browser', to: 'chat', label: 'deliver proof', channel: 'front', note: 'Logged into Chat without typing anything. Disable Asha at the IdP and she loses access everywhere at once.' },
    ],
  },
}

const CODE: Record<Variant, CodeExample[]> = {
  session: [
    { lang: 'javascript', label: 'Node (express-session)', code: `import express from 'express'
import session from 'express-session'
import RedisStore from 'connect-redis'
import bcrypt from 'bcrypt'

const app = express()
app.use(session({
  store: new RedisStore({ client: redis }),   // state lives server-side
  secret: process.env.SESSION_SECRET,          // signs the cookie value
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 30 * 60_000 },
  resave: false,
  saveUninitialized: false,
}))

app.post('/login', async (req, res) => {
  const user = await db.users.findByEmail(req.body.email)
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    return res.status(401).send('Invalid credentials')
  req.session.regenerate(() => {           // new ID on login: blocks session fixation
    req.session.userId = user.id
    res.redirect('/orders')
  })
})

// AuthN middleware: who are you?
const requireLogin = (req, res, next) => req.session.userId ? next() : res.redirect('/login')

app.get('/orders/:id', requireLogin, async (req, res) => {
  const order = await db.orders.get(req.params.id)
  // AuthZ: may YOU see THIS order?
  if (order.userId !== req.session.userId) return res.sendStatus(403)
  res.json(order)
})

app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/')))` },
    { lang: 'python', label: 'Python (Flask)', code: `from flask import Flask, session, request, redirect, abort
from flask_session import Session          # server-side session store
from werkzeug.security import check_password_hash

app = Flask(__name__)
app.config.update(
    SESSION_TYPE="redis",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=1800,
)
Session(app)

@app.post("/login")
def login():
    user = db.find_user(request.form["email"])
    if not user or not check_password_hash(user.password_hash, request.form["password"]):
        abort(401)
    session.clear()                  # fresh session on login
    session["user_id"] = user.id
    return redirect("/orders")

@app.get("/orders/<int:order_id>")
def get_order(order_id):
    if "user_id" not in session:     # authentication
        return redirect("/login")
    order = db.get_order(order_id)
    if order.user_id != session["user_id"]:   # authorization
        abort(403)
    return order.to_dict()

@app.post("/logout")
def logout():
    session.clear()                  # record deleted server-side = instant revoke
    return redirect("/")` },
    { lang: 'java', label: 'Java (Spring Security)', code: `@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login", "/css/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")   // authorization rule
                .anyRequest().authenticated())                   // authentication rule
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/orders"))
            .sessionManagement(s -> s
                .sessionFixation().newSession()                  // new JSESSIONID on login
                .maximumSessions(3))
            .logout(l -> l.logoutUrl("/logout").invalidateHttpSession(true));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}

@RestController
class OrderController {
    @GetMapping("/orders/{id}")
    Order get(@PathVariable long id, @AuthenticationPrincipal UserDetails me) {
        Order o = orders.findById(id).orElseThrow();
        if (!o.owner().equals(me.getUsername())) throw new AccessDeniedException("not yours");
        return o;
    }
}` },
  ],
  token: [
    { lang: 'javascript', label: 'Node (jose)', code: `import { SignJWT, jwtVerify, importPKCS8, createRemoteJWKSet } from 'jose'

// ── Auth service: issue a short-lived signed token ───────────────
const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256')

export async function issueToken(user) {
  return new SignJWT({ scope: 'orders:read' })
    .setProtectedHeader({ alg: 'RS256', kid: 'key-2026-11' })
    .setIssuer('https://auth.shop.example')
    .setSubject(String(user.id))
    .setAudience('orders-api')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey)
}

// ── Orders API: verify with the PUBLIC key, no DB lookup ──────────
const JWKS = createRemoteJWKSet(new URL('https://auth.shop.example/.well-known/jwks.json'))

export async function requireScope(scope) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '')
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: 'https://auth.shop.example',
        audience: 'orders-api',          // reject tokens meant for other APIs
      })
      if (!payload.scope?.split(' ').includes(scope)) return res.sendStatus(403)
      req.user = { id: payload.sub }
      next()
    } catch {
      res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').end()
    }
  }
}` },
    { lang: 'python', label: 'Python (PyJWT)', code: `import time, jwt
from jwt import PyJWKClient
from functools import wraps
from flask import request, abort, g

# ── Auth service ─────────────────────────────────────────────────
def issue_token(user, private_key):
    now = int(time.time())
    claims = {
        "iss": "https://auth.shop.example",
        "sub": str(user.id),
        "aud": "orders-api",
        "scope": "orders:read",
        "iat": now,
        "exp": now + 15 * 60,          # short-lived
    }
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "key-2026-11"})

# ── Orders API ───────────────────────────────────────────────────
jwks = PyJWKClient("https://auth.shop.example/.well-known/jwks.json")

def require_scope(scope):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = request.headers.get("Authorization", "").removeprefix("Bearer ")
            try:
                key = jwks.get_signing_key_from_jwt(token).key
                claims = jwt.decode(token, key, algorithms=["RS256"],   # pin the alg!
                                    audience="orders-api",
                                    issuer="https://auth.shop.example")
            except jwt.PyJWTError:
                abort(401)
            if scope not in claims.get("scope", "").split():
                abort(403)
            g.user_id = claims["sub"]
            return fn(*args, **kwargs)
        return wrapper
    return deco` },
    { lang: 'java', label: 'Java (Spring Resource Server)', code: `// application.yml
// spring.security.oauth2.resourceserver.jwt:
//   issuer-uri: https://auth.shop.example
//   audiences: orders-api

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class ApiSecurity {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                    // no cookies → no CSRF
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/orders/**").hasAuthority("SCOPE_orders:read")
                .anyRequest().authenticated())
            .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()));
            // Spring fetches the JWKS, checks signature, iss, exp and aud for you
        return http.build();
    }
}

@RestController
class OrderController {
    @GetMapping("/orders")
    List<Order> mine(@AuthenticationPrincipal Jwt jwt) {
        return orders.findByOwner(jwt.getSubject());     // sub claim = user id
    }
}` },
  ],
  sso: [
    { lang: 'javascript', label: 'Node (app side)', code: `// Every app in an SSO setup does the same tiny thing:
// "no local session? → send them to the IdP"
import { Issuer, generators } from 'openid-client'

const idp = await Issuer.discover('https://idp.company.com')
const client = new idp.Client({
  client_id: 'wiki',
  client_secret: process.env.WIKI_SECRET,
  redirect_uris: ['https://wiki.company.com/callback'],
})

app.use(async (req, res, next) => {
  if (req.session.user || req.path === '/callback') return next()
  const state = generators.state()
  req.session.state = state
  req.session.returnTo = req.originalUrl
  // If the IdP already has a session (idp_session cookie) the user
  // bounces straight back here — no password prompt. That's SSO.
  res.redirect(client.authorizationUrl({ scope: 'openid email', state }))
})

app.get('/callback', async (req, res) => {
  const params = client.callbackParams(req)
  const tokens = await client.callback('https://wiki.company.com/callback', params, { state: req.session.state })
  req.session.user = tokens.claims()       // local session for THIS app
  res.redirect(req.session.returnTo ?? '/')
})` },
    { lang: 'python', label: 'Python (Authlib)', code: `from authlib.integrations.flask_client import OAuth
from flask import Flask, session, redirect, request, url_for

app = Flask(__name__)
oauth = OAuth(app)
oauth.register(
    name="idp",
    server_metadata_url="https://idp.company.com/.well-known/openid-configuration",
    client_id="chat",
    client_secret=CHAT_SECRET,
    client_kwargs={"scope": "openid email profile"},
)

@app.before_request
def require_sso():
    if "user" in session or request.endpoint in ("callback", "static"):
        return
    session["return_to"] = request.full_path
    # Redirect to the shared IdP; it silently re-uses its own session
    return oauth.idp.authorize_redirect(url_for("callback", _external=True))

@app.get("/callback")
def callback():
    token = oauth.idp.authorize_access_token()   # validates state + ID token
    session["user"] = token["userinfo"]          # local session for THIS app
    return redirect(session.pop("return_to", "/"))` },
    { lang: 'java', label: 'Java (Spring Boot)', code: `// application.yml — the whole SSO integration is mostly config:
// spring.security.oauth2.client:
//   registration.company:
//     client-id: wiki
//     client-secret: \${WIKI_SECRET}
//     scope: openid,email,profile
//   provider.company:
//     issuer-uri: https://idp.company.com

@Configuration
public class SsoConfig {
    @Bean
    SecurityFilterChain sso(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(a -> a.anyRequest().authenticated())
            .oauth2Login(Customizer.withDefaults())        // unauthenticated → 302 to IdP
            .logout(l -> l.logoutSuccessHandler(oidcLogout())); // also end IdP session
        return http.build();
    }

    @Bean
    LogoutSuccessHandler oidcLogout() {
        var h = new OidcClientInitiatedLogoutSuccessHandler(clientRegistrations);
        h.setPostLogoutRedirectUri("{baseUrl}");
        return h;
    }
}` },
  ],
}

const DOUBTS: Record<Variant, { q: string; a: string }[]> = {
  session: [
    { q: 'Authentication vs authorization — what is the actual difference?', a: '**Authentication (AuthN)** answers "who are you?" — password, passkey, SSO. It ends with a known identity like `user 42`.\n**Authorization (AuthZ)** answers "what may you do?" — roles, scopes, ownership checks. It runs on EVERY request, after authentication. A logged-in user getting `403 Forbidden` is AuthN passing and AuthZ failing; `401 Unauthorized` (badly named) actually means "not authenticated".' },
    { q: 'Are sessions outdated now that everyone uses JWTs?', a: 'No. For a classic web app talking to its own backend, a server-side session with an `HttpOnly` cookie is often the **safest** choice: tokens are not exposed to JavaScript, and logout/revocation is instant. Tokens shine when many independent services must verify identity without a shared store, or when the caller is not a browser (mobile apps, other services).' },
    { q: 'Why regenerate the session ID on login?', a: 'Session fixation: an attacker plants a known session ID in the victim\'s browser before login. If the server keeps the same ID after login, the attacker\'s copy is now authenticated too. Issuing a fresh ID at every privilege change closes that hole.' },
  ],
  token: [
    { q: 'If the API never calls the auth service, how do I log someone out?', a: 'You can\'t "un-sign" a token. Common answers: (1) keep access tokens short (5–15 min) and revoke the **refresh token**; (2) keep a small deny-list of revoked `jti` values the API checks; (3) use opaque tokens + **introspection** (RFC 7662) where the API asks the auth server each time — trading scalability for instant revocation.' },
    { q: 'Where should a browser app store a token?', a: 'In order of safety: (1) don\'t — use a backend-for-frontend (BFF) that keeps tokens server-side and gives the browser an `HttpOnly` session cookie; (2) in memory only (lost on refresh, re-obtained silently); (3) `localStorage` is readable by any injected script, so a single XSS steals every token.' },
    { q: 'Is a JWT encrypted?', a: 'Usually not — a JWS is just **signed**, and its payload is base64url, readable by anyone. Never put secrets in claims. The signature guarantees integrity ("nobody changed this"), not confidentiality. See the JWT module for a live decoder.' },
  ],
  sso: [
    { q: 'Is SSO the same as OAuth?', a: 'SSO is the **experience** (log in once, use many apps). It is built on a **federation protocol**: OpenID Connect (modern, JSON/JWT, built on OAuth 2.0) or SAML 2.0 (older, XML, still dominant in enterprises). OAuth 2.0 on its own is about delegated API access, not login.' },
    { q: 'If I log out of one app, am I logged out of all of them?', a: 'Not automatically. Each app has its own local session and the IdP has one too. Logging out of the Wiki only kills the Wiki session — Chat stays logged in, and the IdP would silently log you back into the Wiki. True "single logout" needs extra protocol work: OIDC RP-initiated / back-channel logout, or SAML Single Logout.' },
    { q: 'What are SCIM and JIT provisioning?', a: 'Federation tells an app WHO is logging in, but the app often needs an account to exist first. **JIT (just-in-time)** creates the local account on first SSO login from the claims. **SCIM 2.0** is a REST standard (`POST /Users`, `PATCH /Users/{id}`) the IdP uses to create, update and — crucially — **deactivate** accounts in every app the moment HR offboards someone.' },
  ],
}

const STANDARDS = [
  { q: 'Can this app call an API on my behalf?', std: 'OAuth 2.0', note: 'Delegated authorization with scoped access tokens', to: '/identity/oauth2' },
  { q: 'Who is this user? (Sign in with …)', std: 'OpenID Connect', note: 'Identity layer on OAuth 2.0 — the ID token', to: '/identity/oidc' },
  { q: 'Enterprise SSO into a SaaS app', std: 'SAML 2.0', note: 'Signed XML assertions via browser POST', to: '/identity/saml' },
  { q: 'Can we drop passwords entirely?', std: 'WebAuthn / Passkeys', note: 'Public-key login bound to the real website', to: '/identity/passkeys' },
  { q: 'What format is that token in?', std: 'JWT (RFC 7519)', note: 'Signed JSON claims — header.payload.signature', to: '/essentials/jwt' },
  { q: 'Create/disable accounts across apps', std: 'SCIM 2.0', note: 'REST API for user provisioning & deprovisioning', to: null },
  { q: 'Second factor beyond a password', std: 'MFA · TOTP (RFC 6238)', note: 'Authenticator-app codes, push, or a passkey', to: null },
  { q: 'Corporate directory & Windows login', std: 'LDAP · Kerberos', note: 'The on-prem ancestors behind Active Directory', to: null },
]

const ROLES = [
  { role: 'The user', oauth: 'Resource Owner', oidc: 'End-User', saml: 'Principal / Subject' },
  { role: 'The app you\'re using', oauth: 'Client', oidc: 'Relying Party (RP)', saml: 'Service Provider (SP)' },
  { role: 'Who checks identity & issues tokens', oauth: 'Authorization Server', oidc: 'OpenID Provider (OP)', saml: 'Identity Provider (IdP)' },
  { role: 'Where the data lives', oauth: 'Resource Server (API)', oidc: '— (UserInfo endpoint)', saml: '—' },
]

export default function IdentityFundamentals() {
  const [variant, setVariant] = useState<Variant>('session')
  const sc = SCENARIOS[variant]
  const ctrl = useSteps(sc.msgs.length + 1)

  const pick = (v: Variant) => { setVariant(v); ctrl.reset() }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Identity Fundamentals</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Authentication vs authorization, sessions vs tokens, and how federation lets one login open many doors
        </p>
      </div>

      <StoryPanel>
        <p>
          Checking into a hotel. At the front desk you show your passport — they confirm <strong>who you are</strong>.
          Then they hand you a key card that opens room 512 and the gym, but not the staff kitchen — that’s <strong>what
          you’re allowed to do</strong>. The card stops working at checkout. And at a sister hotel in the same chain, your
          loyalty card is enough: they trust head office instead of asking for your passport again.
        </p>
        <p>
          Passport check = <strong>authentication</strong>. Key card permissions = <strong>authorization</strong>.
          Card expiry = <strong>token lifetime</strong>. Trusting head office = <strong>federation / SSO</strong>.
        </p>
      </StoryPanel>

      <MemoryTip>AuthN = "who are you?" (401 if unknown). AuthZ = "what may you do?" (403 if not allowed). Always in that order.</MemoryTip>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4">
          <h3 className="font-semibold text-violet-800 dark:text-violet-300 text-sm">🪪 Authentication (AuthN)</h3>
          <ul className="mt-2 text-xs text-violet-700 dark:text-violet-300 space-y-1 list-disc pl-4">
            <li>Proves identity: something you <em>know</em> (password), <em>have</em> (phone, security key), or <em>are</em> (fingerprint)</li>
            <li>Happens once per login, produces a session or token</li>
            <li>Standards: OpenID Connect, SAML, WebAuthn, TOTP</li>
            <li>Failure → <code>401 Unauthorized</code></li>
          </ul>
        </div>
        <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-4">
          <h3 className="font-semibold text-teal-800 dark:text-teal-300 text-sm">🔑 Authorization (AuthZ)</h3>
          <ul className="mt-2 text-xs text-teal-700 dark:text-teal-300 space-y-1 list-disc pl-4">
            <li>Decides access: roles (RBAC), attributes (ABAC), ownership, scopes</li>
            <li>Happens on every single request</li>
            <li>Standards: OAuth 2.0 scopes, policy engines (OPA, Cedar)</li>
            <li>Failure → <code>403 Forbidden</code></li>
          </ul>
        </div>
      </div>

      <KeyIdea title="Same cast, different names">
        <p>Every identity standard has the same four characters — they just rename them. Learn the roles once:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-1 min-w-[520px]">
            <thead>
              <tr className="text-left text-emerald-900 dark:text-emerald-200">
                <th className="py-1 pr-3">Role</th><th className="py-1 pr-3">OAuth 2.0</th><th className="py-1 pr-3">OpenID Connect</th><th className="py-1">SAML 2.0</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.role} className="border-t border-emerald-200 dark:border-emerald-800">
                  <td className="py-1.5 pr-3 font-medium">{r.role}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.oauth}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.oidc}</td>
                  <td className="py-1.5 font-mono">{r.saml}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </KeyIdea>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Three ways to stay logged in</h2>
        <VariantPicker options={(Object.keys(SCENARIOS) as Variant[]).map(id => ({ id, label: SCENARIOS[id].label }))} value={variant} onChange={pick} />
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
          {sc.story}
        </div>
      </div>

      <FlowDiagram actors={sc.actors} msgs={sc.msgs} step={ctrl.step} intro={sc.intro} />
      <StepControls ctrl={ctrl} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Which standard answers which question?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STANDARDS.map(s => {
            const body = (
              <>
                <div className="text-xs text-slate-500 dark:text-slate-400">{s.q}</div>
                <div className="font-semibold text-sm text-teal-700 dark:text-teal-300 mt-0.5">{s.std}{s.to && ' →'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.note}</div>
              </>
            )
            const cls = 'block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3'
            return s.to
              ? <Link key={s.std} to={s.to} className={`${cls} hover:border-teal-400 transition-colors`}>{body}</Link>
              : <div key={s.std} className={cls}>{body}</div>
          })}
        </div>
      </div>

      <InfoCards cards={[
        { title: 'Sessions: stateful', body: 'Server stores the state, browser holds a random ID in an HttpOnly cookie. Instant logout; needs a shared session store when you scale out.' },
        { title: 'Tokens: stateless', body: 'Server signs the state and hands it over. Any service can verify with a public key. Scales effortlessly; revocation needs short expiry or extra machinery.' },
        { title: 'Federation', body: 'Apps outsource authentication to an IdP they trust. Fewer password databases to breach, one place for MFA, one switch to offboard someone.' },
        { title: 'Least privilege', body: 'Grant the smallest scope/role that works, for the shortest time. A leaked read-only 15-minute token is an incident; a leaked admin forever-token is a headline.' },
      ]} />

      <CodeTabs examples={CODE[variant]} doubts={DOUBTS[variant]} />
    </div>
  )
}
