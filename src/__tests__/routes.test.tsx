import { describe, it, expect } from 'vitest'
import { matchRoutes } from 'react-router-dom'
import { appRoutes } from '@/App'
import { registry, flatModules } from '@/registry'

const resolve = (pathname: string) => {
  const matches = matchRoutes(appRoutes, { pathname })
  return matches?.[matches.length - 1]?.route
}

describe('registry ↔ router consistency', () => {
  it('routes every section index page', () => {
    for (const section of registry) {
      const route = resolve(section.path)
      expect(route, `${section.path} did not match any route`).toBeTruthy()
      expect(route!.path, `${section.path} fell through to the 404 catch-all`).not.toBe('*')
    }
  })

  it('routes every module page', () => {
    for (const { sub } of flatModules) {
      const route = resolve(sub.path)
      expect(route, `${sub.path} did not match any route`).toBeTruthy()
      expect(route!.path, `${sub.path} fell through to the 404 catch-all`).not.toBe('*')
    }
  })

  it('sends unknown paths to the 404 catch-all', () => {
    expect(resolve('/definitely-not-a-page')?.path).toBe('*')
    expect(resolve('/algorithms/nope')?.path).toBe('*')
  })
})
