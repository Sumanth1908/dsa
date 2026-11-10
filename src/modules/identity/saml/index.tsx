import { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import type { CodeExample } from '@/components/shared/CodeBlock'
import FlowDiagram, { Actor, FlowMsg, StoryPanel, KeyIdea, InfoCards } from '../shared/FlowDiagram'

const ACTORS: Actor[] = [
  { id: 'browser', label: 'Browser', icon: '🧑‍💻', color: '#8b5cf6', sub: 'principal' },
  { id: 'sp', label: 'Service Provider', icon: '💼', color: '#0ea5e9', sub: 'expenses.saas.com' },
  { id: 'idp', label: 'Identity Provider', icon: '🏢', color: '#0d9488', sub: 'acme.okta.com' },
]

const MSGS: FlowMsg[] = [
  { from: 'browser', to: 'sp', label: 'GET /reports', channel: 'front', note: 'Ravi from Acme Corp opens the expense tool. No session. The SP knows (from the email domain or a tenant URL) that Acme uses Okta.' },
  { from: 'sp', to: 'sp', label: 'build AuthnRequest', channel: 'local', note: 'The SP writes a small XML request with a unique ID (remembered for later) and where the answer should be POSTed (the ACS URL).', payload: '<samlp:AuthnRequest\n    ID="_a74f2c9e1b"\n    Version="2.0"\n    IssueInstant="2026-11-10T09:30:00Z"\n    Destination="https://acme.okta.com/app/expenses/sso/saml"\n    AssertionConsumerServiceURL="https://expenses.saas.com/saml/acs"\n    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">\n  <saml:Issuer>https://expenses.saas.com</saml:Issuer>\n  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>\n</samlp:AuthnRequest>' },
  { from: 'sp', to: 'browser', label: '302 ?SAMLRequest=…', channel: 'front', note: 'HTTP-Redirect binding: the XML is DEFLATE-compressed, base64-encoded and put in the URL. RelayState remembers where Ravi was going.', payload: 'HTTP/1.1 302 Found\nLocation: https://acme.okta.com/app/expenses/sso/saml\n  ?SAMLRequest=fZJNT8MwDIb%2FSpV7m7bAhqJ10mAHJAbTNjhwQWnqbhFpUmKXj39P2g0EB7hFtvz4tf3MSDamFYuOtmYNzx0gJR...\n  &RelayState=%2Freports' },
  { from: 'browser', to: 'idp', label: 'GET SSO URL', channel: 'front', note: 'Okta decodes the request and checks the Issuer is a known SP and the ACS URL matches its metadata.' },
  { from: 'idp', to: 'browser', label: 'login (or existing session)', channel: 'front', note: 'If Ravi already logged into Okta today, this is silent — that\'s the SSO. Otherwise: password + Okta Verify push.' },
  { from: 'idp', to: 'idp', label: 'sign Assertion', channel: 'local', note: 'Okta builds the Response + Assertion: who (NameID), for whom (Audience), when (Conditions), how (AuthnStatement) and extra attributes (groups, department). Then signs it with its private key (XML-DSig). Explore it below.' },
  { from: 'idp', to: 'browser', label: 'HTML form auto-POST', channel: 'front', note: 'HTTP-POST binding: the assertion is too big for a URL, so the IdP returns a tiny HTML page with a hidden form and a script that submits it immediately to the SP\'s ACS.', payload: '<html><body onload="document.forms[0].submit()">\n  <form method="POST" action="https://expenses.saas.com/saml/acs">\n    <input type="hidden" name="SAMLResponse" value="PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPS…"/>\n    <input type="hidden" name="RelayState" value="/reports"/>\n  </form>\n</body></html>' },
  { from: 'browser', to: 'sp', label: 'POST /saml/acs', channel: 'front', note: 'The browser delivers the signed assertion. Note: SAML is front-channel only — the SP and IdP never talk directly during login.' },
  { from: 'sp', to: 'sp', label: 'validate', channel: 'local', note: 'Signature with the IdP certificate from metadata · Destination & Recipient = my ACS · Audience = my entity ID · InResponseTo = the request ID I sent · NotBefore ≤ now < NotOnOrAfter · assertion ID not seen before (replay).' },
  { from: 'sp', to: 'browser', label: 'Set-Cookie + 302 /reports', channel: 'front', note: 'SP creates its own session for ravi@acme.com (JIT-provisioning the account if needed) and sends him to RelayState.' },
]

interface Part { id: string; label: string; lines: string[]; explain: string }

const ASSERTION: Part[] = [
  { id: 'response', label: 'Response envelope', lines: [
    '<samlp:Response ID="_r9c1…" InResponseTo="_a74f2c9e1b"',
    '    Destination="https://expenses.saas.com/saml/acs"',
    '    IssueInstant="2026-11-10T09:30:04Z">',
    '  <saml:Issuer>http://www.okta.com/exk1acme</saml:Issuer>',
    '  <samlp:Status><samlp:StatusCode Value="…:status:Success"/></samlp:Status>',
  ], explain: 'InResponseTo ties this answer to the AuthnRequest the SP sent (blocks unsolicited/injected responses). Destination must be your ACS URL.' },
  { id: 'signature', label: 'Signature', lines: [
    '  <saml:Assertion ID="_as81f…" IssueInstant="2026-11-10T09:30:04Z">',
    '    <ds:Signature>',
    '      <ds:SignedInfo><ds:Reference URI="#_as81f…">…<ds:DigestValue>q2l…</ds:DigestValue></ds:Reference></ds:SignedInfo>',
    '      <ds:SignatureValue>hH4Kx…</ds:SignatureValue>',
    '    </ds:Signature>',
  ], explain: 'XML Digital Signature over the Assertion element (referenced by its ID). Verify it with the IdP certificate you got from metadata — NEVER with a certificate embedded in the message itself. The Reference URI must point at the element you actually read data from (see "signature wrapping" in doubts).' },
  { id: 'subject', label: 'Subject', lines: [
    '    <saml:Subject>',
    '      <saml:NameID Format="…:emailAddress">ravi@acme.com</saml:NameID>',
    '      <saml:SubjectConfirmation Method="…:cm:bearer">',
    '        <saml:SubjectConfirmationData InResponseTo="_a74f2c9e1b"',
    '            Recipient="https://expenses.saas.com/saml/acs" NotOnOrAfter="2026-11-10T09:35:04Z"/>',
    '      </saml:SubjectConfirmation>',
    '    </saml:Subject>',
  ], explain: 'NameID is the user identifier (email, persistent opaque ID, …). "bearer" confirmation means whoever presents this assertion to the Recipient before NotOnOrAfter is treated as the subject — so it must be short-lived and single-use.' },
  { id: 'conditions', label: 'Conditions', lines: [
    '    <saml:Conditions NotBefore="2026-11-10T09:29:34Z" NotOnOrAfter="2026-11-10T09:35:04Z">',
    '      <saml:AudienceRestriction>',
    '        <saml:Audience>https://expenses.saas.com</saml:Audience>',
    '      </saml:AudienceRestriction>',
    '    </saml:Conditions>',
  ], explain: 'Validity window (a few minutes, allow small clock skew) and the Audience: your SP entity ID. An assertion for another SP — even if perfectly signed by the same IdP — must be rejected. Same idea as OIDC\'s aud.' },
  { id: 'authn', label: 'AuthnStatement', lines: [
    '    <saml:AuthnStatement AuthnInstant="2026-11-10T08:02:11Z" SessionIndex="_s77…">',
    '      <saml:AuthnContext><saml:AuthnContextClassRef>',
    '        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    '      </saml:AuthnContextClassRef></saml:AuthnContext>',
    '    </saml:AuthnStatement>',
  ], explain: 'When and how the user authenticated at the IdP. AuthnInstant is earlier than the assertion — Ravi logged into Okta at 08:02, SSO\'d here at 09:30. SessionIndex is used for Single Logout.' },
  { id: 'attrs', label: 'Attributes', lines: [
    '    <saml:AttributeStatement>',
    '      <saml:Attribute Name="firstName"><saml:AttributeValue>Ravi</saml:AttributeValue></saml:Attribute>',
    '      <saml:Attribute Name="groups">',
    '        <saml:AttributeValue>finance</saml:AttributeValue>',
    '        <saml:AttributeValue>approvers</saml:AttributeValue>',
    '      </saml:Attribute>',
    '    </saml:AttributeStatement>',
    '  </saml:Assertion>',
    '</samlp:Response>',
  ], explain: 'Arbitrary attributes the IdP admin mapped for this app — names, department, group memberships. The SP commonly maps groups to roles (finance → can view all reports). Equivalent to OIDC claims.' },
]

function AssertionExplorer() {
  const [sel, setSel] = useState('conditions')
  const part = ASSERTION.find(p => p.id === sel)!
  return (
    <div className="viz-container p-4 sm:p-6 space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">🔍 Anatomy of a SAML Response</h3>
      <div className="flex flex-wrap gap-2">
        {ASSERTION.map(p => (
          <button key={p.id} onClick={() => setSel(p.id)} aria-pressed={sel === p.id}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${sel === p.id ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <pre className="text-[11px] font-mono bg-slate-950 rounded-lg p-3 overflow-x-auto whitespace-pre">
        {ASSERTION.map(p => (
          <div key={p.id} onClick={() => setSel(p.id)} className={`cursor-pointer rounded ${p.id === sel ? 'bg-teal-900/60 text-teal-100' : 'text-slate-500 hover:text-slate-300'}`}>
            {p.lines.join('\n')}
          </div>
        ))}
      </pre>
      <p className="text-sm text-slate-600 dark:text-slate-300">{part.explain}</p>
    </div>
  )
}

const COMPARE = [
  { k: 'Year / lineage', saml: '2005 · OASIS', oidc: '2014 · OpenID Foundation, on OAuth 2.0' },
  { k: 'Format', saml: 'XML + XML-DSig', oidc: 'JSON + JWT (JWS)' },
  { k: 'Transport', saml: 'Browser redirect + auto-POST form', oidc: 'Redirect + back-channel token call' },
  { k: 'Proof of login', saml: 'Assertion', oidc: 'ID token' },
  { k: 'API access', saml: 'Not designed for it', oidc: 'Access token comes along for free' },
  { k: 'Mobile / SPA', saml: 'Awkward', oidc: 'Native (PKCE)' },
  { k: 'Config exchange', saml: 'Metadata XML (entity ID, certs, URLs)', oidc: 'Discovery URL + JWKS' },
  { k: 'Where you meet it', saml: 'Enterprise SaaS, universities, gov', oidc: 'Consumer login, new apps, workforce IdPs too' },
]

const CODE: CodeExample[] = [
  { lang: 'javascript', label: 'Node (passport-saml)', code: `import passport from 'passport'
import { Strategy as SamlStrategy } from '@node-saml/passport-saml'

passport.use(new SamlStrategy(
  {
    // --- This SP ---
    issuer: 'https://expenses.saas.com',                // SP entity ID = expected Audience
    callbackUrl: 'https://expenses.saas.com/saml/acs',  // ACS URL
    // --- The IdP (from Okta's metadata XML) ---
    entryPoint: 'https://acme.okta.com/app/expenses/sso/saml',
    idpCert: process.env.OKTA_SIGNING_CERT,             // verify signatures with THIS cert
    // --- Hardening ---
    wantAssertionsSigned: true,
    validateInResponseTo: 'always',                     // reject unsolicited responses
    acceptedClockSkewMs: 60_000,
  },
  // verify callback: map the assertion to a local user (JIT provisioning)
  async (profile, done) => {
    const user = await db.users.upsert({
      email: profile.nameID,
      firstName: profile.firstName,
      roles: (profile.groups ?? []).includes('approvers') ? ['approver'] : ['member'],
    })
    done(null, user)
  },
))

app.get('/login', passport.authenticate('saml'))           // → 302 with SAMLRequest
app.post('/saml/acs',
  express.urlencoded({ extended: false }),
  passport.authenticate('saml', { failureRedirect: '/login-failed' }),
  (req, res) => res.redirect(req.body.RelayState?.startsWith('/') ? req.body.RelayState : '/'),
)` },
  { lang: 'python', label: 'Python (python3-saml)', code: `from flask import Flask, request, redirect, session
from onelogin.saml2.auth import OneLogin_Saml2_Auth

SETTINGS = {
    "strict": True,                       # enforce Destination/Audience/time checks
    "sp": {
        "entityId": "https://expenses.saas.com",
        "assertionConsumerService": {
            "url": "https://expenses.saas.com/saml/acs",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        },
    },
    "idp": {
        "entityId": "http://www.okta.com/exk1acme",
        "singleSignOnService": {"url": "https://acme.okta.com/app/expenses/sso/saml",
                                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"},
        "x509cert": OKTA_SIGNING_CERT,
    },
    "security": {"wantAssertionsSigned": True, "rejectDeprecatedAlgorithm": True},
}

def saml_auth():
    req = {"https": "on", "http_host": request.host, "script_name": request.path,
           "get_data": request.args.copy(), "post_data": request.form.copy()}
    return OneLogin_Saml2_Auth(req, SETTINGS)

@app.get("/login")
def login():
    auth = saml_auth()
    url = auth.login(return_to="/reports")
    session["saml_request_id"] = auth.get_last_request_id()   # for InResponseTo
    return redirect(url)

@app.post("/saml/acs")
def acs():
    auth = saml_auth()
    auth.process_response(request_id=session.pop("saml_request_id", None))
    if auth.get_errors() or not auth.is_authenticated():
        return f"SAML error: {auth.get_last_error_reason()}", 401
    attrs = auth.get_attributes()
    session["user"] = {"email": auth.get_nameid(), "groups": attrs.get("groups", [])}
    return redirect("/reports")` },
  { lang: 'java', label: 'Java (Spring Security SAML2)', code: `// application.yml
// spring.security.saml2.relyingparty.registration.acme:
//   entity-id: https://expenses.saas.com
//   acs.location: "{baseUrl}/login/saml2/sso/{registrationId}"
//   assertingparty.metadata-uri: https://acme.okta.com/app/exk1acme/sso/saml/metadata

@Configuration
@EnableWebSecurity
public class SamlConfig {

    @Bean
    SecurityFilterChain chain(HttpSecurity http) throws Exception {
        var provider = new OpenSaml4AuthenticationProvider();
        // Map SAML "groups" attribute → Spring authorities
        provider.setResponseAuthenticationConverter(token -> {
            var auth = OpenSaml4AuthenticationProvider
                .createDefaultResponseAuthenticationConverter().convert(token);
            var principal = (Saml2AuthenticatedPrincipal) auth.getPrincipal();
            List<GrantedAuthority> roles = principal.getAttribute("groups").stream()
                .map(g -> new SimpleGrantedAuthority("ROLE_" + g.toString().toUpperCase()))
                .collect(Collectors.toList());
            return new Saml2Authentication(principal, auth.getSaml2Response(), roles);
        });

        http
            .authorizeHttpRequests(a -> a
                .requestMatchers("/approvals/**").hasRole("APPROVERS")
                .anyRequest().authenticated())
            .saml2Login(s -> s.authenticationManager(new ProviderManager(provider)))
            .saml2Logout(Customizer.withDefaults());       // SAML Single Logout
        // Spring validates signature, Audience, Destination, InResponseTo and time window
        return http.build();
    }
}` },
]

const DOUBTS = [
  { q: 'SP-initiated vs IdP-initiated SSO?', a: '**SP-initiated** (shown above): the user starts at the app, which sends an AuthnRequest. **IdP-initiated**: the user clicks an app tile in the Okta dashboard and the IdP POSTs an unsolicited assertion to the SP. Convenient, but there is no `InResponseTo` to check, which makes injection and CSRF-style attacks easier. Prefer SP-initiated; if you must accept IdP-initiated, enforce one-time assertion IDs and short validity.' },
  { q: 'What is XML Signature Wrapping (XSW)?', a: 'A classic SAML vulnerability. The signature covers an element by ID; an attacker copies the genuinely signed assertion somewhere harmless in the document and inserts a forged, unsigned assertion where the SP\'s code reads from. Signature check passes, data comes from the forgery. Defences: use a well-maintained library, and make sure the element you **read** is the exact element that was **verified**. Never write your own SAML parser.' },
  { q: 'Why do SAML integrations keep breaking every few years?', a: 'Certificate expiry. The IdP signs with an X.509 cert that typically lasts 1–3 years. When it rotates, every SP must get the new cert — or logins fail. Using a `metadata-uri` the SP refreshes automatically, and IdPs publishing the next cert in advance, avoids the 3 a.m. outage.' },
  { q: 'Should I build new apps on SAML or OIDC?', a: 'For new apps, OIDC — it is simpler, JSON-based, works with mobile and SPAs, and gives you API access tokens. But if you sell B2B SaaS, enterprise customers will ask for SAML because their IdP and security policies are built around it, so most SaaS products support **both**. Hosted brokers (Auth0, WorkOS, Keycloak) translate between them.' },
]

export default function SAMLVisualizer() {
  const ctrl = useSteps(MSGS.length + 1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SAML 2.0</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          The enterprise single sign-on workhorse — signed XML assertions carried through the browser from IdP to app
        </p>
      </div>

      <StoryPanel>
        <p>
          A <strong>sealed letter from HR</strong>. You visit a partner company’s office. Reception doesn’t know you, so they
          hand you a request slip: "Please confirm this visitor". You walk it to your own company’s HR desk (you’re already known
          there), and HR writes a letter — "This is Ravi, Finance department, approver. Valid until 9:35. For the attention of
          <em> Partner Co. reception</em>" — and stamps it with the company seal. You carry the sealed letter back. Reception checks
          the seal against the sample they keep on file, the addressee, and the time — then gives you a visitor badge.
        </p>
        <p>You were the courier the whole time. The two offices never phoned each other.</p>
      </StoryPanel>

      <MemoryTip>
        <strong>SP asks, IdP answers, browser carries.</strong> The SP trusts the answer because of the IdP’s signature — not because of who delivered it.
      </MemoryTip>

      <KeyIdea>
        <p>
          SAML 2.0 (2005) predates OAuth and is built for one job: <strong>web browser SSO</strong> between an
          <strong> Identity Provider</strong> (Okta, Entra ID, ADFS, Google Workspace) and a <strong>Service Provider</strong> (the SaaS
          app). The two exchange <strong>metadata</strong> once — entity IDs, endpoint URLs, signing certificates — and from then on every
          login is a signed XML <strong>assertion</strong> that the browser delivers. There is no back-channel call during login, so
          everything hinges on the SP validating the signature and conditions correctly.
        </p>
      </KeyIdea>

      <FlowDiagram actors={ACTORS} msgs={MSGS} step={ctrl.step} intro="Ravi (Acme Corp employee) opens Expenses SaaS. Acme's IT has configured SAML SSO with Okta." />
      <StepControls ctrl={ctrl} />

      <AssertionExplorer />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-x-auto">
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">SAML 2.0 vs OpenID Connect</h3>
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400"><th className="py-1 pr-3" /><th className="py-1 pr-3">SAML 2.0</th><th className="py-1">OpenID Connect</th></tr>
          </thead>
          <tbody>
            {COMPARE.map(r => (
              <tr key={r.k} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-3 font-medium text-slate-700 dark:text-slate-300">{r.k}</td>
                <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">{r.saml}</td>
                <td className="py-1.5 text-slate-600 dark:text-slate-400">{r.oidc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InfoCards cards={[
        { title: 'Metadata', body: 'An XML document each side publishes: entity ID, SSO/ACS URLs, supported bindings, and X.509 signing certificates. Exchanged once at setup; refresh it automatically to survive cert rotation.' },
        { title: 'Bindings', body: 'How messages travel: HTTP-Redirect (deflated + base64 in the URL, used for the small AuthnRequest), HTTP-POST (auto-submitting form, used for the large Response), and rarer Artifact/SOAP.' },
        { title: 'NameID formats', body: 'emailAddress (readable but changeable), persistent (opaque, stable per SP — the safest key), transient (new every login, for anonymous access).' },
        { title: 'Single Logout (SLO)', body: 'LogoutRequest/LogoutResponse messages bounced through the browser to every SP with a session. Notoriously fragile — one SP failing breaks the chain.' },
      ]} />

      <CodeTabs examples={CODE} doubts={DOUBTS} />
    </div>
  )
}
