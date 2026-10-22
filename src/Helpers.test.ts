import { generate } from './test-helpers/generate'

// The single argument each generated helper takes
describe('a helper\'s argument', () => {
  const parameterOf = (code: string, helper: string) => {
    const declaration = helper === 'default' ? 'export default ' : `export const ${helper} = `
    const match = code.match(new RegExp(`${declaration}\\(([^]*?)\\) => \\{`))
    if (!match) throw new Error(`No helper named ${helper} in:\n${code}`)
    return match[1].replace(/\s+/g, ' ')
  }

  it('is optional, with only a `source`, when the Event has no Properties', () => {
    expect(parameterOf(generate({ views: { Login: {} } })['views/Login'], 'default')).toEqual(
      'args: { source?: { widget?: string; element?: string; action?: string; }; } = {}'
    )
  })

  describe('of an Event with Properties', () => {
    const tracksFile = (properties: unknown, required: string[] = []) =>
      generate({ tracks: { LoginFailed: { properties, required } } })['tracks']

    it('requires `props`, and the argument, when a Property is required', () => {
      expect(parameterOf(tracksFile({ reason: { type: 'string' } }, ['reason']), 'LoginFailed')).toEqual(
        'args: { props: { reason: string; }; source?: { widget?: string; element?: string; action?: string; }; }'
      )
    })

    it('makes `props`, and the argument, optional when no Property is required', () => {
      expect(parameterOf(tracksFile({ reason: { type: 'string' } }), 'LoginFailed')).toEqual(
        'args: { props?: { reason?: string; }; source?: { widget?: string; element?: string; action?: string; }; } = {}'
      )
    })
  })

  it('requires `source`, and the argument, when the Tracking Plan requires a Source attribute', () => {
    const plan = { source: { required: ['campaign'], properties: { campaign: { type: 'string' } } }, views: { Login: {} } }

    expect(parameterOf(generate(plan)['views/Login'], 'default')).toEqual(
      'args: { source: { campaign: string; }; }'
    )
  })
})
