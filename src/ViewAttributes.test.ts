import TrackingPlan from './TrackingPlan'
import { generate } from './test-helpers/generate'

describe('View attributes', () => {
  const plan = {
    view_attributes: {
      properties: { section: { type: 'string', enum: ['onboarding', 'farming'] } }
    },
    tracks: { FarmSelected: {} },
    views: {
      FarmMap: { attributes: { section: 'farming' }, tracks: ['FarmSelected'] },
      Settings: {}
    }
  }

  const eventOf = (code: string, helper: string) => {
    const declaration = helper === 'default' ? 'export default ' : `export const ${helper} = `
    return code.match(new RegExp(`${declaration}[^]*?console\\.log\\((\\{[^]*?\\})\\)\\s*\\};`))?.[1].replace(/\s+/g, ' ')
  }

  it('are filled into the `view` of the View\'s own View event', () => {
    expect(eventOf(generate(plan)['views/FarmMap'], 'default')).toContain('view: { name: "FarmMap", section: "farming" }')
  })

  it('are filled into the `view` of its Tracks, wherever they are exported', () => {
    expect(eventOf(generate(plan)['views/FarmMap'], 'FarmSelected')).toContain('view: { name: "FarmMap", section: "farming" }')
    expect(eventOf(generate(plan)['tracks'], 'FarmSelected')).toContain('view: { name: "FarmMap", section: "farming" }')
  })

  it('are left out for a View without any', () => {
    expect(eventOf(generate(plan)['views/Settings'], 'default')).toContain('view: { name: "Settings" }')
  })

  describe('that don\'t fit their declaration', () => {
    const withViews = (views: unknown) => ({ ...plan, views })

    it('make the Tracking Plan fail to load when a View sets one that isn\'t declared', () => {
      expect(() => new TrackingPlan(withViews({ FarmMap: { attributes: { section: 'farming', colour: 'green' } } })))
        .toThrow('View FarmMap sets undeclared View attributes: colour')
    })

    it.each([
      ['outside its enum', 'garden'],
      ['of the wrong type', 3]
    ])('make the Tracking Plan fail to load when a View sets one to a value %s', (_, value) => {
      expect(() => new TrackingPlan(withViews({ FarmMap: { attributes: { section: value } } })))
        .toThrow(`View FarmMap sets View attribute section to ${JSON.stringify(value)}, which doesn't fit its declaration`)
    })

    it('make the Tracking Plan fail to load when a View is missing a required one', () => {
      const required = { ...plan, view_attributes: { ...plan.view_attributes, required: ['section'] } }

      expect(() => new TrackingPlan({ ...required, views: { Settings: {} } }))
        .toThrow('View Settings is missing required View attributes: section')
    })
  })

  it('make the Tracking Plan fail to load when declaring reserved names, naming each', () => {
    const reserved = { view_attributes: { properties: { url: { type: 'string' }, section: { type: 'string' }, name: { type: 'string' } } } }

    expect(() => new TrackingPlan(reserved)).toThrow('Reserved View attributes cannot be declared in `view_attributes`: url, name')
  })

  describe('exported for the Implementation', () => {
    const declarationOf = (plan: unknown, declaration: string) =>
      generate(plan)['shared-definitions'].match(new RegExp(`export ${declaration} = ([^]*?);\\n(?=[^\\s}]|$)`))?.[1].replace(/\s+/g, ' ')

    it('as a type, following their declaration', () => {
      expect(declarationOf(plan, 'type ViewAttributes')).toEqual('{ section?: "onboarding" | "farming"; }')
    })

    it('as every View\'s values, keyed by View', () => {
      expect(declarationOf(plan, 'const viewAttributes: Record<ViewNames, ViewAttributes>')).toEqual(
        '{ FarmMap: { section: "farming" }, Settings: {} }'
      )
    })

    it('as part of the View on an Event, which the Implementation may complete', () => {
      expect(declarationOf(plan, 'type AnalyticsEvent')).toContain('view: { url?: string; } & Partial<ViewAttributes>;')
    })
  })
})
