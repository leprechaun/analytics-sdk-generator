import TrackingPlan from './TrackingPlan'
import { generate } from './test-helpers/generate'

describe('Views', () => {
  const tracks = {
    LoginFailed: { properties: { reason: { type: 'string' } } }
  }

  const login = {
    description: 'Prompts for login',
    tracks: ['LoginFailed'],
    properties: { first_visit: { type: 'boolean' } }
  }

  describe('a View', () => {
    it('generates one helper file, and no Screen or Page helpers', () => {
      expect(Object.keys(generate({ tracks, views: { Login: login } }))).toEqual(
        ['shared-definitions', 'tracks', 'views/Login', 'shared-traits']
      )
    })
  })

  describe('name lists', () => {
    const sharedDefinitions = (plan: unknown) => generate(plan)['shared-definitions']

    it('lists every View in `ViewNames`, and no Screen, Page or Feature names', () => {
      const definitions = sharedDefinitions({ views: { Login: {}, FarmMap: {} } })

      expect(definitions).toContain('export type ViewNames = "Login" | "FarmMap";')
      expect(definitions).not.toMatch(/ScreenNames|PageNames|FeatureNames/)
    })

    it('generates `ViewNames` as `never` without Views', () => {
      expect(sharedDefinitions({ tracks })).toContain('export type ViewNames = never;')
    })
  })

  describe('declaration errors', () => {
    it('rejects `screens:`, pointing to `views:`', () => {
      const plan = { screens: { Login: {}, Splash: {} } }

      expect(() => new TrackingPlan(plan)).toThrow(
        '`screens` is no longer supported: declare Login, Splash under `views` instead'
      )
    })

    it('rejects `on:`, since Views no longer have a kind', () => {
      const plan = { views: { Login: { on: ['page'] } } }

      expect(() => new TrackingPlan(plan)).toThrow(
        '`on` is no longer supported: View Login is reported as a Screen or a Page by the Implementation'
      )
    })
  })
})
