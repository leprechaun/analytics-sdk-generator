import { generate, sourceParameterOf } from './test-helpers/generate'

// The Event each generated helper hands to the Implementation
describe('the Event handed to the Implementation', () => {
  const tracks = { LoginFailed: { properties: { reason: { type: 'string' } } } }

  describe('from a View helper', () => {
    const view = () => generate({ tracks, views: { Login: { tracks: ['LoginFailed'] } } })['views/Login']

    it('is one object naming the View it happened on', () => {
      expect(view()).toMatch(
        /export default [^]*?console\.log\(\{\s*type: "view",\s*name: "Login",\s*properties: null,\s*view: \{\s*name: "Login"\s*\},\s*source: \{\s*\.\.\.args\.source\s*\}\s*\}\)/
      )
    })

    it('leaves the View and its URL out of the Source the caller passes, for the Implementation to complete', () => {
      expect(sourceParameterOf(view(), 'default')).toEqual(
        '{ widget?: string; element?: string; action?: string; }'
      )
    })
  })

  describe('from a Track', () => {
    const tracksFile = (plan: unknown) => generate(plan)['tracks']
    const eventOf = (code: string, track: string) =>
      code.match(new RegExp(`export const ${track} = [^]*?console\\.log\\((\\{[^]*?\\})\\)\\s*\\};`))?.[1].replace(/\s+/g, ' ')

    it('names its View when on exactly one, in the View\'s file and in `tracks`', () => {
      const plan = { tracks, views: { Login: { tracks: ['LoginFailed'] } } }

      expect(eventOf(generate(plan)['views/Login'], 'LoginFailed')).toContain('view: { name: "Login" }')
      expect(eventOf(tracksFile(plan), 'LoginFailed')).toContain('view: { name: "Login" }')
    })

    it.each([
      ['several Views', { Login: { tracks: ['LoginFailed'] }, Signup: { tracks: ['LoginFailed'] } }],
      ['no View', { Splash: {} }]
    ])('leaves its View to the Implementation when on %s, without asking the caller', (_, views) => {
      const code = tracksFile({ tracks, views })

      expect(eventOf(code, 'LoginFailed')).toContain('view: {}')
      expect(sourceParameterOf(code, 'LoginFailed')).toEqual(
        '{ widget?: string; element?: string; action?: string; }'
      )
    })
  })

  describe('its type, exported for the Implementation', () => {
    const definitionOf = (plan: unknown, type: string) =>
      generate(plan)['shared-definitions'].match(new RegExp(`export type ${type} = ([^]*?);\\n(?=[^\\s}]|$)`))?.[1].replace(/\s+/g, ' ')

    const strictPlan = {
      tracks: {
        LoginFailed: { required: ['reason'], properties: { reason: { type: 'string' } } },
        Search: { properties: { query: { type: 'string' } } },
        Login: {}
      },
      views: { Login: { tracks: ['LoginFailed'] }, Signup: { tracks: ['LoginFailed'] } }
    }
    const membersOf = (plan: unknown) => definitionOf(plan, 'AnalyticsEvent').split(') & { view:')[0]

    it('has one member per View event, naming only its own View', () => {
      expect(membersOf(strictPlan)).toContain('{ type: "view"; name: "Login"; properties: null; view: { name?: "Login"; }; }')
    })

    it('has one member per Track, typing its Properties and the Views it is on', () => {
      expect(membersOf(strictPlan)).toContain('{ type: "track"; name: "LoginFailed"; properties: { reason: string; }; view: { name?: "Login" | "Signup"; }; }')
    })

    it('lets a Track with only optional Properties, on no View, be reported without Properties, from any View', () => {
      expect(membersOf(strictPlan)).toContain('{ type: "track"; name: "Search"; properties: { query?: string; } | null; view: { name?: ViewNames; }; }')
    })

    it('tells a View and a Track sharing a name apart by their type', () => {
      expect(membersOf(strictPlan)).toContain('{ type: "track"; name: "Login"; properties: null; view: { name?: ViewNames; }; }')
    })

    it('shares what every Event has, leaving what the Implementation completes optional, including the View the user came from', () => {
      expect(definitionOf(strictPlan, 'AnalyticsEvent')).toMatch(
        / \}\) & \{ view: \{ url\?: string; \} & Partial<ViewAttributes>; source: \{ widget\?: string; element\?: string; action\?: string; view\?: ViewNames; url\?: string; \}; \}$/
      )
    })

    it('is `never` for a Tracking Plan without Events', () => {
      expect(definitionOf({}, 'AnalyticsEvent')).toMatch(/^never & \{/)
    })

    it('uses the Tracking Plan\'s own Source attributes', () => {
      const plan = { tracks, source: { required: ['campaign'], properties: { campaign: { $ref: '#/$defs/Campaign' } } }, $defs: { Campaign: { type: 'string' } } }

      expect(definitionOf(plan, 'AnalyticsEvent')).toContain('source: { campaign: Campaign; view?: ViewNames; url?: string; };')
    })

    it('types the Implementation as a function of it', () => {
      expect(definitionOf({ tracks }, 'Implementation')).toEqual('(event: AnalyticsEvent) => void | Promise<void>')
    })
  })
})
