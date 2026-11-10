import { useEffect, useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import type { CodeExample } from '@/components/shared/CodeBlock'
import FlowDiagram, { Actor, FlowMsg, VariantPicker, StoryPanel, KeyIdea, InfoCards } from '../shared/FlowDiagram'

type Flow = 'authcode' | 'client-credentials' | 'device' | 'refresh'

interface FlowDef {
  label: string
  when: string
  story: string
  intro: string
  actors: Actor[]
  msgs: FlowMsg[]
}

const AS: Actor = { id: 'as', label: 'Authorization Server', icon: '🔐', color: '#0d9488', sub: 'accounts.example' }
const API: Actor = { id: 'api', label: 'Resource Server', icon: '🖼️', color: '#f59e0b', sub: 'photos API' }

const FLOWS: Record<Flow, FlowDef> = {
  authcode: {
    label: 'Authorization Code + PKCE',
    when: 'A user is present and an app (web, SPA, mobile) needs to act on their behalf. The default — use this unless you have a reason not to.',
    story: 'You want a print shop to print photos from your cloud album. You don\'t give the shop your cloud password. Instead the shop sends you to the cloud\'s front desk, you say "yes, let PrintMe READ my photos", and the desk hands you a claim ticket for the shop. The shop trades that ticket — plus a secret only it knows — for a limited key. The key opens the photo album, read-only, for one hour. Nothing else.',
    intro: 'PrintMe (the client) wants read access to Asha\'s photos without ever seeing her password.',
    actors: [
      { id: 'browser', label: 'Browser', icon: '🧑‍💻', color: '#8b5cf6', sub: 'Asha (resource owner)' },
      { id: 'client', label: 'Client App', icon: '🖨️', color: '#0ea5e9', sub: 'PrintMe' },
      AS, API,
    ],
    msgs: [
      { from: 'browser', to: 'client', label: 'Connect photos', channel: 'front', note: 'Asha clicks "Import from CloudPhotos" in the PrintMe app.' },
      { from: 'client', to: 'client', label: 'make verifier + state', channel: 'local', note: 'PKCE: create a random code_verifier and keep it secret. Send only its SHA-256 hash (code_challenge). Also a random state to tie the callback to this browser (CSRF protection).', payload: 'code_verifier  = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"   // keep secret\ncode_challenge = BASE64URL(SHA256(code_verifier))\n               = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"\nstate          = "af0ifjsldkj"' },
      { from: 'client', to: 'browser', label: '302 → /authorize', channel: 'front', note: 'The client never asks for the password. It redirects the browser to the authorization server with what it wants (scope) and where to come back to (redirect_uri).', payload: 'HTTP/1.1 302 Found\nLocation: https://accounts.example/authorize\n  ?response_type=code\n  &client_id=printme\n  &redirect_uri=https://printme.app/callback\n  &scope=photos.read\n  &state=af0ifjsldkj\n  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\n  &code_challenge_method=S256' },
      { from: 'browser', to: 'as', label: 'GET /authorize', channel: 'front', note: 'The authorization server checks client_id is registered and redirect_uri EXACTLY matches a registered one (no open redirects).' },
      { from: 'as', to: 'browser', label: 'login + consent', channel: 'front', note: 'Asha logs in on the AS\'s own domain (password, MFA, passkey…) and sees: "PrintMe wants to: View your photos". The client never sees any of this.' },
      { from: 'browser', to: 'as', label: 'Allow', channel: 'front', note: 'Asha grants exactly the scope requested — or less.' },
      { from: 'as', to: 'browser', label: '302 → callback?code', channel: 'front', note: 'The AS sends back a short-lived (~60 s), single-use authorization code — NOT a token. It travels through the browser, so it may leak via history or logs. That\'s fine: alone it\'s useless.', payload: 'HTTP/1.1 302 Found\nLocation: https://printme.app/callback\n  ?code=SplxlOBeZQQYbYS6WxSbIA\n  &state=af0ifjsldkj' },
      { from: 'browser', to: 'client', label: 'GET /callback', channel: 'front', note: 'Client checks state === what it stored. A mismatch means someone injected a callback — abort.' },
      { from: 'client', to: 'as', label: 'POST /token (code + verifier)', channel: 'back', note: 'Back channel: the client swaps the code for tokens directly with the AS, proving it is the same party that started the flow by revealing the code_verifier.', payload: 'POST /token\nHost: accounts.example\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic cHJpbnRtZTpzM2NyM3Q=   // confidential clients only\n\ngrant_type=authorization_code\n&code=SplxlOBeZQQYbYS6WxSbIA\n&redirect_uri=https://printme.app/callback\n&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' },
      { from: 'as', to: 'as', label: 'SHA256(verifier) == challenge?', channel: 'local', note: 'The AS hashes the verifier and compares it to the challenge it saw in step 3. An attacker who stole the code can\'t produce the verifier → invalid_grant. Also: code unused? not expired? same client & redirect_uri?' },
      { from: 'as', to: 'client', label: '{ access_token, refresh_token }', channel: 'back', note: 'Tokens never touched the browser\'s URL bar.', payload: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{\n  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ…",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "refresh_token": "8xLOxBtZp8",\n  "scope": "photos.read"\n}' },
      { from: 'client', to: 'api', label: 'GET /photos  Bearer …', channel: 'back', note: 'The client calls the API with the access token.', payload: 'GET /v1/photos?album=summer\nHost: photos.example\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ…' },
      { from: 'api', to: 'client', label: '200 photos', channel: 'back', note: 'The API validates the token (signature or introspection), checks exp, aud and that scope includes photos.read — then serves the photos. A DELETE request would get 403 insufficient_scope.' },
    ],
  },
  'client-credentials': {
    label: 'Client Credentials',
    when: 'Machine-to-machine: a backend job or microservice calls an API as itself. No user, no browser, no consent screen.',
    story: 'A delivery van, not a person. The warehouse issues the van its own badge: "Van #7 may unload at dock B". The guard checks the van\'s badge — nobody is asked "do you consent?", because no human\'s data is being borrowed.',
    intro: 'The nightly billing worker needs to create invoices in the Invoices API. It acts as itself.',
    actors: [
      { id: 'svc', label: 'Billing Worker', icon: '⚙️', color: '#0ea5e9', sub: 'confidential client' },
      AS,
      { id: 'api', label: 'Invoices API', icon: '🧾', color: '#f59e0b', sub: 'resource server' },
    ],
    msgs: [
      { from: 'svc', to: 'as', label: 'POST /token (client_credentials)', channel: 'back', note: 'The service authenticates with its own credentials. Prefer private_key_jwt or mTLS over a shared secret in production.', payload: 'POST /token\nAuthorization: Basic YmlsbGluZy13b3JrZXI6czNjcjN0\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials\n&scope=invoices.write' },
      { from: 'as', to: 'as', label: 'verify client + allowed scopes', channel: 'local', note: 'Is this client registered? Is its secret/key valid? Is it allowed to request invoices.write?' },
      { from: 'as', to: 'svc', label: '{ access_token }', channel: 'back', note: 'No refresh token — the client can simply ask again with its credentials. The token\'s sub is the client itself.', payload: '{\n  "access_token": "eyJhbGciOiJSUzI1NiJ9…",\n  "token_type": "Bearer",\n  "expires_in": 900,\n  "scope": "invoices.write"\n}' },
      { from: 'svc', to: 'svc', label: 'cache until exp − 60s', channel: 'local', note: 'Don\'t fetch a new token per request — cache it and renew shortly before it expires.' },
      { from: 'svc', to: 'api', label: 'POST /invoices  Bearer …', channel: 'back', note: 'Call the API.' },
      { from: 'api', to: 'svc', label: '201 Created', channel: 'back', note: 'API checks signature, audience and scope invoices.write.' },
    ],
  },
  device: {
    label: 'Device Code',
    when: 'Input-constrained devices — smart TVs, CLIs, game consoles — where typing a password is painful or there is no browser.',
    story: 'Logging into a streaming app on a hotel TV. Typing a password with a remote is torture, so the TV shows "Go to tv.example/link and enter WDJB-MJHT". You do it on your phone, which has a real keyboard and is already logged in. A few seconds later the TV just… works.',
    intro: 'The TV app has no keyboard. The user will approve on their phone instead.',
    actors: [
      { id: 'tv', label: 'TV App', icon: '📺', color: '#0ea5e9', sub: 'public client' },
      AS,
      { id: 'phone', label: 'Phone', icon: '📱', color: '#8b5cf6', sub: 'the user' },
      { id: 'api', label: 'Streaming API', icon: '🎬', color: '#f59e0b', sub: 'resource server' },
    ],
    msgs: [
      { from: 'tv', to: 'as', label: 'POST /device_authorization', channel: 'back', note: 'The TV asks to start a device flow.', payload: 'POST /device_authorization\n\nclient_id=tv-app&scope=stream.watch offline_access' },
      { from: 'as', to: 'tv', label: '{ device_code, user_code }', channel: 'back', note: 'Two codes: a long secret device_code the TV keeps, and a short human-friendly user_code to show on screen.', payload: '{\n  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",\n  "user_code": "WDJB-MJHT",\n  "verification_uri": "https://tv.example/link",\n  "expires_in": 1800,\n  "interval": 5\n}' },
      { from: 'tv', to: 'tv', label: 'show WDJB-MJHT', channel: 'local', note: 'Screen: "Visit tv.example/link and enter WDJB-MJHT" (often with a QR code).' },
      { from: 'tv', to: 'as', label: 'poll POST /token', channel: 'back', note: 'The TV starts polling every `interval` seconds.', payload: 'POST /token\n\ngrant_type=urn:ietf:params:oauth:grant-type:device_code\n&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS\n&client_id=tv-app' },
      { from: 'as', to: 'tv', label: '400 authorization_pending', channel: 'back', note: 'Not yet — keep waiting. (slow_down = poll less often; expired_token = start over; access_denied = user said no.)', payload: '{ "error": "authorization_pending" }' },
      { from: 'phone', to: 'as', label: 'enter code + approve', channel: 'front', note: 'On the phone, the user opens the link, logs in (often already logged in), types WDJB-MJHT and approves. Always show the device name so people don\'t approve a code an attacker sent them.' },
      { from: 'tv', to: 'as', label: 'poll POST /token', channel: 'back', note: 'Next poll…' },
      { from: 'as', to: 'tv', label: '{ access_token, refresh_token }', channel: 'back', note: 'Approved! The TV gets its tokens and will use the refresh token to stay logged in for months.' },
      { from: 'tv', to: 'api', label: 'GET /watch  Bearer …', channel: 'back', note: 'Streaming starts.' },
    ],
  },
  refresh: {
    label: 'Refresh Token',
    when: 'Access tokens expire quickly by design. The refresh token gets a new one without bothering the user — and rotation catches thieves.',
    story: 'A gym day pass plus a membership card. The day pass (access token) gets you through the turnstile but expires tonight. The membership card (refresh token) never opens the turnstile itself — you only show it at the front desk to get tomorrow\'s day pass. And each time, the desk swaps your card for a new one; if someone ever shows up with an OLD card, the desk knows it was copied and cancels them all.',
    intro: 'An hour later, PrintMe\'s access token has expired.',
    actors: [
      { id: 'client', label: 'Client App', icon: '🖨️', color: '#0ea5e9', sub: 'PrintMe' },
      AS, API,
      { id: 'thief', label: 'Attacker', icon: '🦹', color: '#ef4444', sub: 'stole old RT' },
    ],
    msgs: [
      { from: 'client', to: 'api', label: 'GET /photos  (old token)', channel: 'back', note: 'Business as usual…' },
      { from: 'api', to: 'client', label: '401 invalid_token', channel: 'back', note: 'The access token\'s exp is in the past.', payload: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token",\n  error_description="The access token expired"' },
      { from: 'client', to: 'as', label: 'POST /token (refresh_token=RT1)', channel: 'back', note: 'Refresh tokens are only ever sent to the authorization server — never to APIs.', payload: 'POST /token\n\ngrant_type=refresh_token\n&refresh_token=RT1-8xLOxBtZp8\n&client_id=printme' },
      { from: 'as', to: 'as', label: 'rotate: RT1 ✗ → RT2', channel: 'local', note: 'Refresh token rotation: RT1 is marked used and a new RT2 is issued in the same "family". Required for public clients (SPAs, mobile).' },
      { from: 'as', to: 'client', label: '{ access_token, refresh_token: RT2 }', channel: 'back', note: 'Fresh access token, fresh refresh token. The user noticed nothing.' },
      { from: 'client', to: 'api', label: 'retry  Bearer (new)', channel: 'back', note: 'Retry the original request.' },
      { from: 'api', to: 'client', label: '200 photos', channel: 'back', note: 'Success.' },
      { from: 'thief', to: 'as', label: 'POST /token (refresh_token=RT1)', channel: 'back', danger: true, note: 'An attacker who copied RT1 earlier tries to use it.' },
      { from: 'as', to: 'thief', label: '400 invalid_grant + revoke family', channel: 'back', danger: true, note: 'RT1 was already used → reuse detected. The AS can\'t tell who is legit, so it revokes RT2 as well. The real user must log in again; the thief is locked out.' },
    ],
  },
}

const CODE: Record<Flow, CodeExample[]> = {
  authcode: [
    { lang: 'javascript', label: 'Node (fetch + crypto)', code: `import crypto from 'node:crypto'

const AS = 'https://accounts.example'
const b64url = buf => buf.toString('base64url')

// Step 1: start the flow
app.get('/connect', (req, res) => {
  const verifier = b64url(crypto.randomBytes(32))                 // 43 chars
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  const state = b64url(crypto.randomBytes(16))
  req.session.oauth = { verifier, state }

  const url = new URL(\`\${AS}/authorize\`)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: 'printme',
    redirect_uri: 'https://printme.app/callback',
    scope: 'photos.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  res.redirect(url)
})

// Step 2: handle the callback, swap code → tokens on the back channel
app.get('/callback', async (req, res) => {
  const { verifier, state } = req.session.oauth ?? {}
  if (!state || req.query.state !== state) return res.status(400).send('state mismatch')
  if (req.query.error) return res.status(400).send(req.query.error)   // e.g. access_denied

  const r = await fetch(\`\${AS}/token\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(\`printme:\${process.env.CLIENT_SECRET}\`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: 'https://printme.app/callback',
      code_verifier: verifier,
    }),
  })
  const tokens = await r.json()            // { access_token, refresh_token, expires_in, scope }
  await tokenStore.save(req.session.userId, tokens)   // server-side, never to the browser
  res.redirect('/import')
})

// Step 3: call the API
const photos = await fetch('https://photos.example/v1/photos', {
  headers: { Authorization: \`Bearer \${tokens.access_token}\` },
})` },
    { lang: 'python', label: 'Python (requests-oauthlib)', code: `import secrets, hashlib, base64
from flask import Flask, session, redirect, request, abort
from requests_oauthlib import OAuth2Session

AUTHORIZE = "https://accounts.example/authorize"
TOKEN = "https://accounts.example/token"
REDIRECT = "https://printme.app/callback"

def pkce_pair():
    verifier = secrets.token_urlsafe(32)
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge

@app.get("/connect")
def connect():
    verifier, challenge = pkce_pair()
    oauth = OAuth2Session("printme", redirect_uri=REDIRECT, scope=["photos.read"])
    url, state = oauth.authorization_url(
        AUTHORIZE, code_challenge=challenge, code_challenge_method="S256")
    session["oauth"] = {"state": state, "verifier": verifier}
    return redirect(url)

@app.get("/callback")
def callback():
    saved = session.pop("oauth", None)
    if not saved or request.args.get("state") != saved["state"]:
        abort(400, "state mismatch")
    oauth = OAuth2Session("printme", redirect_uri=REDIRECT, state=saved["state"])
    token = oauth.fetch_token(
        TOKEN,
        authorization_response=request.url,
        client_secret=CLIENT_SECRET,
        code_verifier=saved["verifier"],       # PKCE proof
    )
    save_tokens(session["user_id"], token)
    return redirect("/import")

# later
api = OAuth2Session("printme", token=load_tokens(user_id))
photos = api.get("https://photos.example/v1/photos").json()` },
    { lang: 'java', label: 'Java (Spring OAuth2 Client)', code: `// application.yml
// spring.security.oauth2.client:
//   registration.cloudphotos:
//     client-id: printme
//     client-secret: \${CLIENT_SECRET}
//     authorization-grant-type: authorization_code
//     redirect-uri: "{baseUrl}/callback"
//     scope: photos.read
//   provider.cloudphotos:
//     authorization-uri: https://accounts.example/authorize
//     token-uri: https://accounts.example/token

@Configuration
public class OAuthClientConfig {
    @Bean
    SecurityFilterChain chain(HttpSecurity http, ClientRegistrationRepository repo) throws Exception {
        var resolver = new DefaultOAuth2AuthorizationRequestResolver(repo, "/oauth2/authorization");
        resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        http.oauth2Client(c -> c.authorizationCodeGrant(g -> g.authorizationRequestResolver(resolver)));
        return http.build();
    }

    @Bean
    WebClient photosClient(OAuth2AuthorizedClientManager manager) {
        var oauth = new ServletOAuth2AuthorizedClientExchangeFilterFunction(manager);
        oauth.setDefaultClientRegistrationId("cloudphotos");
        return WebClient.builder().apply(oauth.oauth2Configuration()).build();
        // Spring attaches the Bearer token and refreshes it automatically
    }
}

@RestController
class ImportController {
    @GetMapping("/import")
    String importPhotos(@RegisteredOAuth2AuthorizedClient("cloudphotos") OAuth2AuthorizedClient client) {
        return photosClient.get().uri("https://photos.example/v1/photos")
            .retrieve().bodyToMono(String.class).block();
    }
}` },
  ],
  'client-credentials': [
    { lang: 'javascript', label: 'Node', code: `// Token cache: reuse until shortly before expiry
let cached = { token: null, exp: 0 }

async function getServiceToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token

  const r = await fetch('https://accounts.example/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(\`billing-worker:\${process.env.CLIENT_SECRET}\`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'invoices.write' }),
  })
  if (!r.ok) throw new Error(\`token request failed: \${r.status}\`)
  const { access_token, expires_in } = await r.json()
  cached = { token: access_token, exp: Date.now() + expires_in * 1000 }
  return access_token
}

export async function createInvoice(invoice) {
  const token = await getServiceToken()
  return fetch('https://invoices.example/invoices', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  })
}` },
    { lang: 'python', label: 'Python (Authlib)', code: `from authlib.integrations.requests_client import OAuth2Session

# Authlib caches the token and fetches a new one when it expires
client = OAuth2Session(
    client_id="billing-worker",
    client_secret=CLIENT_SECRET,
    scope="invoices.write",
    token_endpoint="https://accounts.example/token",
    grant_type="client_credentials",
)
client.fetch_token()          # POST /token grant_type=client_credentials

def create_invoice(invoice: dict):
    # auto-renews via the token_endpoint when the access token expires
    r = client.post("https://invoices.example/invoices", json=invoice)
    r.raise_for_status()
    return r.json()` },
    { lang: 'java', label: 'Java (Spring)', code: `// application.yml
// spring.security.oauth2.client:
//   registration.billing:
//     client-id: billing-worker
//     client-secret: \${CLIENT_SECRET}
//     authorization-grant-type: client_credentials
//     scope: invoices.write
//   provider.billing.token-uri: https://accounts.example/token

@Configuration
public class M2MConfig {
    @Bean
    OAuth2AuthorizedClientManager manager(ClientRegistrationRepository regs,
                                          OAuth2AuthorizedClientService service) {
        var provider = OAuth2AuthorizedClientProviderBuilder.builder().clientCredentials().build();
        var m = new AuthorizedClientServiceOAuth2AuthorizedClientManager(regs, service);
        m.setAuthorizedClientProvider(provider);   // fetches + caches + renews
        return m;
    }

    @Bean
    RestClient invoices(OAuth2AuthorizedClientManager manager) {
        var interceptor = new OAuth2ClientHttpRequestInterceptor(manager);
        interceptor.setClientRegistrationIdResolver(req -> "billing");
        return RestClient.builder().baseUrl("https://invoices.example")
            .requestInterceptor(interceptor).build();
    }
}` },
  ],
  device: [
    { lang: 'javascript', label: 'Node (CLI)', code: `const AS = 'https://accounts.example'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function deviceLogin() {
  const start = await fetch(\`\${AS}/device_authorization\`, {
    method: 'POST',
    body: new URLSearchParams({ client_id: 'tv-app', scope: 'stream.watch offline_access' }),
  }).then(r => r.json())

  console.log(\`Visit \${start.verification_uri} and enter \${start.user_code}\`)

  let interval = start.interval ?? 5
  const deadline = Date.now() + start.expires_in * 1000
  while (Date.now() < deadline) {
    await sleep(interval * 1000)
    const r = await fetch(\`\${AS}/token\`, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: start.device_code,
        client_id: 'tv-app',
      }),
    })
    const body = await r.json()
    if (r.ok) return body                                 // { access_token, refresh_token }
    if (body.error === 'authorization_pending') continue
    if (body.error === 'slow_down') { interval += 5; continue }
    throw new Error(body.error)                           // access_denied / expired_token
  }
  throw new Error('timed out')
}` },
    { lang: 'python', label: 'Python', code: `import time, requests

AS = "https://accounts.example"

def device_login():
    start = requests.post(f"{AS}/device_authorization",
                          data={"client_id": "tv-app", "scope": "stream.watch offline_access"}).json()
    print(f"Visit {start['verification_uri']} and enter {start['user_code']}")

    interval = start.get("interval", 5)
    deadline = time.time() + start["expires_in"]
    while time.time() < deadline:
        time.sleep(interval)
        r = requests.post(f"{AS}/token", data={
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "device_code": start["device_code"],
            "client_id": "tv-app",
        })
        body = r.json()
        if r.ok:
            return body                       # access_token + refresh_token
        if body["error"] == "authorization_pending":
            continue
        if body["error"] == "slow_down":
            interval += 5
            continue
        raise RuntimeError(body["error"])     # access_denied / expired_token
    raise TimeoutError("user never approved")` },
    { lang: 'java', label: 'Java (HttpClient)', code: `public class DeviceLogin {
    static final HttpClient http = HttpClient.newHttpClient();
    static final ObjectMapper json = new ObjectMapper();
    static final String AS = "https://accounts.example";

    static JsonNode post(String path, String form) throws Exception {
        var req = HttpRequest.newBuilder(URI.create(AS + path))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(form)).build();
        return json.readTree(http.send(req, HttpResponse.BodyHandlers.ofString()).body());
    }

    public static JsonNode login() throws Exception {
        JsonNode start = post("/device_authorization", "client_id=tv-app&scope=stream.watch");
        System.out.printf("Visit %s and enter %s%n",
            start.get("verification_uri").asText(), start.get("user_code").asText());

        int interval = start.path("interval").asInt(5);
        String form = "grant_type=urn:ietf:params:oauth:grant-type:device_code"
            + "&client_id=tv-app&device_code=" + start.get("device_code").asText();
        while (true) {
            Thread.sleep(interval * 1000L);
            JsonNode body = post("/token", form);
            if (body.has("access_token")) return body;
            switch (body.get("error").asText()) {
                case "authorization_pending" -> { }
                case "slow_down" -> interval += 5;
                default -> throw new IllegalStateException(body.get("error").asText());
            }
        }
    }
}` },
  ],
  refresh: [
    { lang: 'javascript', label: 'Node (auto-refresh)', code: `// Wrap API calls: on 401, refresh once and retry
let refreshing = null   // de-duplicate concurrent refreshes

async function refresh(tokens) {
  const r = await fetch('https://accounts.example/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: 'printme',
    }),
  })
  if (!r.ok) throw new Error('re-login required')    // invalid_grant: revoked / reused
  const fresh = await r.json()
  // Rotation: ALWAYS store the new refresh token, the old one is dead
  return { ...tokens, ...fresh }
}

export async function apiFetch(url, store) {
  let res = await fetch(url, { headers: { Authorization: \`Bearer \${store.tokens.access_token}\` } })
  if (res.status !== 401) return res

  refreshing ??= refresh(store.tokens).finally(() => { refreshing = null })
  store.tokens = await refreshing
  return fetch(url, { headers: { Authorization: \`Bearer \${store.tokens.access_token}\` } })
}` },
    { lang: 'python', label: 'Python (server: rotation)', code: `# Authorization-server side: refresh token rotation with reuse detection
import secrets
from datetime import datetime, timedelta

def exchange_refresh_token(presented: str, client_id: str):
    rt = db.refresh_tokens.get(presented)
    if rt is None or rt.client_id != client_id or rt.expires_at < datetime.utcnow():
        raise OAuthError("invalid_grant")

    if rt.used:
        # Someone replayed an old token → assume theft, kill the whole family
        db.refresh_tokens.revoke_family(rt.family_id)
        raise OAuthError("invalid_grant")

    rt.used = True
    new_rt = db.refresh_tokens.create(
        token=secrets.token_urlsafe(32),
        family_id=rt.family_id,             # same lineage
        user_id=rt.user_id, client_id=client_id, scope=rt.scope,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    return {
        "access_token": issue_access_token(rt.user_id, rt.scope, minutes=15),
        "token_type": "Bearer",
        "expires_in": 900,
        "refresh_token": new_rt.token,
    }` },
    { lang: 'java', label: 'Java (Spring)', code: `// Spring's OAuth2AuthorizedClientManager refreshes transparently
@Bean
OAuth2AuthorizedClientManager manager(ClientRegistrationRepository regs,
                                      OAuth2AuthorizedClientRepository clients) {
    var provider = OAuth2AuthorizedClientProviderBuilder.builder()
        .authorizationCode()
        .refreshToken(r -> r.clockSkew(Duration.ofSeconds(60)))  // refresh 60 s early
        .build();
    var manager = new DefaultOAuth2AuthorizedClientManager(regs, clients);
    manager.setAuthorizedClientProvider(provider);
    return manager;
}

// Spring Authorization Server: enable rotation for a public client
RegisteredClient spa = RegisteredClient.withId(UUID.randomUUID().toString())
    .clientId("printme-spa")
    .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)   // public client
    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
    .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
    .redirectUri("https://printme.app/callback")
    .scope("photos.read")
    .clientSettings(ClientSettings.builder().requireProofKey(true).build())   // PKCE
    .tokenSettings(TokenSettings.builder()
        .accessTokenTimeToLive(Duration.ofMinutes(15))
        .reuseRefreshTokens(false)                                 // rotate every time
        .build())
    .build();` },
  ],
}

const DOUBTS: Record<Flow, { q: string; a: string }[]> = {
  authcode: [
    { q: 'Why a code first? Why not return the token straight away?', a: 'Everything in the redirect travels through the browser — URL bar, history, `Referer` headers, proxy logs, malicious browser extensions. A token there would leak. So the front channel only carries a short-lived, single-use **code**, and the real token is fetched on the **back channel** where the client can also prove who it is. That was literally the flaw in the old **Implicit flow** (`response_type=token`), which is now deprecated.' },
    { q: 'What does PKCE actually protect against?', a: 'Authorization code interception. On mobile, a malicious app can register the same custom URL scheme and receive the redirect with the code. Without PKCE it could redeem it. With PKCE, the AS demands the `code_verifier` whose hash it saw at the start — which only the real app has in memory. OAuth 2.1 makes PKCE **mandatory for all clients**, even confidential web servers.' },
    { q: 'What is the `state` parameter for if we already have PKCE?', a: '`state` protects the **client** from CSRF: an attacker could otherwise make your browser hit `/callback?code=<attacker\'s code>` and silently link the attacker\'s account to yours. Checking that `state` matches what you stored in this browser\'s session proves the callback belongs to a flow you started. (PKCE also helps here, but `state` is still recommended and carries your return URL.)' },
    { q: 'Is OAuth 2.0 a login protocol?', a: 'No — and this is the #1 confusion. An access token says "the bearer may read photos", not "this is Asha". It may be opaque, it\'s meant for the API (not the client), and its audience isn\'t your app. Using it as proof of login led to real account-takeover bugs. For login, use **OpenID Connect**, which adds the **ID token** specifically for the client.' },
    { q: 'Should I use the Resource Owner Password grant?', a: 'No. `grant_type=password` has the app collect the user\'s password directly — the exact thing OAuth was invented to avoid. It breaks MFA, SSO and phishing resistance, and it is removed in OAuth 2.1.' },
  ],
  'client-credentials': [
    { q: 'Why not just use a static API key?', a: 'An API key is a long-lived password that is usually sent on every request and rarely rotated. With client credentials the secret is only shown to the AS, while APIs see short-lived, scoped, audience-bound tokens. You can rotate secrets, narrow scopes per service, and audit issuance centrally.' },
    { q: 'Can a SPA or mobile app use client credentials?', a: 'No. It requires a **confidential** client — one that can keep a secret. Anything shipped to a user\'s device can be decompiled. Public clients must use authorization code + PKCE.' },
  ],
  device: [
    { q: 'Can an attacker abuse the device flow for phishing?', a: 'Yes — "device code phishing": the attacker starts a flow, then sends the victim the real login link with the attacker\'s `user_code`. If the victim approves, the attacker\'s device gets tokens. Mitigations: short expiry, show the client and device name prominently on the approval page, and restrict which clients may use this grant.' },
    { q: 'Why does the TV poll instead of being notified?', a: 'The TV may be behind NAT with no reachable address, and the spec keeps it simple. The `interval` field and the `slow_down` error let the AS control polling load.' },
  ],
  refresh: [
    { q: 'Why not just make access tokens last a week?', a: 'Access tokens are presented to every API, logged, cached and often self-contained — the more places they go, the more chances to leak, and a self-contained JWT usually can\'t be revoked. Short-lived access tokens + a refresh token that only ever goes to the AS gives you both: small blast radius and a single place to revoke.' },
    { q: 'How do I get a refresh token at all?', a: 'It depends on the AS. Many require the `offline_access` scope (OIDC) or `access_type=offline` (Google). Client credentials never returns one — just request a new access token.' },
  ],
}

const FLOW_CHOOSER = [
  { who: 'Web app with a backend', flow: 'Authorization Code + PKCE (confidential client)' },
  { who: 'SPA / mobile / desktop', flow: 'Authorization Code + PKCE (public client, no secret) — or a BFF' },
  { who: 'Service → service, no user', flow: 'Client Credentials' },
  { who: 'TV, CLI, IoT', flow: 'Device Authorization Grant' },
  { who: '"Implicit" or "Password" grant', flow: '✗ Deprecated — removed in OAuth 2.1' },
]

async function sha256b64url(input: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  let bin = ''
  new Uint8Array(digest).forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function PkcePlayground() {
  const [verifier, setVerifier] = useState('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
  const [guess, setGuess] = useState('i-stole-the-code-but-not-the-verifier')
  const [challenge, setChallenge] = useState<string | null>(null)
  const [guessHash, setGuessHash] = useState<string | null>(null)

  useEffect(() => { sha256b64url(verifier).then(setChallenge) }, [verifier])
  useEffect(() => { sha256b64url(guess).then(setGuessHash) }, [guess])

  const match = challenge !== null && guessHash === challenge

  return (
    <div className="viz-container p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">🧪 PKCE playground</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          The app keeps the verifier secret and only sends its hash up front. Later, whoever redeems the code must
          present a verifier that hashes to the same value. Try making the attacker win.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-sky-200 dark:border-sky-800 p-3 space-y-2">
          <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">🖨️ Real app — step 2</div>
          <label className="block text-[11px] text-slate-500">code_verifier (secret)</label>
          <div className="flex gap-2">
            <input aria-label="code verifier" value={verifier} onChange={e => setVerifier(e.target.value)} className="flex-1 min-w-0 font-mono text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200" />
            <button onClick={() => setVerifier(randomVerifier())} className="text-xs px-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400">🎲</button>
          </div>
          <label className="block text-[11px] text-slate-500">code_challenge = BASE64URL(SHA256(verifier)) — sent in the redirect</label>
          <div className="font-mono text-xs break-all text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5">{challenge ?? '(Web Crypto unavailable)'}</div>
        </div>
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 p-3 space-y-2">
          <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">🦹 Attacker with an intercepted code</div>
          <label className="block text-[11px] text-slate-500">code_verifier the attacker sends to /token</label>
          <input aria-label="attacker verifier" value={guess} onChange={e => setGuess(e.target.value)} className="w-full font-mono text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200" />
          <label className="block text-[11px] text-slate-500">AS computes SHA256(attacker verifier)</label>
          <div className="font-mono text-xs break-all text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1.5">{guessHash ?? '—'}</div>
        </div>
      </div>
      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${match ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'}`}>
        {match
          ? '⚠️ Hashes match — the AS issues tokens. Only possible because you copied the secret verifier: SHA-256 can\'t be reversed from the challenge.'
          : '✅ Hashes differ → 400 invalid_grant. The stolen code is worthless without the verifier.'}
      </div>
    </div>
  )
}

export default function OAuth2Visualizer() {
  const [flow, setFlow] = useState<Flow>('authcode')
  const def = FLOWS[flow]
  const ctrl = useSteps(def.msgs.length + 1)
  const pick = (f: Flow) => { setFlow(f); ctrl.reset() }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OAuth 2.0</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Delegated authorization — let an app access an API on your behalf, with limited scope, without ever sharing your password
        </p>
      </div>

      <StoryPanel>
        <p>
          A <strong>valet key</strong>. When you hand your car to a valet, you don’t give them your house keys, your
          garage remote and your safe combination. You give them a special key that starts the engine, can’t open the
          trunk, and only works for tonight. If the valet loses it, you cancel that key — your real keys were never at risk.
        </p>
        <p>OAuth 2.0 is the machinery for handing out valet keys (<strong>access tokens</strong>) to apps.</p>
      </StoryPanel>

      <MemoryTip>
        <strong>Code in the front, token in the back.</strong> Anything that rides in a browser redirect can leak, so only the throwaway code goes there.
      </MemoryTip>

      <KeyIdea>
        <p>
          Before OAuth (2007-ish), apps asked for your Gmail password to "find your friends" — and then had full access to
          everything, forever. OAuth 2.0 (RFC 6749, 2012) splits the job: an <strong>authorization server</strong> authenticates
          the user and asks for consent; the <strong>client</strong> receives a token limited by <strong>scope</strong> (what),
          <strong> audience</strong> (which API) and <strong>expiry</strong> (how long); the <strong>resource server</strong> just
          checks the token. OAuth 2.1 consolidates today’s best practice: PKCE everywhere, exact redirect URI matching,
          no implicit or password grants.
        </p>
      </KeyIdea>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Pick a grant type</h2>
        <VariantPicker options={(Object.keys(FLOWS) as Flow[]).map(id => ({ id, label: FLOWS[id].label }))} value={flow} onChange={pick} />
        <div className="text-xs text-slate-500 dark:text-slate-400"><strong className="text-slate-700 dark:text-slate-300">When to use:</strong> {def.when}</div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">{def.story}</div>
      </div>

      <FlowDiagram actors={def.actors} msgs={def.msgs} step={ctrl.step} intro={def.intro} />
      <StepControls ctrl={ctrl} />

      {flow === 'authcode' && <PkcePlayground />}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">Which flow do I use?</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {FLOW_CHOOSER.map(r => (
            <div key={r.who} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400">{r.who}</span>
              <span className={`font-medium ${r.flow.startsWith('✗') ? 'text-rose-600 dark:text-rose-400' : 'text-teal-700 dark:text-teal-300'}`}>{r.flow}</span>
            </div>
          ))}
        </div>
      </div>

      <InfoCards cards={[
        { title: 'Scopes', body: 'Space-separated permissions the client asks for (photos.read, invoices.write). The user may grant fewer. APIs must check them — a valid token is not automatically an authorized request.' },
        { title: 'Access vs refresh token', body: 'Access token: short-lived, sent to APIs. Refresh token: long-lived, sent ONLY to the authorization server to get new access tokens. Treat both like passwords.' },
        { title: 'Public vs confidential clients', body: 'A backend can keep a client secret (confidential). Browser and mobile apps can\'t — anything shipped to a device can be extracted — so they rely on PKCE instead.' },
        { title: 'Token formats', body: 'OAuth doesn\'t mandate one. Often a JWT the API validates locally (RFC 9068), or an opaque string the API checks via the introspection endpoint (RFC 7662).' },
      ]} />

      <CodeTabs examples={CODE[flow]} doubts={DOUBTS[flow]} />
    </div>
  )
}
