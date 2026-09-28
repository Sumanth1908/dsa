import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DatabaseIndexesVisualizer from '@/modules/system-design/database-indexes'
import { registry } from '@/registry'

describe('database index selection', () => {
  it('recommends an index based on the selected query shape', () => {
    render(<DatabaseIndexesVisualizer />)

    expect(screen.getByRole('heading', { name: 'Composite B-tree on (customer_id, created_at DESC)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: /Search product text/ }))
    expect(screen.getByRole('heading', { name: 'Inverted/full-text index' })).toBeTruthy()
  })

  it('updates lookup cost when table size changes', () => {
    render(<DatabaseIndexesVisualizer />)
    fireEvent.click(screen.getByRole('button', { name: '1B rows' }))
    expect(screen.getByText('up to 1B')).toBeTruthy()
  })

  it('explains document-database index styles interactively', () => {
    render(<DatabaseIndexesVisualizer />)
    expect(screen.getByRole('heading', { name: 'Multikey / array' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /TTL \/ expiry/ }))
    expect(screen.getByText(/Automatically expire documents/)).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /GSI \/ LSI access path/ }))
    expect(screen.getByText(/a GSI can use a different partition key/)).toBeTruthy()
  })

  it('walks through concrete index entries for each family', () => {
    render(<DatabaseIndexesVisualizer />)

    expect(screen.getByText(/wireless → \[17, 24\]/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Bitmap' }))
    expect(screen.getByText(/rows 1 and 4/)).toBeTruthy()
  })

  it('is discoverable by the main index families', () => {
    const databaseIndexes = registry
      .flatMap(section => section.subcategories)
      .find(topic => topic.id === 'database-indexes')

    expect(databaseIndexes?.tags).toEqual(expect.arrayContaining([
      'inverted index',
      'B-tree',
      'hash index',
      'bitmap index',
      'spatial index',
      'BRIN',
    ]))
  })
})
