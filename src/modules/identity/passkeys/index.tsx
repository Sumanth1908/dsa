import { useState } from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'
import type { CodeExample } from '@/components/shared/CodeBlock'
import FlowDiagram, { Actor, FlowMsg, VariantPicker, StoryPanel, KeyIdea, InfoCards } from '../shared/FlowDiagram'

type Ceremony = 'register' | 'login'

const ACTORS: Actor[] = [
  { id: 'auth', label: 'Authenticator', icon: '🔑', color: '#8b5cf6', sub: 'phone · Touch ID · YubiKey' },
  { id: 'browser', label: 'Browser', icon: '🌐', color: '#0ea5e9', sub: 'WebAuthn API' },
  { id: 'rp', label: 'Relying Party', icon: '🏦', color: '#0d9488', sub: 'bank.example server' },
]

const CEREMONIES: Record<Ceremony, { label: string; story: string; intro: string; msgs: FlowMsg[] }> = {
  register: {
    label: 'Register a passkey',
    story: 'Getting a new lock fitted. The bank gives you a fresh challenge ("prove you\'re really here, right now"). Your phone forges a brand-new key pair just for bank.example: the private half stays welded inside your phone forever, and only the padlock (public key) is handed to the bank. The bank can lock things with it, but can never make a copy of your key.',
    intro: 'Mei is already signed in (or signing up) and clicks "Create a passkey".',
    msgs: [
      { from: 'browser', to: 'rp', label: 'POST /passkeys/register/options', channel: 'back', note: 'Ask the server to start a registration ceremony.' },
      { from: 'rp', to: 'browser', label: 'creation options + challenge', channel: 'back', note: 'A random one-time challenge (stored server-side), the RP ID (the domain the key will be bound to), the user handle, and acceptable algorithms.', payload: '{\n  "challenge": "Y2hhbGxlbmdlLTlmMmM3MWUw…",      // random, single-use\n  "rp":   { "id": "bank.example", "name": "Example Bank" },\n  "user": { "id": "dXNlci00Mg", "name": "mei@example.com", "displayName": "Mei" },\n  "pubKeyCredParams": [{ "type": "public-key", "alg": -7 },     // ES256\n                       { "type": "public-key", "alg": -257 }],  // RS256\n  "authenticatorSelection": { "residentKey": "required", "userVerification": "preferred" },\n  "excludeCredentials": [ /* keys Mei already has — avoid duplicates */ ]\n}' },
      { from: 'browser', to: 'browser', label: 'navigator.credentials.create()', channel: 'local', note: 'The browser checks rp.id is the current site (or a parent domain of it) and builds clientDataJSON, which records the REAL origin — the page cannot lie about it.', payload: 'clientDataJSON = {\n  "type": "webauthn.create",\n  "challenge": "Y2hhbGxlbmdlLTlmMmM3MWUw…",\n  "origin": "https://bank.example"     // filled in by the browser, not the page\n}' },
      { from: 'browser', to: 'auth', label: 'makeCredential(rpIdHash, …)', channel: 'front', note: 'The browser asks the authenticator (built-in, phone via QR/Bluetooth, or USB key) to create a credential.' },
      { from: 'auth', to: 'auth', label: 'Face ID ✓ → new key pair', channel: 'local', note: 'User verification (biometric or PIN) happens ON the device — the biometric never leaves it. A new key pair is generated, scoped to bank.example. The private key never leaves the secure hardware (or the synced, end-to-end-encrypted keychain).' },
      { from: 'auth', to: 'browser', label: 'credentialId + public key', channel: 'front', note: 'Returns the attestation object: authenticator data (rpIdHash, flags UP/UV, counter) + credential ID + PUBLIC key.' },
      { from: 'browser', to: 'rp', label: 'POST /register/verify', channel: 'back', note: 'Send clientDataJSON + attestationObject to the server.' },
      { from: 'rp', to: 'rp', label: 'verify + store public key', channel: 'local', note: 'Check challenge matches & unused, origin === https://bank.example, rpIdHash === SHA256("bank.example"), user-verified flag set. Store { credentialId, publicKey, signCount, userId }. Nothing secret is stored — a database leak exposes only public keys.' },
    ],
  },
  login: {
    label: 'Sign in with a passkey',
    story: 'The bank holds out a random puzzle. Only the key in your phone can sign it, and your phone only lets you sign after it sees your face. The bank checks the signature with the padlock it already has. No secret ever crossed the wire — there was nothing to type, nothing to steal, and nothing that would work on a fake bank website.',
    intro: 'Mei visits bank.example on a new laptop and picks "Sign in with a passkey".',
    msgs: [
      { from: 'browser', to: 'rp', label: 'POST /passkeys/login/options', channel: 'back', note: 'Start an authentication ceremony.' },
      { from: 'rp', to: 'browser', label: 'request options + challenge', channel: 'back', note: 'A fresh challenge. allowCredentials can be empty: with discoverable credentials the authenticator itself knows which accounts it has for bank.example — no username needed.', payload: '{\n  "challenge": "bG9naW4tY2hhbGxlbmdlLWE3…",\n  "rpId": "bank.example",\n  "allowCredentials": [],          // discoverable → usernameless login\n  "userVerification": "preferred",\n  "timeout": 60000\n}' },
      { from: 'browser', to: 'auth', label: 'getAssertion(rpIdHash, clientDataHash)', channel: 'front', note: 'The browser only allows rpId = the current site\'s domain. A phishing page on bank-example-login.com literally cannot ask for bank.example\'s passkey — that\'s phishing resistance built into the protocol.' },
      { from: 'auth', to: 'auth', label: 'fingerprint ✓ → sign', channel: 'local', note: 'Mei verifies with her fingerprint. The authenticator signs authenticatorData ‖ SHA256(clientDataJSON) with the private key for bank.example.', payload: 'signature = Sign(privateKey_bank.example,\n                 authenticatorData || SHA256(clientDataJSON))\n\nauthenticatorData = rpIdHash | flags(UP=1, UV=1) | signCount' },
      { from: 'auth', to: 'browser', label: 'assertion (signature)', channel: 'front', note: 'Credential ID, authenticatorData, signature, and userHandle (which user this passkey belongs to).' },
      { from: 'browser', to: 'rp', label: 'POST /login/verify', channel: 'back', note: 'Send the assertion to the server.' },
      { from: 'rp', to: 'rp', label: 'verify signature w/ public key', channel: 'local', note: 'Look up the stored public key by credential ID. Verify the signature, challenge, origin, rpIdHash, UV flag, and that signCount increased (a cloned hardware key would repeat counts; synced passkeys often report 0).' },
      { from: 'rp', to: 'browser', label: 'Set-Cookie: session', channel: 'back', note: 'Mei is signed in — phishing-resistant, and it counts as multi-factor in one gesture: something you HAVE (the device) + something you ARE/KNOW (biometric/PIN).' },
    ],
  },
}

const CODE: Record<Ceremony, CodeExample[]> = {
  register: [
    { lang: 'javascript', label: 'Browser + Node (SimpleWebAuthn)', code: `// ───────── server (Node) ─────────
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'

const rpID = 'bank.example'
const origin = 'https://bank.example'

app.post('/passkeys/register/options', async (req, res) => {
  const user = req.user
  const options = await generateRegistrationOptions({
    rpName: 'Example Bank',
    rpID,
    userName: user.email,
    attestationType: 'none',
    excludeCredentials: user.passkeys.map(p => ({ id: p.credentialId })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  })
  req.session.challenge = options.challenge          // remember for verification
  res.json(options)
})

app.post('/passkeys/register/verify', async (req, res) => {
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: req.session.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  })
  delete req.session.challenge                       // single use
  if (!verified) return res.sendStatus(400)

  const { credential } = registrationInfo
  await db.passkeys.insert({
    userId: req.user.id,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),    // public — safe to store
    counter: credential.counter,
  })
  res.json({ ok: true })
})

// ───────── browser ─────────
import { startRegistration } from '@simplewebauthn/browser'

const options = await fetch('/passkeys/register/options', { method: 'POST' }).then(r => r.json())
const attestation = await startRegistration({ optionsJSON: options })  // → navigator.credentials.create()
await fetch('/passkeys/register/verify', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attestation),
})` },
    { lang: 'python', label: 'Python (py_webauthn)', code: `from webauthn import (generate_registration_options, verify_registration_response,
                      options_to_json)
from webauthn.helpers.structs import (AuthenticatorSelectionCriteria, ResidentKeyRequirement,
                                      UserVerificationRequirement, PublicKeyCredentialDescriptor)

RP_ID = "bank.example"
ORIGIN = "https://bank.example"

@app.post("/passkeys/register/options")
def register_options():
    user = current_user()
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name="Example Bank",
        user_id=user.handle,                     # random bytes, not the email
        user_name=user.email,
        exclude_credentials=[PublicKeyCredentialDescriptor(id=p.credential_id) for p in user.passkeys],
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    session["challenge"] = options.challenge
    return options_to_json(options)

@app.post("/passkeys/register/verify")
def register_verify():
    verification = verify_registration_response(
        credential=request.get_json(),
        expected_challenge=session.pop("challenge"),   # single use
        expected_origin=ORIGIN,
        expected_rp_id=RP_ID,
        require_user_verification=True,
    )
    db.save_passkey(
        user_id=current_user().id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
    )
    return {"ok": True}` },
    { lang: 'java', label: 'Java (Yubico webauthn-server)', code: `RelyingParty rp = RelyingParty.builder()
    .identity(RelyingPartyIdentity.builder().id("bank.example").name("Example Bank").build())
    .credentialRepository(passkeyRepository)          // your DB adapter
    .origins(Set.of("https://bank.example"))
    .build();

@PostMapping("/passkeys/register/options")
String registerOptions(HttpSession session, @AuthenticationPrincipal AppUser user) throws Exception {
    PublicKeyCredentialCreationOptions options = rp.startRegistration(
        StartRegistrationOptions.builder()
            .user(UserIdentity.builder()
                .name(user.email()).displayName(user.name())
                .id(new ByteArray(user.handle()))
                .build())
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .residentKey(ResidentKeyRequirement.REQUIRED)
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .build());
    session.setAttribute("reg", options);              // contains the challenge
    return options.toCredentialsCreateJson();
}

@PostMapping("/passkeys/register/verify")
void registerVerify(@RequestBody String body, HttpSession session) throws Exception {
    var options = (PublicKeyCredentialCreationOptions) session.getAttribute("reg");
    session.removeAttribute("reg");
    var credential = PublicKeyCredential.parseRegistrationResponseJson(body);
    RegistrationResult result = rp.finishRegistration(FinishRegistrationOptions.builder()
        .request(options).response(credential).build());   // checks challenge, origin, rpId
    passkeyRepository.save(options.getUser().getId(), result.getKeyId().getId(),
                           result.getPublicKeyCose(), result.getSignatureCount());
}` },
  ],
  login: [
    { lang: 'javascript', label: 'Browser + Node (SimpleWebAuthn)', code: `// ───────── server (Node) ─────────
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'

app.post('/passkeys/login/options', async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: 'bank.example',
    allowCredentials: [],                 // discoverable credentials: no username needed
    userVerification: 'preferred',
  })
  req.session.challenge = options.challenge
  res.json(options)
})

app.post('/passkeys/login/verify', async (req, res) => {
  const passkey = await db.passkeys.findByCredentialId(req.body.id)
  if (!passkey) return res.sendStatus(401)

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: req.session.challenge,
    expectedOrigin: 'https://bank.example',
    expectedRPID: 'bank.example',
    credential: { id: passkey.credentialId, publicKey: passkey.publicKey, counter: passkey.counter },
    requireUserVerification: true,
  })
  delete req.session.challenge
  if (!verified) return res.sendStatus(401)

  await db.passkeys.updateCounter(passkey.credentialId, authenticationInfo.newCounter)
  req.session.regenerate(() => {
    req.session.userId = passkey.userId
    res.json({ ok: true })
  })
})

// ───────── browser ─────────
import { startAuthentication } from '@simplewebauthn/browser'

const options = await fetch('/passkeys/login/options', { method: 'POST' }).then(r => r.json())
const assertion = await startAuthentication({ optionsJSON: options })   // → navigator.credentials.get()
await fetch('/passkeys/login/verify', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assertion),
})

// Bonus: offer passkeys in the browser's username autofill dropdown
// <input autocomplete="username webauthn">  +  startAuthentication({ optionsJSON, useBrowserAutofill: true })` },
    { lang: 'python', label: 'Python (py_webauthn)', code: `from webauthn import (generate_authentication_options, verify_authentication_response,
                      options_to_json)
from webauthn.helpers import base64url_to_bytes
from webauthn.helpers.structs import UserVerificationRequirement

@app.post("/passkeys/login/options")
def login_options():
    options = generate_authentication_options(
        rp_id="bank.example",
        user_verification=UserVerificationRequirement.PREFERRED,
        # allow_credentials omitted → discoverable / usernameless
    )
    session["challenge"] = options.challenge
    return options_to_json(options)

@app.post("/passkeys/login/verify")
def login_verify():
    body = request.get_json()
    passkey = db.find_passkey(base64url_to_bytes(body["rawId"]))
    if passkey is None:
        abort(401)

    verification = verify_authentication_response(
        credential=body,
        expected_challenge=session.pop("challenge"),
        expected_origin="https://bank.example",
        expected_rp_id="bank.example",
        credential_public_key=passkey.public_key,
        credential_current_sign_count=passkey.sign_count,
        require_user_verification=True,
    )
    db.update_sign_count(passkey.credential_id, verification.new_sign_count)
    session.clear()
    session["user_id"] = passkey.user_id
    return {"ok": True}` },
    { lang: 'java', label: 'Java (Yubico webauthn-server)', code: `@PostMapping("/passkeys/login/options")
String loginOptions(HttpSession session) throws Exception {
    AssertionRequest request = rp.startAssertion(StartAssertionOptions.builder()
        .userVerification(UserVerificationRequirement.PREFERRED)
        .build());                                     // no username → discoverable credentials
    session.setAttribute("assertion", request);
    return request.toCredentialsGetJson();
}

@PostMapping("/passkeys/login/verify")
void loginVerify(@RequestBody String body, HttpSession session, HttpServletRequest http) throws Exception {
    var request = (AssertionRequest) session.getAttribute("assertion");
    session.removeAttribute("assertion");

    var credential = PublicKeyCredential.parseAssertionResponseJson(body);
    AssertionResult result = rp.finishAssertion(FinishAssertionOptions.builder()
        .request(request).response(credential).build());
    // verifies signature with the stored public key, challenge, origin, rpIdHash, counter

    if (!result.isSuccess()) throw new BadCredentialsException("passkey verification failed");
    passkeyRepository.updateSignatureCount(result.getCredential().getCredentialId(),
                                           result.getSignatureCount());
    http.changeSessionId();                            // fresh session ID on login
    session.setAttribute("userHandle", result.getCredential().getUserHandle());
}` },
  ],
}

const DOUBTS: Record<Ceremony, { q: string; a: string }[]> = {
  register: [
    { q: 'Is my fingerprint sent to the website?', a: 'No. Biometrics only **unlock** the private key locally on the device. The website receives a flag (`UV=1`, "user was verified") and a public key — never a fingerprint, face template or PIN.' },
    { q: 'What happens if I lose my phone?', a: 'Modern passkeys are usually **synced** through an end-to-end-encrypted keychain (iCloud Keychain, Google Password Manager, 1Password…), so a new device restores them. Device-bound passkeys (e.g. a YubiKey) don\'t sync — register at least two, and keep an account-recovery path (another passkey, recovery codes, verified email + extra checks).' },
    { q: 'What is attestation, and do I need it?', a: 'Attestation is the authenticator proving its make and model (signed by the manufacturer). Most consumer sites use `attestation: "none"` — they don\'t care which device you use. High-assurance enterprise or government deployments may require it to allow only certified hardware keys.' },
  ],
  login: [
    { q: 'Why exactly can\'t passkeys be phished?', a: 'Three reasons. (1) The **browser** enforces that a page can only request credentials for its own domain — `bank-example-login.com` can\'t ask for `bank.example`\'s passkey. (2) The signed `clientDataJSON` contains the **real origin**, so even a relayed signature fails the server\'s origin check. (3) There is **no shared secret** to type into a fake form. Passwords and SMS/TOTP codes fail all three.' },
    { q: 'If the server\'s database leaks, what do attackers get?', a: 'Public keys and credential IDs. They can\'t be used to sign in anywhere — unlike password hashes, which get cracked offline, and unlike passwords, which get reused across sites. That is a huge change in breach impact.' },
    { q: 'Passkey vs "security key" vs FIDO2 vs WebAuthn?', a: '**WebAuthn** is the W3C browser API. **CTAP2** is how the browser talks to an external authenticator. Together they are **FIDO2**. A **passkey** is the consumer name for a FIDO2 **discoverable** credential, usually synced. A **security key** is a hardware device (YubiKey) that stores FIDO credentials. Same cryptography underneath.' },
  ],
}

function PhishingDemo() {
  const [site, setSite] = useState<'real' | 'fake'>('fake')
  const origin = site === 'real' ? 'https://bank.example' : 'https://bank-example-login.com'
  return (
    <div className="viz-container p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">🎣 Phishing test: password vs passkey</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mei clicked a link in an email. Which site is she really on?</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSite('real')} aria-pressed={site === 'real'} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${site === 'real' ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>bank.example (real)</button>
        <button onClick={() => setSite('fake')} aria-pressed={site === 'fake'} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${site === 'fake' ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>bank-example-login.com (phish)</button>
      </div>
      <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">🔒 {origin}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className={`rounded-lg border p-3 text-sm ${site === 'fake' ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300' : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'}`}>
          <div className="font-semibold mb-1">🔤 Password + SMS code</div>
          {site === 'fake'
            ? 'The page looks identical. Mei types her password and the 6-digit SMS code. The attacker relays both to the real bank in real time. Account taken over.'
            : 'Works — but nothing technical stopped her from typing the same secrets into a look-alike page yesterday.'}
        </div>
        <div className="rounded-lg border p-3 text-sm border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
          <div className="font-semibold mb-1">🔑 Passkey</div>
          {site === 'fake'
            ? 'The browser looks for passkeys for bank-example-login.com and finds none. Mei\'s bank.example passkey is never offered. Even a relayed attempt fails: the signed origin would say bank-example-login.com.'
            : 'The browser finds Mei\'s passkey for bank.example, she touches the sensor, done. Nothing to type, nothing to steal.'}
        </div>
      </div>
    </div>
  )
}

export default function PasskeysVisualizer() {
  const [cer, setCer] = useState<Ceremony>('register')
  const def = CEREMONIES[cer]
  const ctrl = useSteps(def.msgs.length + 1)
  const pick = (c: Ceremony) => { setCer(c); ctrl.reset() }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Passkeys &amp; WebAuthn</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Passwordless login with public-key cryptography — the FIDO2 registration and authentication ceremonies, and why phishing stops working
        </p>
      </div>

      <StoryPanel>
        <p>
          A password is a <strong>secret word</strong> you whisper to a guard. Anyone who overhears it — or anyone dressed up as the
          guard — can use it too. And you’ve probably told the same word to a hundred guards.
        </p>
        <p>
          A passkey is a <strong>wax seal</strong> that only you own, with a different seal for every building. The guard keeps a
          picture of your seal, shows you a fresh piece of paper, and you stamp it. The guard can check the stamp against the
          picture but can never make your seal. And your seal for the bank simply refuses to stamp papers from a building that
          isn’t the bank.
        </p>
      </StoryPanel>

      <MemoryTip>
        <strong>Private key stays home, public key goes to the server, challenge gets signed.</strong> One key pair per website — bound to its domain.
      </MemoryTip>

      <KeyIdea>
        <p>
          WebAuthn (W3C) + CTAP2 (FIDO Alliance) = <strong>FIDO2</strong>. At registration, an <strong>authenticator</strong> creates a
          key pair scoped to the site’s <strong>RP ID</strong> (its domain) and gives the server only the public key. At sign-in, the
          server sends a random <strong>challenge</strong>, the authenticator signs it after <strong>user verification</strong>{' '}
          (biometric/PIN), and the server verifies with the stored public key. The browser stamps the real <strong>origin</strong> into
          what gets signed — which is what makes passkeys phishing-resistant, and why they can replace both the password and the
          second factor at once.
        </p>
      </KeyIdea>

      <div className="space-y-3">
        <VariantPicker options={(Object.keys(CEREMONIES) as Ceremony[]).map(id => ({ id, label: CEREMONIES[id].label }))} value={cer} onChange={pick} />
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">{def.story}</div>
      </div>

      <FlowDiagram actors={ACTORS} msgs={def.msgs} step={ctrl.step} intro={def.intro} />
      <StepControls ctrl={ctrl} />

      <PhishingDemo />

      <InfoCards cards={[
        { title: 'Synced vs device-bound', body: 'Synced passkeys live in your platform keychain and follow you to new devices. Device-bound ones (hardware security keys) never leave the chip — higher assurance, but plan for loss.' },
        { title: 'Cross-device sign-in', body: 'On a laptop with no passkey, the browser shows a QR code; scan it with your phone, which proves proximity over Bluetooth and signs the challenge. The key never leaves the phone.' },
        { title: 'Discoverable credentials', body: 'The authenticator stores the user handle, so login needs no username: the site calls get() with empty allowCredentials and the user just picks an account.' },
        { title: 'Rolling out', body: 'Offer "create a passkey" after a normal login, show passkeys in username autofill (autocomplete="webauthn"), keep a fallback while adoption grows, and treat passkey login as MFA-equivalent.' },
      ]} />

      <CodeTabs examples={CODE[cer]} doubts={DOUBTS[cer]} />
    </div>
  )
}
