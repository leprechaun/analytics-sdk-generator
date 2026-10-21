import TrackingPlan from './TrackingPlan'
import { generate } from './test-helpers/generate'

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

    // Until Pages are generated
    it.each([
      ['declared in `on:`', { on: ['page'] }],
      ['by default, without `on:`', {}]
    ])('rejects the Page kind, %s', (_, login) => {
      expect(() => new TrackingPlan({ views: { Login: login } })).toThrow('Pages are not supported yet: Login')
    })
  })
})
