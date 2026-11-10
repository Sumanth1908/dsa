import { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import type { CodeExample } from '@/components/shared/CodeBlock'
import FlowDiagram, { Actor, FlowMsg, StoryPanel, KeyIdea, InfoCards } from '../shared/FlowDiagram'

const ACTORS: Actor[] = [
  { id: 'browser', label: 'Browser', icon: '🧑‍💻', color: '#8b5cf6', sub: 'end-user' },
  { id: 'rp', label: 'Relying Party', icon: '📝', color: '#0ea5e9', sub: 'NoteNest app' },
  { id: 'op', label: 'OpenID Provider', icon: '🔐', color: '#0d9488', sub: 'accounts.google.com' },
]

const MSGS: FlowMsg[] = [
  { from: 'rp', to: 'op', label: 'GET /.well-known/openid-configuration', channel: 'back', note: 'Discovery: the app learns every endpoint and capability from one well-known URL (fetched once and cached). No hard-coded URLs.', payload: '{\n  "issuer": "https://accounts.google.com",\n  "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",\n  "token_endpoint": "https://oauth2.googleapis.com/token",\n  "userinfo_endpoint": "https://openidconnect.googleapis.com/v1/userinfo",\n  "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",\n  "scopes_supported": ["openid", "email", "profile"],\n  "id_token_signing_alg_values_supported": ["RS256"],\n  "code_challenge_methods_supported": ["plain", "S256"]\n}' },
  { from: 'browser', to: 'rp', label: 'Sign in with Google', channel: 'front', note: 'Asha clicks the button.' },
  { from: 'rp', to: 'browser', label: '302 → /authorize  scope=openid', channel: 'front', note: 'This is an OAuth authorization-code request with two extras: the `openid` scope (which turns it into OIDC) and a random `nonce` that will be echoed inside the ID token.', payload: 'Location: https://accounts.google.com/o/oauth2/v2/auth\n  ?response_type=code\n  &client_id=notenest.apps.googleusercontent.com\n  &redirect_uri=https://notenest.app/auth/callback\n  &scope=openid%20email%20profile\n  &state=xyz123\n  &nonce=n-0S6_WzA2Mj\n  &code_challenge=E9Melhoa2Ow…&code_challenge_method=S256' },
  { from: 'browser', to: 'op', label: 'authenticate + consent', channel: 'front', note: 'The OP authenticates Asha however it likes (password, passkey, MFA) — the app never sees credentials. Consent: "NoteNest wants your name, email and picture."' },
  { from: 'op', to: 'browser', label: '302 → callback?code&state', channel: 'front', note: 'Same as OAuth: a one-time code via the front channel.' },
  { from: 'browser', to: 'rp', label: 'GET /auth/callback', channel: 'front', note: 'App checks state.' },
  { from: 'rp', to: 'op', label: 'POST /token', channel: 'back', note: 'Code + code_verifier + client authentication, on the back channel.' },
  { from: 'op', to: 'rp', label: '{ id_token, access_token }', channel: 'back', note: 'The OIDC addition: an ID token — a signed JWT about the authentication event, addressed TO THIS APP (aud = client_id). The access token is still for APIs.', payload: '{\n  "access_token": "ya29.a0AfH6SM…",\n  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.eyJpc3MiOi…",\n  "token_type": "Bearer",\n  "expires_in": 3599,\n  "scope": "openid email profile"\n}' },
  { from: 'rp', to: 'op', label: 'GET jwks_uri (cached)', channel: 'back', note: 'Fetch the OP\'s public keys. The ID token header\'s `kid` picks which key signed it. Keys rotate, so cache with a TTL and re-fetch on unknown kid.', payload: '{\n  "keys": [\n    { "kty": "RSA", "kid": "1e9gdk7", "alg": "RS256", "use": "sig",\n      "n": "w7Zdfmece8iaB0kiTY8pCtiBtzbptJmP28nSWwtdjRu0f2GFpajvWE4VhfJA…",\n      "e": "AQAB" }\n  ]\n}' },
  { from: 'rp', to: 'rp', label: 'validate ID token', channel: 'local', note: 'Signature (with that JWKS key), iss, aud, exp, iat, nonce. Try the validation lab below to see each check catch an attack.' },
  { from: 'rp', to: 'rp', label: 'session for sub=1104…', channel: 'local', note: 'Key the user by (iss, sub) — never by email, which can change or be re-assigned. Then create the app\'s own session cookie. Asha is logged in.' },
  { from: 'rp', to: 'op', label: 'GET /userinfo  Bearer', channel: 'back', note: 'Optional: fetch more profile claims with the access token. The response sub MUST equal the ID token\'s sub.', payload: 'GET /v1/userinfo\nAuthorization: Bearer ya29.a0AfH6SM…\n\n{\n  "sub": "110248495921238986420",\n  "name": "Asha Rao",\n  "email": "asha@gmail.com",\n  "email_verified": true,\n  "picture": "https://lh3.googleusercontent.com/a/…"\n}' },
]

interface Claim { key: string; value: string; meaning: string; check?: string }

const CLAIMS: Claim[] = [
  { key: 'iss', value: '"https://accounts.google.com"', meaning: 'Issuer — who minted this token.', check: 'Must exactly equal the issuer from discovery.' },
  { key: 'sub', value: '"110248495921238986420"', meaning: 'Subject — a stable, unique ID for the user at this issuer. Never re-assigned.', check: 'Use (iss, sub) as the user\'s primary key.' },
  { key: 'aud', value: '"notenest.apps.googleusercontent.com"', meaning: 'Audience — who this token is FOR. It\'s your client_id.', check: 'Must contain your client_id. Otherwise it was minted for another app.' },
  { key: 'exp', value: '1762781400', meaning: 'Expiry (Unix seconds).', check: 'Must be in the future (allow ~1–2 min clock skew).' },
  { key: 'iat', value: '1762777800', meaning: 'Issued at.', check: 'Reject tokens issued unreasonably long ago.' },
  { key: 'nonce', value: '"n-0S6_WzA2Mj"', meaning: 'The random value your app put in the authorize request, echoed back.', check: 'Must equal the nonce stored in this browser\'s session — blocks replay.' },
  { key: 'auth_time', value: '1762777795', meaning: 'When the user actually authenticated (may be earlier than iat with SSO).', check: 'Check against max_age if you required a recent login.' },
  { key: 'amr', value: '["pwd", "mfa"]', meaning: 'Authentication methods used.', check: 'Require "mfa" for sensitive apps (if your OP provides it).' },
  { key: 'email', value: '"asha@gmail.com"', meaning: 'Profile claim from the `email` scope.' },
  { key: 'email_verified', value: 'true', meaning: 'The OP verified the address.', check: 'Never link accounts by an unverified email.' },
  { key: 'name', value: '"Asha Rao"', meaning: 'Profile claim from the `profile` scope.' },
]

type Scenario = 'valid' | 'forged' | 'issuer' | 'audience' | 'expired' | 'nonce'

const CHECKS = [
  { id: 'sig', label: 'Signature valid with JWKS key for kid', fails: 'forged' },
  { id: 'iss', label: 'iss === discovered issuer', fails: 'issuer' },
  { id: 'aud', label: 'aud contains my client_id', fails: 'audience' },
  { id: 'exp', label: 'exp > now (− skew)', fails: 'expired' },
  { id: 'nonce', label: 'nonce === session nonce', fails: 'nonce' },
] as const

const SCENARIOS: { id: Scenario; label: string; story: string; diff: string }[] = [
  { id: 'valid', label: '✅ Legit login', story: 'A normal token straight from Google for NoteNest.', diff: '' },
  { id: 'forged', label: '🖋️ Forged token', story: 'An attacker edits sub to the CEO\'s ID and re-encodes the payload — or sets alg to "none". The signature no longer verifies with Google\'s public key.', diff: '"sub": "000000000000000000001"   // edited\nheader.alg: "none"' },
  { id: 'issuer', label: '🏴 Wrong issuer', story: 'A token signed by an attacker-controlled OP that your multi-provider app also happens to trust for something else.', diff: '"iss": "https://evil-idp.example"' },
  { id: 'audience', label: '🎯 Wrong audience', story: 'A shady quiz app you also signed into with Google forwards YOUR genuine ID token to NoteNest to log in as you. Signature is valid — but it was issued for the quiz app.', diff: '"aud": "quiz-app.apps.googleusercontent.com"' },
  { id: 'expired', label: '⌛ Expired', story: 'A token lifted from old logs, replayed hours later.', diff: '"exp": 1762700000   // yesterday' },
  { id: 'nonce', label: '🔁 Replayed (nonce)', story: 'A valid, recent token captured from someone else\'s login is injected into your callback. Its nonce doesn\'t match the one stored in YOUR session.', diff: '"nonce": "a1b2c3-from-another-session"' },
]

function ValidationLab() {
  const [scn, setScn] = useState<Scenario>('valid')
  const s = SCENARIOS.find(x => x.id === scn)!
  const failIdx = CHECKS.findIndex(c => c.fails === scn)

  return (
    <div className="viz-container p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">🧪 ID token validation lab</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pick an attack. The checks run top to bottom and the first failure rejects the login.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(x => (
          <button key={x.id} onClick={() => setScn(x.id)} aria-pressed={scn === x.id}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${scn === x.id ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'}`}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{s.story}</p>
      {s.diff && <pre className="text-xs font-mono bg-slate-950 text-rose-300 rounded-lg p-3 overflow-x-auto whitespace-pre">{s.diff}</pre>}
      <ol className="space-y-1.5">
        {CHECKS.map((c, i) => {
          const state = failIdx === -1 || i < failIdx ? 'pass' : i === failIdx ? 'fail' : 'skip'
          return (
            <li key={c.id} className={`flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 border ${
              state === 'pass' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                : state === 'fail' ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'}`}>
              <span>{state === 'pass' ? '✓' : state === 'fail' ? '✗' : '·'}</span>
              <span className="font-mono text-xs">{c.label}</span>
            </li>
          )
        })}
      </ol>
      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${failIdx === -1 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'}`}>
        {failIdx === -1 ? '✅ All checks passed — create a session for (iss, sub).' : `⛔ Login rejected at check ${failIdx + 1}. Skipping that one check is exactly how real account-takeover bugs happen.`}
      </div>
    </div>
  )
}

function ClaimInspector() {
  const [sel, setSel] = useState('aud')
  const c = CLAIMS.find(x => x.key === sel)!
  return (
    <div className="viz-container p-4 sm:p-6 space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">🔍 Inside the ID token — click a claim</h3>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <pre className="text-xs font-mono bg-slate-950 text-slate-300 rounded-lg p-3 overflow-x-auto whitespace-pre">
          <span className="text-slate-500">{'// header: { "alg": "RS256", "kid": "1e9gdk7", "typ": "JWT" }\n'}</span>
          {'{\n'}
          {CLAIMS.map((x, i) => (
            <span key={x.key}>
              {'  '}
              <button onClick={() => setSel(x.key)} className={`rounded px-0.5 ${sel === x.key ? 'bg-teal-600 text-white' : x.check ? 'text-sky-300 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800'}`}>
                "{x.key}"
              </button>
              {`: `}<span className="text-emerald-300">{x.value}</span>{i < CLAIMS.length - 1 ? ',' : ''}{'\n'}
            </span>
          ))}
          {'}'}
        </pre>
        <div className="space-y-2">
          <div className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">{c.key}</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{c.meaning}</p>
          {c.check && (
            <p className="text-sm rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3 py-2">
              <strong>Your app must:</strong> {c.check}
            </p>
          )}
          <p className="text-[11px] text-slate-400">Blue claims carry a security check; grey ones are just profile data.</p>
        </div>
      </div>
    </div>
  )
}

const CODE: CodeExample[] = [
  { lang: 'javascript', label: 'Node (openid-client)', code: `import { Issuer, generators } from 'openid-client'

// Discovery: endpoints + JWKS from /.well-known/openid-configuration
const google = await Issuer.discover('https://accounts.google.com')
const client = new google.Client({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uris: ['https://notenest.app/auth/callback'],
  response_types: ['code'],
})

app.get('/auth/login', (req, res) => {
  const code_verifier = generators.codeVerifier()
  const state = generators.state()
  const nonce = generators.nonce()
  req.session.oidc = { code_verifier, state, nonce }

  res.redirect(client.authorizationUrl({
    scope: 'openid email profile',          // "openid" = this is OIDC
    state,
    nonce,
    code_challenge: generators.codeChallenge(code_verifier),
    code_challenge_method: 'S256',
  }))
})

app.get('/auth/callback', async (req, res) => {
  const { code_verifier, state, nonce } = req.session.oidc
  const params = client.callbackParams(req)
  // callback() exchanges the code AND validates the ID token:
  // signature (JWKS), iss, aud, exp, iat, nonce, state
  const tokenSet = await client.callback('https://notenest.app/auth/callback', params,
    { code_verifier, state, nonce })

  const claims = tokenSet.claims()
  const user = await db.users.upsert({ iss: claims.iss, sub: claims.sub },  // key by iss+sub
    { email: claims.email_verified ? claims.email : null, name: claims.name })

  req.session.regenerate(() => {
    req.session.userId = user.id
    res.redirect('/notes')
  })
})` },
  { lang: 'python', label: 'Python (Authlib + Flask)', code: `from authlib.integrations.flask_client import OAuth
from flask import Flask, session, redirect, url_for

app = Flask(__name__)
oauth = OAuth(app)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    client_kwargs={"scope": "openid email profile", "code_challenge_method": "S256"},
)

@app.get("/auth/login")
def login():
    # Authlib generates and stores state, nonce and the PKCE verifier
    return oauth.google.authorize_redirect(url_for("callback", _external=True))

@app.get("/auth/callback")
def callback():
    # Exchanges the code and validates the ID token
    # (signature via JWKS, iss, aud, exp, nonce)
    token = oauth.google.authorize_access_token()
    claims = token["userinfo"]                      # parsed, validated ID token claims

    user = db.upsert_user(iss=claims["iss"], sub=claims["sub"],
                          email=claims["email"] if claims.get("email_verified") else None,
                          name=claims.get("name"))
    session.clear()
    session["user_id"] = user.id
    return redirect("/notes")


# --- What "validate the ID token" means, by hand, with PyJWT ---
import jwt
jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")

def validate_id_token(id_token: str, expected_nonce: str) -> dict:
    key = jwks.get_signing_key_from_jwt(id_token).key       # pick key by kid
    claims = jwt.decode(
        id_token, key,
        algorithms=["RS256"],                               # never accept "none"
        audience=GOOGLE_CLIENT_ID,                          # aud check
        issuer="https://accounts.google.com",               # iss check
        leeway=60,                                          # exp/iat clock skew
    )
    if claims.get("nonce") != expected_nonce:
        raise ValueError("nonce mismatch — possible replay")
    return claims` },
  { lang: 'java', label: 'Java (Spring Security)', code: `// application.yml — Spring knows Google's issuer; others use issuer-uri
// spring.security.oauth2.client.registration.google:
//   client-id: \${GOOGLE_CLIENT_ID}
//   client-secret: \${GOOGLE_CLIENT_SECRET}
//   scope: openid,email,profile

@Configuration
@EnableWebSecurity
public class OidcLoginConfig {
    @Bean
    SecurityFilterChain chain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(a -> a
                .requestMatchers("/", "/public/**").permitAll()
                .anyRequest().authenticated())
            // oauth2Login with "openid" scope = OIDC:
            // discovery, state, nonce, PKCE, ID-token validation (JWKS, iss, aud, exp, nonce)
            .oauth2Login(o -> o.userInfoEndpoint(u -> u.oidcUserService(oidcUserService())));
        return http.build();
    }

    @Bean
    OidcUserService oidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return new OidcUserService() {
            @Override
            public OidcUser loadUser(OidcUserRequest req) {
                OidcUser user = delegate.loadUser(req);
                // Key by (iss, sub), not email
                users.upsert(user.getIssuer().toString(), user.getSubject(),
                             Boolean.TRUE.equals(user.getEmailVerified()) ? user.getEmail() : null);
                return user;
            }
        };
    }
}

@RestController
class MeController {
    @GetMapping("/me")
    Map<String, Object> me(@AuthenticationPrincipal OidcUser user) {
        return Map.of("sub", user.getSubject(), "name", user.getFullName(),
                      "authTime", user.getAuthenticatedAt());
    }
}` },
]

const DOUBTS = [
  { q: 'ID token vs access token — which one do I send to my API?', a: 'The **access token**. The ID token is a receipt for the CLIENT saying "this user just authenticated here" (`aud` = your client_id). The access token is for the RESOURCE SERVER (`aud` = the API). Sending ID tokens to APIs, or reading identity out of access tokens in the client, mixes up the audiences and opens token-substitution attacks.' },
  { q: 'What does OIDC add on top of OAuth 2.0, exactly?', a: 'Four things: (1) the `openid` scope, which signals "I want authentication"; (2) the **ID token** — a signed JWT with standard claims (`iss`, `sub`, `aud`, `exp`, `nonce`…); (3) the **UserInfo** endpoint for profile claims; (4) **Discovery** (`/.well-known/openid-configuration`) and **JWKS** so clients configure themselves. Plus extras like `prompt`, `max_age`, `acr_values` and standardised logout.' },
  { q: 'Why is `sub` the user key and not email?', a: 'Emails change, get recycled when someone leaves a company, and some providers let users set an unverified email. `sub` is guaranteed stable and unique **per issuer**. Two different IdPs can issue the same `sub` value, so the real key is the pair `(iss, sub)`.' },
  { q: 'nonce vs state — aren\'t they the same thing?', a: '`state` is checked by the client when the **redirect** comes back (protects the callback from CSRF). `nonce` is placed **inside the signed ID token** by the OP, so it binds the token itself to the browser session that requested it — a token stolen from another session fails the check even if it is otherwise perfectly valid.' },
  { q: 'Do I need to validate the ID token if I got it directly from the token endpoint over TLS?', a: 'The spec allows relying on TLS for the signature in that exact case, but you must STILL check `iss`, `aud`, `exp` and `nonce`. Libraries do all of it anyway — the real rule is: never hand-parse a JWT with `atob` and trust it.' },
  { q: 'How does logout work in OIDC?', a: 'Clearing your app\'s session only logs out of YOUR app — the OP session stays alive and a click on "Sign in" logs the user straight back in. **RP-Initiated Logout** redirects to the OP\'s `end_session_endpoint` with `id_token_hint` to end the OP session too. **Back-Channel Logout** has the OP POST a signed logout token to every app so they can kill their sessions.' },
]

export default function OIDCVisualizer() {
  const ctrl = useSteps(MSGS.length + 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OpenID Connect</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          A thin identity layer on top of OAuth 2.0 — the protocol behind every "Sign in with Google / Apple / Microsoft" button
        </p>
      </div>

      <StoryPanel>
        <p>
          OAuth gave apps a <strong>valet key</strong> — it says what you can do, but not who you are. A valet key in your hand
          doesn’t prove you own the car; you might have found it.
        </p>
        <p>
          OpenID Connect adds a <strong>signed letter of introduction</strong>. Google writes: "To NoteNest, from Google: the person
          holding this is Asha, user #1104…, she logged in 5 seconds ago with her password and a phone prompt. Valid for one hour.
          Your secret word was <em>n-0S6</em>." NoteNest checks Google’s seal, that the letter is addressed to <em>NoteNest</em>,
          that it’s fresh, and that the secret word matches — then lets Asha in.
        </p>
      </StoryPanel>

      <MemoryTip>
        <strong>OAuth = access, OIDC = identity.</strong> ID token is for the app ("who logged in"); access token is for the API ("what may be done").
      </MemoryTip>

      <KeyIdea>
        <p>
          OIDC (2014) is <strong>not a new flow</strong> — it’s the OAuth authorization-code flow you already know, plus the
          <code className="mx-1">openid</code>scope. The authorization server becomes an <strong>OpenID Provider (OP)</strong>, the client
          becomes a <strong>Relying Party (RP)</strong>, and the token response gains an <strong>id_token</strong>: a JWT whose
          audience is the RP itself. Because the format, claims and validation rules are standardised, one library can log users
          in from Google, Microsoft Entra, Okta, Auth0, Keycloak or your own server with just an issuer URL.
        </p>
      </KeyIdea>

      <FlowDiagram actors={ACTORS} msgs={MSGS} step={ctrl.step} intro="NoteNest wants to know WHO Asha is, using her Google account — without ever touching her Google password." />
      <StepControls ctrl={ctrl} />

      <ClaimInspector />
      <ValidationLab />

      <InfoCards cards={[
        { title: 'Standard scopes', body: 'openid (required) · profile (name, picture, locale…) · email (email, email_verified) · address · phone · offline_access (get a refresh token).' },
        { title: 'Useful auth params', body: 'prompt=login forces re-authentication, prompt=consent re-asks consent, max_age=300 demands a login within 5 min, login_hint pre-fills the username, acr_values requests e.g. MFA.' },
        { title: 'Discovery & JWKS', body: 'One issuer URL → every endpoint, supported algs, and the public keys. Keys rotate: cache them, and re-fetch when you see an unknown kid.' },
        { title: 'Hybrid & implicit', body: 'response_type=id_token token and the hybrid flows exist in the spec, but modern guidance is simply: authorization code + PKCE for every client type.' },
      ]} />

      <CodeTabs examples={CODE} doubts={DOUBTS} />
    </div>
  )
}
