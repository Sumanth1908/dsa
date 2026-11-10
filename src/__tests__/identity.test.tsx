import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import IdentityFundamentals from '@/modules/identity/fundamentals'
import OAuth2Visualizer from '@/modules/identity/oauth2'
import OIDCVisualizer from '@/modules/identity/oidc'
import SAMLVisualizer from '@/modules/identity/saml'
import PasskeysVisualizer from '@/modules/identity/passkeys'
import SectionIndex from '@/components/shared/SectionIndex'

describe('identity & access section', () => {
  it('lists every identity module on the section index', () => {
    render(<MemoryRouter initialEntries={['/identity']}><SectionIndex /></MemoryRouter>)
    for (const title of ['Identity Fundamentals', 'OAuth 2.0', 'OpenID Connect', 'SAML 2.0', 'Passkeys & WebAuthn']) {
      expect(screen.getByRole('heading', { name: new RegExp(title) })).toBeTruthy()
    }
  })

  it('switches fundamentals scenarios', () => {
    render(<MemoryRouter><IdentityFundamentals /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Identity Fundamentals' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Federated SSO' }))
    expect(screen.getByText('Company IdP')).toBeTruthy()
  })

  it('steps through the OAuth authorization code flow and switches grants', () => {
    render(<OAuth2Visualizer />)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getAllByText('Connect photos').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Device Code' }))
    expect(screen.getByText('TV App')).toBeTruthy()
  })

  it('rejects a wrong-audience ID token in the OIDC lab', () => {
    render(<OIDCVisualizer />)
    fireEvent.click(screen.getByRole('button', { name: /Wrong audience/ }))
    expect(screen.getByText(/Login rejected at check 3/)).toBeTruthy()
  })

  it('renders the SAML assertion explorer', () => {
    render(<SAMLVisualizer />)
    fireEvent.click(screen.getByRole('button', { name: 'Subject' }))
    expect(screen.getByText(/bearer" confirmation/)).toBeTruthy()
  })

  it('shows passkeys resisting phishing', () => {
    render(<PasskeysVisualizer />)
    expect(screen.getByText(/never offered/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with a passkey' }))
    expect(screen.getByText(/visits bank.example on a new laptop/)).toBeTruthy()
  })
})
