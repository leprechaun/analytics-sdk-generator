import { Sources } from './Source'

describe(Sources, () => {
  it('defaults to optional `widget`, `element` and `action`', () => {
    expect(new Sources(undefined).of()).toEqual({
      type: 'object',
      properties: {
        widget: { type: 'string' },
        element: { type: 'string' },
        action: { type: 'string' }
      },
      required: []
    })
  })

  describe('the Tracking Plan\'s `source:` block', () => {
    it('replaces the default Source attributes, keeping its `required`', () => {
      const sources = new Sources({ required: ['campaign'], properties: { campaign: { type: 'string' } } })

      expect(sources.of()).toEqual({
        type: 'object',
        properties: { campaign: { type: 'string' } },
        required: ['campaign']
      })
    })

    it('rejects constants, naming each: facts about the build belong to the Implementation', () => {
      expect(() => new Sources({ properties: { platform: { const: 'web' }, campaign: { type: 'string' }, build: { const: 42 } } }))
        .toThrow('Source attributes cannot be constants, since facts about the build belong to the Implementation: platform, build')
    })

    it('accepts a declared `feature`, which is no longer reserved', () => {
      const sources = new Sources({ properties: { feature: { type: 'string' } } })

      expect(sources.of().properties.feature).toEqual({ type: 'string' })
    })

    it.each(['view', 'url'])('rejects declaring `%s`, which is reserved', name => {
      expect(() => new Sources({ properties: { [name]: { type: 'string' } } }))
        .toThrow(`Reserved Source attributes cannot be declared in \`source\`: ${name}`)
    })

    it('rejects reserved Source attributes, naming each', () => {
      expect(() => new Sources({ properties: { campaign: { type: 'string' }, url: { type: 'string' }, view: { type: 'string' } } }))
        .toThrow('Reserved Source attributes cannot be declared in `source`: url, view')
    })
  })
})
