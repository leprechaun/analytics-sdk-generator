import TrackingPlan from './TrackingPlan'
import { generate, sourceParameterOf } from './test-helpers/generate'

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
    const view = () => generate({ tracks, views: { Login: login } })['views/Login']

    it('generates one helper that reports a View event, filling in its own `view`', () => {
      expect(generate({ views: { Login: {} } })['views/Login']).toMatch(
        /console\.log\("view", "Login", props, \{\s*view: "Login",\s*\.\.\.source\s*\}\)/
      )
    })

    it('accepts only its own `view`, and an optional `url`, in its Source', () => {
      expect(sourceParameterOf(view(), 'default')).toEqual(
        '{ widget?: string; element?: string; action?: string; view?: "Login"; url?: string; }'
      )
    })

    it('exports its Tracks, filling in its `view`', () => {
      expect(view()).toMatch(
        /export const LoginFailed = [^]*?console\.log\("track", "LoginFailed", props, \{\s*view: "Login",\s*\.\.\.source\s*\}\)/
      )
      expect(sourceParameterOf(view(), 'LoginFailed')).toEqual(
        '{ widget?: string; element?: string; action?: string; view?: "Login"; url?: string; }'
      )
    })

    it('generates no Screen or Page helpers', () => {
      expect(Object.keys(generate({ tracks, views: { Login: login } }))).toEqual(
        expect.not.arrayContaining([expect.stringMatching(/^(screens|pages)\//)])
      )
    })
  })

  describe('Tracks not tied to one View', () => {
    const tracksFile = (plan: unknown) => generate(plan)['tracks']

    it('fill in the View of a Track on exactly one', () => {
      expect(tracksFile({ tracks, views: { Login: login } })).toMatch(
        /console\.log\("track", "LoginFailed", props, \{\s*view: "Login",\s*\.\.\.source\s*\}\)/
      )
    })

    it('must name one of the Views a Track is on', () => {
      const plan = { tracks, views: { Login: login, Signup: { tracks: ['LoginFailed'] } } }

      expect(sourceParameterOf(tracksFile(plan), 'LoginFailed')).toEqual(
        '{ widget?: string; element?: string; action?: string; view: "Login" | "Signup"; url?: string; }'
      )
    })

    it('must name any View when a Track is on none', () => {
      const plan = { tracks, views: { Splash: {} } }

      expect(sourceParameterOf(tracksFile(plan), 'LoginFailed')).toEqual(
        '{ widget?: string; element?: string; action?: string; view: shared.ViewNames; url?: string; }'
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
