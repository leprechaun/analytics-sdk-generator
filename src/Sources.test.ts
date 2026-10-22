import { Sources } from './Source'

describe(Sources, () => {
  const viewNames = ['Home', 'Settings', 'FarmMap']

  describe('a View event', () => {
    it('names its View, filling it in, alongside the default Source attributes', () => {
      expect(new Sources(undefined, viewNames).of({ views: ['Home'] })).toEqual({
        type: {
          type: 'object',
          properties: {
            widget: { type: 'string' },
            element: { type: 'string' },
            action: { type: 'string' },
            view: { type: 'string', enum: ['Home'] },
            url: { type: 'string' }
          },
          required: []
        },
        filledIn: { view: 'Home' }
      })
    })
  })

  describe('a Track', () => {
    const viewOf = (sources: Sources, views: string[]) => {
      const { type, filledIn } = sources.of({ views })
      return { view: type.properties.view, required: type.required.includes('view'), filledIn: filledIn.view }
    }

    it('fills in its View when on exactly one', () => {
      expect(viewOf(new Sources(undefined, viewNames), ['Home'])).toEqual({
        view: { type: 'string', enum: ['Home'] }, required: false, filledIn: 'Home'
      })
    })

    it('must name one of its Views when on several', () => {
      expect(viewOf(new Sources(undefined, viewNames), ['Home', 'Settings'])).toEqual({
        view: { type: 'string', enum: ['Home', 'Settings'] }, required: true, filledIn: undefined
      })
    })

    it('must name any View in the Tracking Plan when on none', () => {
      expect(viewOf(new Sources(undefined, viewNames), [])).toEqual({
        view: { $ref: '#/$defs/ViewNames' }, required: true, filledIn: undefined
      })
    })

    it('names no View in a Tracking Plan without Views', () => {
      expect(viewOf(new Sources(undefined, []), [])).toEqual({
        view: undefined, required: false, filledIn: undefined
      })
    })
  })

  describe('`url`', () => {
    it.each([
      ['a View event', ['Home']],
      ['a Track on several Views', ['Home', 'Settings']],
      ['a Track on none', []]
    ])('is an optional string on %s, never filled in', (_, views) => {
      const { type, filledIn } = new Sources(undefined, viewNames).of({ views })

      expect(type.properties.url).toEqual({ type: 'string' })
      expect(type.required).not.toContain('url')
      expect(filledIn).not.toHaveProperty('url')
    })
  })

  describe('the Tracking Plan\'s `source:` block', () => {
    const home = { views: ['Home'] }

    it('replaces the default Source attributes, keeping its `required`', () => {
      const sources = new Sources({ required: ['campaign'], properties: { campaign: { type: 'string' } } }, viewNames)

      expect(sources.of(home).type).toMatchObject({
        properties: { campaign: { type: 'string' }, view: { type: 'string', enum: ['Home'] } },
        required: ['campaign']
      })
      expect(sources.of(home).type.properties).not.toHaveProperty('widget')
    })

    it('fills in its constants as optional defaults of their underlying type, even when required', () => {
      const sources = new Sources({ required: ['platform', 'build'], properties: { platform: { const: 'web' }, build: { const: 42 } } }, viewNames)
      const { type, filledIn } = sources.of(home)

      expect(type.properties).toMatchObject({ platform: { type: 'string' }, build: { type: 'number' } })
      expect(type.required).toEqual([])
      expect(filledIn).toEqual({ platform: 'web', build: 42, view: 'Home' })
    })

    it('accepts a declared `feature`, which is no longer reserved', () => {
      const sources = new Sources({ properties: { feature: { type: 'string' } } }, viewNames)

      expect(sources.of(home).type.properties.feature).toEqual({ type: 'string' })
    })

    it.each(['view', 'url'])('rejects declaring `%s`, which is reserved', name => {
      expect(() => new Sources({ properties: { [name]: { type: 'string' } } }, viewNames))
        .toThrow(`Reserved Source attributes cannot be declared in \`source\`: ${name}`)
    })

    it('rejects reserved Source attributes, naming each', () => {
      expect(() => new Sources({ properties: { campaign: { type: 'string' }, url: { type: 'string' }, view: { type: 'string' } } }, viewNames))
        .toThrow('Reserved Source attributes cannot be declared in `source`: url, view')
    })
  })
})
