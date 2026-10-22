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
        '{ campaign?: string; }'
      )
    })

    it('resolves a `$ref` to `$defs` in View helpers', () => {
      const withRef = {
        ...plan,
        $defs: { Campaign: { type: 'string', enum: ['spring', 'autumn'] } },
        source: { properties: { campaign: { $ref: '#/$defs/Campaign' } } }
      }

      expect(sourceParameterOf(generate(withRef)['views/Home'], 'default')).toEqual(
        '{ campaign?: shared.Campaign; }'
      )
    })
  })

  describe('constant Source attributes', () => {
    it('make the Tracking Plan fail to load', () => {
      const plan = { source: { properties: { platform: { const: 'web' } } } }

      expect(() => new TrackingPlan(plan)).toThrow(
        'Source attributes cannot be constants, since facts about the build belong to the Implementation: platform'
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
