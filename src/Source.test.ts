import TrackingPlan from './TrackingPlan'
import { generate, sourceParameterOf } from './test-helpers/generate'

describe('Source attributes', () => {
  describe('when the Tracking Plan declares a `source:` block', () => {
    const plan = {
      source: {
        properties: {
          campaign: { type: 'string' }
        }
      },
      tracks: {
        SomeTrack: {}
      },
      screens: {
        Home: { features: ['Onboarding'] }
      }
    }

    it('replaces the default Source attributes with the declared ones', () => {
      expect(sourceParameterOf(generate(plan)['tracks'], 'SomeTrack')).toEqual(
        '{ campaign?: string; screen: shared.ScreenNames; feature: shared.FeatureNames; }'
      )
    })

    it('makes Source attributes listed in `required` required', () => {
      const withRequired = { ...plan, source: { ...plan.source, required: ['campaign'] } }

      expect(sourceParameterOf(generate(withRequired)['tracks'], 'SomeTrack')).toEqual(
        '{ campaign: string; screen: shared.ScreenNames; feature: shared.FeatureNames; }'
      )
    })

    it('resolves a `$ref` to `$defs` in Screen helpers', () => {
      const withRef = {
        ...plan,
        $defs: { Campaign: { type: 'string', enum: ['spring', 'autumn'] } },
        source: { properties: { campaign: { $ref: '#/$defs/Campaign' } } }
      }

      expect(sourceParameterOf(generate(withRef)['screens/Home'], 'default')).toEqual(
        '{ campaign?: shared.Campaign; screen?: "Home"; feature?: "Onboarding"; }'
      )
    })
  })

  describe('a Tracking Plan without Screens or Features', () => {
    const plan = { tracks: { SomeTrack: {} } }

    it('generates empty name lists as `never`', () => {
      const sharedDefinitions = generate(plan)['shared-definitions']

      expect(sharedDefinitions).toContain('export type ScreenNames = never;')
      expect(sharedDefinitions).toContain('export type FeatureNames = never;')
    })
  })

  describe('a Screen view', () => {
    const plan = {
      screens: {
        Home: { features: ['Onboarding'] },
        Settings: {}
      }
    }

    it('fills in its own `screen`', () => {
      expect(generate(plan)['screens/Home']).toMatch(
        /console\.log\("screen", "Home", props, \{\s*screen: "Home",\s*feature: "Onboarding",\s*\.\.\.source\s*\}\)/
      )
    })

    it('only accepts its own `screen`, and makes it optional', () => {
      expect(sourceParameterOf(generate(plan)['screens/Home'], 'default')).toEqual(
        '{ widget?: string; element?: string; action?: string; screen?: "Home"; feature?: "Onboarding"; }'
      )
    })
  })

  describe('constant Source attributes', () => {
    const plan = {
      source: {
        required: ['platform'],
        properties: {
          platform: { const: 'web' }
        }
      },
      tracks: {
        SomeTrack: {}
      },
      screens: {
        Home: { features: ['Onboarding'] }
      }
    }

    it('sends the constant to the implementation, before the caller\'s Source', () => {
      expect(generate(plan)['tracks']).toMatch(
        /console\.log\("track", "SomeTrack", props, \{\s*platform: "web",\s*\.\.\.source\s*\}\)/
      )
    })

    it('is optional, even when listed in `required`, and accepts any value of its type', () => {
      expect(sourceParameterOf(generate(plan)['tracks'], 'SomeTrack')).toEqual(
        '{ platform?: string; screen: shared.ScreenNames; feature: shared.FeatureNames; }'
      )
    })
  })

  describe('reserved Source attributes', () => {
    it.each(['screen', 'feature', 'page', 'url'])('rejects a `source:` block declaring `%s`', name => {
      const plan = { source: { properties: { [name]: { type: 'string' } } } }

      expect(() => new TrackingPlan(plan)).toThrow(
        `Reserved Source attributes cannot be declared in \`source\`: ${name}`
      )
    })

    it('names every reserved Source attribute declared', () => {
      const plan = {
        source: {
          properties: {
            campaign: { type: 'string' },
            url: { type: 'string' },
            screen: { type: 'string' }
          }
        }
      }

      expect(() => new TrackingPlan(plan)).toThrow(
        'Reserved Source attributes cannot be declared in `source`: url, screen'
      )
    })
  })
})
