import { describe, it, expect } from 'vitest'
import { registry, groups, flatModules } from '@/registry'

describe('registry consistency', () => {
  it('has unique section ids and paths', () => {
    const ids = registry.map(s => s.id)
    const paths = registry.map(s => s.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('has globally unique subcategory paths', () => {
    const paths = flatModules.map(m => m.sub.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('nests every subcategory path under its section path', () => {
    for (const section of registry) {
      for (const sub of section.subcategories) {
        expect(sub.path.startsWith(section.path + '/'), `${sub.path} not under ${section.path}`).toBe(true)
      }
    }
  })

  it('assigns every section to a known group', () => {
    const groupIds = new Set(groups.map(g => g.id))
    for (const section of registry) {
      expect(groupIds.has(section.group), `${section.id} has unknown group ${section.group}`).toBe(true)
    }
  })

  it('gives every section a story and every subcategory a description', () => {
    for (const section of registry) {
      expect(section.story.length, `${section.id} missing story`).toBeGreaterThan(50)
      for (const sub of section.subcategories) {
        expect(sub.description.length, `${sub.id} missing description`).toBeGreaterThan(10)
      }
    }
  })
})
