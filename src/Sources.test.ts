import { ObjectDefinition } from './InputTypes'
import { Sources, SourceSchema } from './Source'

// The Source type of an Event fired from at most one kind of View
const objectOf = (type: SourceSchema['type']): ObjectDefinition => {
  if ('oneOf' in type) throw new Error('Expected a single object type, got a choice')
  return type
}

describe(Sources, () => {
  const names = { screens: ['Home', 'Settings'], pages: ['Home'], features: ['Onboarding', 'Account'] }

  describe('a Screen view', () => {
    it('names its Screen and Feature, filling both in, alongside the default Source attributes', () => {
      expect(new Sources(undefined, names).of({ screens: ['Home'], pages: [], features: ['Onboarding'] })).toEqual({
        type: {
          type: 'object',
          properties: {
            widget: { type: 'string' },
            element: { type: 'string' },
            action: { type: 'string' },
            screen: { type: 'string', enum: ['Home'] },
            feature: { type: 'string', enum: ['Onboarding'] }
          },
          required: []
        },
        filledIn: { screen: 'Home', feature: 'Onboarding' }
      })
    })
  })

  describe('the Tracking Plan\'s `source:` block', () => {
    const homeScreen = { screens: ['Home'], pages: [], features: ['Onboarding'] }

    it('replaces the default Source attributes, keeping its `required`', () => {
      const sources = new Sources({ required: ['campaign'], properties: { campaign: { type: 'string' } } }, names)

      expect(objectOf(sources.of(homeScreen).type)).toEqual({
        type: 'object',
        properties: {
          campaign: { type: 'string' },
          screen: { type: 'string', enum: ['Home'] },
          feature: { type: 'string', enum: ['Onboarding'] }
        },
        required: ['campaign']
      })
    })

    it('fills in its constants as optional defaults of their underlying type, even when required', () => {
      const sources = new Sources({ required: ['platform', 'build'], properties: { platform: { const: 'web' }, build: { const: 42 } } }, names)
      const { type, filledIn } = sources.of(homeScreen)

      expect(objectOf(type).properties).toMatchObject({ platform: { type: 'string' }, build: { type: 'number' } })
      expect(objectOf(type).required).toEqual([])
      expect(filledIn).toEqual({ platform: 'web', build: 42, screen: 'Home', feature: 'Onboarding' })
    })

    it.each(['screen', 'feature', 'page', 'url'])('rejects declaring `%s`, which is reserved', name => {
      expect(() => new Sources({ properties: { [name]: { type: 'string' } } }, names))
        .toThrow(`Reserved Source attributes cannot be declared in \`source\`: ${name}`)
    })

    it('rejects reserved Source attributes, naming each', () => {
      expect(() => new Sources({ properties: { campaign: { type: 'string' }, url: { type: 'string' }, screen: { type: 'string' } } }, names))
        .toThrow('Reserved Source attributes cannot be declared in `source`: url, screen')
    })
  })

  describe('`feature`', () => {
    const featureOf = (plan: typeof names, features: string[]) => {
      const { type, filledIn } = new Sources(undefined, plan).of({ screens: ['Home'], pages: [], features })
      const { properties, required } = objectOf(type)
      return { type: properties.feature, required: required.includes('feature'), filledIn: filledIn.feature }
    }

    it('must be chosen when the View has several Features', () => {
      expect(featureOf(names, ['Onboarding', 'Account'])).toEqual({
        type: { type: 'string', enum: ['Onboarding', 'Account'] }, required: true, filledIn: undefined
      })
    })

    it('can be any Feature in the Tracking Plan when the View has none', () => {
      expect(featureOf(names, [])).toEqual({
        type: { $ref: '#/$defs/FeatureNames' }, required: true, filledIn: undefined
      })
    })

    it('is not a Source attribute when the Tracking Plan has no Features', () => {
      expect(featureOf({ ...names, features: [] }, [])).toEqual({
        type: undefined, required: false, filledIn: undefined
      })
    })
  })

  describe('a Track fired from one kind of View', () => {
    const viewOf = (plan: typeof names, views: { screens: string[], pages: string[] }) => {
      const { type, filledIn } = new Sources(undefined, plan).of({ ...views, features: ['Onboarding'] })
      const { properties, required } = objectOf(type)
      const { screen, page, url } = properties
      return { screen, page, url, required, filledIn }
    }

    it('must name one of several Screens', () => {
      expect(viewOf(names, { screens: ['Home', 'Settings'], pages: [] })).toEqual({
        screen: { type: 'string', enum: ['Home', 'Settings'] }, page: undefined, url: undefined,
        required: ['screen'], filledIn: { feature: 'Onboarding' }
      })
    })

    it('must name one of several Pages, and accepts an optional `url`', () => {
      expect(viewOf({ ...names, pages: ['Home', 'Map'] }, { screens: [], pages: ['Home', 'Map'] })).toEqual({
        screen: undefined, page: { type: 'string', enum: ['Home', 'Map'] }, url: { type: 'string' },
        required: ['page'], filledIn: { feature: 'Onboarding' }
      })
    })

    it('can name any Screen when not tied to a View, in a Tracking Plan with only Screens', () => {
      expect(viewOf({ ...names, pages: [] }, { screens: [], pages: [] })).toEqual({
        screen: { $ref: '#/$defs/ScreenNames' }, page: undefined, url: undefined,
        required: ['screen'], filledIn: { feature: 'Onboarding' }
      })
    })

    it('can name any Page when not tied to a View, in a Tracking Plan with only Pages', () => {
      expect(viewOf({ ...names, screens: [] }, { screens: [], pages: [] })).toEqual({
        screen: undefined, page: { $ref: '#/$defs/PageNames' }, url: { type: 'string' },
        required: ['page'], filledIn: { feature: 'Onboarding' }
      })
    })
  })

  describe('a Track fired from both kinds of View', () => {
    const defaults = { widget: { type: 'string' }, element: { type: 'string' }, action: { type: 'string' } }

    it('names exactly one of its Screens or Pages, filling in only what every choice shares', () => {
      expect(new Sources(undefined, names).of({ screens: ['Home'], pages: ['Home'], features: ['Onboarding'] })).toEqual({
        type: {
          oneOf: [
            {
              type: 'object',
              properties: { ...defaults, screen: { type: 'string', enum: ['Home'] }, feature: { type: 'string', enum: ['Onboarding'] }, page: { not: {} }, url: { not: {} } },
              required: ['screen']
            },
            {
              type: 'object',
              properties: { ...defaults, page: { type: 'string', enum: ['Home'] }, url: { type: 'string' }, feature: { type: 'string', enum: ['Onboarding'] }, screen: { not: {} } },
              required: ['page']
            }
          ]
        },
        filledIn: { feature: 'Onboarding' }
      })
    })

    it('can name any Screen or any Page when not tied to a View, in a Tracking Plan with both', () => {
      const { type } = new Sources(undefined, names).of({ screens: [], pages: [], features: [] })

      expect(('oneOf' in type ? type.oneOf : []).map(option => [option.properties.screen, option.properties.page, option.required])).toEqual([
        [{ $ref: '#/$defs/ScreenNames' }, { not: {} }, ['screen', 'feature']],
        [{ not: {} }, { $ref: '#/$defs/PageNames' }, ['page', 'feature']]
      ])
    })
  })

  describe('a Page view', () => {
    it('names its Page, filling it in, and accepts an optional `url`', () => {
      const { type, filledIn } = new Sources(undefined, names).of({ screens: [], pages: ['Home'], features: ['Onboarding'] })

      expect(objectOf(type).properties).toMatchObject({ page: { type: 'string', enum: ['Home'] }, url: { type: 'string' } })
      expect(objectOf(type).properties).not.toHaveProperty('screen')
      expect(objectOf(type).required).toEqual([])
      expect(filledIn).toEqual({ page: 'Home', feature: 'Onboarding' })
    })
  })
})
