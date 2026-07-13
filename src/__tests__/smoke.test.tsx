import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '@/modules/home/HomePage'
import SectionIndex from '@/components/shared/SectionIndex'
import ModuleNav from '@/components/shared/ModuleNav'
import CreationalPatternsViz from '@/modules/design-patterns/creational'
import StructuralPatternsViz from '@/modules/design-patterns/structural'
import BehavioralPatternsViz from '@/modules/design-patterns/behavioral'
import MonotonicStackViz from '@/modules/patterns/monotonic-stack'

const at = (path: string, ui: React.ReactElement) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

describe('page smoke tests', () => {
  it('renders the home page journey', () => {
    at('/', <HomePage />)
    expect(screen.getByText('Foundations')).toBeTruthy()
    expect(screen.getByText('Systems & Scale')).toBeTruthy()
    expect(screen.getByText('Start with Arrays')).toBeTruthy()
  })

  it('renders a section index from the registry', () => {
    at('/design-patterns', <SectionIndex />)
    expect(screen.getByRole('heading', { name: /Design Patterns/ })).toBeTruthy()
    expect(screen.getByText('Creational Patterns')).toBeTruthy()
    expect(screen.getByText('Behavioral Patterns')).toBeTruthy()
  })

  it('shows prev/next neighbours on a module page', () => {
    at('/algorithms/heap-sort', <ModuleNav />)
    expect(screen.getByText('Quick Sort')).toBeTruthy()   // previous
    expect(screen.getByText('Binary Search')).toBeTruthy() // next
    expect(screen.getByText(/All Algorithms/)).toBeTruthy()
  })

  it('hides ModuleNav on non-module pages', () => {
    const { container } = at('/design-patterns', <ModuleNav />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the creational patterns visualizer', () => {
    render(<CreationalPatternsViz />)
    expect(screen.getByRole('heading', { name: 'Creational Patterns' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Singleton' })).toBeTruthy()
  })

  it('renders the structural patterns visualizer', () => {
    render(<StructuralPatternsViz />)
    expect(screen.getByRole('heading', { name: 'Structural Patterns' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Decorator' })).toBeTruthy()
  })

  it('renders the behavioral patterns visualizer', () => {
    render(<BehavioralPatternsViz />)
    expect(screen.getByRole('heading', { name: 'Behavioral Patterns' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeTruthy()
  })

  it('renders a useSteps-based visualizer', () => {
    render(<MonotonicStackViz />)
    expect(screen.getByRole('heading', { name: 'Monotonic Stack' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next step' })).toBeTruthy()
  })
})
