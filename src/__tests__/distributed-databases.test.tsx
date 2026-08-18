import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DistributedDatabasesVisualizer from '@/modules/system-design/distributed-databases'

describe('distributed database simulations', () => {
  it('steps through replacement after a replica failure', () => {
    render(<DistributedDatabasesVisualizer />)

    expect(screen.getByText('Healthy replica group')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fail A3' }))
    expect(screen.getByText('A3 stops responding')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Automation provisions A4')).toBeTruthy()
  })
})
