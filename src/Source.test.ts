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
      views: {
        Home: {}
      }
    }

    it('replaces the default Source attributes with the declared ones', () => {
      expect(sourceParameterOf(generate(plan)['tracks'], 'SomeTrack')).toEqual(
        '{ campaign?: string; view: shared.ViewNames; url?: string; }'
      )
    })

    it('resolves a `$ref` to `$defs` in View helpers', () => {
      const withRef = {
        ...plan,
        $defs: { Campaign: { type: 'string', enum: ['spring', 'autumn'] } },
        source: { properties: { campaign: { $ref: '#/$defs/Campaign' } } }
      }

      expect(sourceParameterOf(generate(withRef)['views/Home'], 'default')).toEqual(
        '{ campaign?: shared.Campaign; view?: "Home"; url?: string; }'
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
      views: {
        Home: {}
      }
    }

    it('sends the constant to the implementation, before the caller\'s Source', () => {
      expect(generate(plan)['tracks']).toMatch(
        /console\.log\("track", "SomeTrack", props, \{\s*platform: "web",\s*\.\.\.source\s*\}\)/
      )
    })

  })

  describe('reserved Source attributes', () => {
    it('make the Tracking Plan fail to load, naming each', () => {
      const plan = {
        source: {
          properties: {
            campaign: { type: 'string' },
            url: { type: 'string' },
            view: { type: 'string' }
          }
        }
      }

      expect(() => new TrackingPlan(plan)).toThrow(
        'Reserved Source attributes cannot be declared in `source`: url, view'
      )
    })
  })
})
