import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SectionIndex from '@/components/shared/SectionIndex'

describe('category overview colors', () => {
  it('uses one calm accent within and across categories', () => {
    const dataStructures = render(
      <MemoryRouter initialEntries={['/data-structures']}>
        <SectionIndex />
      </MemoryRouter>
    )

    const arrayTitle = screen.getByRole('heading', { name: /Array/ })
    const linkedListTitle = screen.getByRole('heading', { name: /Linked List/ })

    expect(arrayTitle.className).toBe(linkedListTitle.className)

    const sharedAccent = arrayTitle.className
    dataStructures.unmount()

    render(
      <MemoryRouter initialEntries={['/algorithms']}>
        <SectionIndex />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: /Bubble Sort/ }).className).toBe(sharedAccent)
  })
})
