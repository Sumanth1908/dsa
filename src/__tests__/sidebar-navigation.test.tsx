import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Sidebar from '@/components/layout/Sidebar'

function CurrentPath() {
  return <output aria-label="Current path">{useLocation().pathname}</output>
}

const renderSidebar = () => render(
  <MemoryRouter initialEntries={['/system-design/distributed-databases']}>
    <Sidebar collapsed={false} onToggle={() => {}} />
    <CurrentPath />
  </MemoryRouter>
)

describe('sidebar section navigation', () => {
  it('allows an active section to collapse and expand', () => {
    renderSidebar()
    expect(screen.getByText('Distributed Databases')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse System Design' }))
    expect(screen.queryByText('Distributed Databases')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand System Design' }))
    expect(screen.getByText('Distributed Databases')).toBeTruthy()
  })

  it('navigates the section title to its overview page', () => {
    renderSidebar()
    fireEvent.click(screen.getByTitle('Open System Design overview'))
    expect(screen.getByLabelText('Current path').textContent).toBe('/system-design')
  })
})
