import TrackingPlan from './TrackingPlan'
import { generate, sourceParameterOf } from './test-helpers/generate'

describe('Views', () => {
  const tracks = {
    LoginFailed: { properties: { reason: { type: 'string' } } }
  }

  const login = {
    description: 'Prompts for login',
    features: ['Onboarding'],
    tracks: ['LoginFailed'],
    properties: { first_visit: { type: 'boolean' } }
  }

  describe('a View appearing only as a Screen', () => {
    it('generates the same as the equivalent `screens:` entry', () => {
      expect(generate({ tracks, views: { Login: { ...login, on: ['screen'] } } })).toEqual(
        generate({ tracks, screens: { Login: login } })
      )
    })

    it('can be declared alongside `screens:`', () => {
      const files = generate({ tracks, screens: { Splash: {} }, views: { Login: { ...login, on: ['screen'] } } })

      expect(Object.keys(files)).toEqual(expect.arrayContaining(['screens/Splash', 'screens/Login']))
      expect(files['shared-definitions']).toContain('export type ScreenNames = "Splash" | "Login";')
    })
  })

  describe('a View appearing only as a Page', () => {
    const files = () => generate({ tracks, views: { Login: { ...login, on: ['page'] } } })

    it('generates a Page helper, and no Screen helper', () => {
      expect(Object.keys(files())).toContain('pages/Login')
      expect(Object.keys(files())).not.toContain('screens/Login')
    })

    it('reports a Page view, filling in its own `page`', () => {
      expect(files()['pages/Login']).toMatch(
        /console\.log\("page", "Login", props, \{\s*page: "Login",\s*feature: "Onboarding",\s*\.\.\.source\s*\}\)/
      )
    })

    it('accepts only its own `page`, and an optional `url`, in its Source', () => {
      expect(sourceParameterOf(files()['pages/Login'], 'default')).toEqual(
        '{ widget?: string; element?: string; action?: string; page?: "Login"; url?: string; feature?: "Onboarding"; }'
      )
    })
  })

  describe('a View without `on:`', () => {
    it('generates both a Screen helper and a Page helper', () => {
      expect(Object.keys(generate({ tracks, views: { Login: login } }))).toEqual(
        expect.arrayContaining(['screens/Login', 'pages/Login'])
      )
    })
  })

  describe('name lists', () => {
    const sharedDefinitions = (plan: unknown) => generate(plan)['shared-definitions']

    it('lists Views appearing as Pages in `PageNames`, and every View in `ViewNames`', () => {
      const plan = { screens: { Splash: {} }, views: { Login: {}, FarmMap: { on: ['page'] } } }

      expect(sharedDefinitions(plan)).toContain('export type PageNames = "Login" | "FarmMap";')
      expect(sharedDefinitions(plan)).toContain('export type ViewNames = "Splash" | "Login" | "FarmMap";')
    })

    it('generates `PageNames` as `never` without Pages', () => {
      expect(sharedDefinitions({ screens: { Splash: {} } })).toContain('export type PageNames = never;')
    })
  })

  describe('declaration errors', () => {
    it('rejects a name declared in both `views:` and `screens:`', () => {
      const plan = { screens: { Login: {} }, views: { Login: { on: ['screen'] } } }

      expect(() => new TrackingPlan(plan)).toThrow(
        'View declared in both `screens` and `views`: Login'
      )
    })

    it('rejects an unknown kind in `on:`', () => {
      const plan = { views: { Login: { on: ['screen', 'tablet'] } } }

      expect(() => new TrackingPlan(plan)).toThrow('Unknown kind in `on` for View Login: tablet')
    })
  })
})
