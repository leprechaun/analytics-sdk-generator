import { ObjectDefinition } from './InputTypes'

// Source attributes used when a Tracking Plan doesn't configure its own.
// `screen` and `feature` are always derived per Event, so they aren't listed here.
const defaultSourceDefinition: ObjectDefinition = {
  type: 'object',
  properties: {
    widget: { type: 'string' },
    element: { type: 'string' },
    action: { type: 'string' }
  },
  required: []
}

// Source attributes the generator derives itself, so a Tracking Plan can't declare them
const reservedSourceAttributes = ['screen', 'feature', 'page', 'url']

// The Screens, Pages and Features an Event can be fired from
export type EventViews = {
  screens: string[]
  pages: string[]
  features: string[]
}

export type SourceSchema = {
  // A choice between kinds of View is a `oneOf`, each option marking the other kind's Source attributes `{ not: {} }`
  type: ObjectDefinition | { oneOf: ObjectDefinition[] }
  // Defaults: optional in `type`, and the caller's Source always overrides them
  filledIn: { [attribute: string]: string | number }
}

// Where each View-naming Source attribute finds the Tracking Plan's names, and the shared list of them
const namesOf = {
  screen: { names: 'screens', list: 'ScreenNames' },
  page: { names: 'pages', list: 'PageNames' },
  feature: { names: 'features', list: 'FeatureNames' }
} as const

// Every rule deciding the Source an Event accepts, for one Tracking Plan
export class Sources {
  private definition: ObjectDefinition

  constructor(sourceBlock: Omit<ObjectDefinition, 'type'> | undefined, private names: EventViews) {
    const reserved = Object.keys(sourceBlock?.properties ?? {}).filter(name => reservedSourceAttributes.includes(name))
    if (reserved.length > 0) {
      throw new Error(`Reserved Source attributes cannot be declared in \`source\`: ${reserved.join(', ')}`)
    }

    this.definition = sourceBlock ? { type: 'object', ...sourceBlock } : defaultSourceDefinition
  }

  of(views: EventViews): SourceSchema {
    const kinds = this.kindsOf(views)
    if (kinds.length < 2) {
      return this.optionFor(views, kinds[0], false)
    }

    // The caller names exactly one View, so each option rules out the other kind's Source attributes
    const options = kinds.map(kind => this.optionFor(views, kind, true))
    for (const option of options) {
      for (const attribute of ['screen', 'page', 'url']) {
        if (!(attribute in option.type.properties)) option.type.properties[attribute] = { not: {} }
      }
    }

    // Only values every option fills in alike can be filled in
    const [first, ...rest] = options
    const filledIn = Object.fromEntries(Object.entries(first.filledIn).filter(([name, value]) =>
      rest.every(option => option.filledIn[name] === value)
    ))

    return { type: { oneOf: options.map(option => option.type) }, filledIn }
  }

  // The Source of an Event fired from one kind of View (or none); a View that must be chosen is never filled in
  private optionFor(views: EventViews, kind: 'screen' | 'page' | undefined, mustChoose: boolean): SourceSchema & { type: ObjectDefinition } {
    const properties = { ...this.definition.properties }
    let required = [...(this.definition.required ?? [])]
    const filledIn: SourceSchema['filledIn'] = {}

    // Constants declared by the Tracking Plan are defaults the caller may override
    for (const [name, definition] of Object.entries(properties)) {
      if ('const' in definition) {
        properties[name] = { type: typeof definition.const === 'number' ? 'number' : 'string' }
        filledIn[name] = definition.const as string | number
        required = required.filter(attribute => attribute !== name)
      }
    }

    if (kind) {
      this.nameOneOf(kind, views[namesOf[kind].names], properties, required, filledIn, mustChoose)
      if (kind === 'page') properties['url'] = { type: 'string' }
    }
    this.nameOneOf('feature', views.features, properties, required, filledIn)

    return { type: { type: 'object', properties, required }, filledIn }
  }

  // The kinds of View an Event can be fired from: those it is tied to, otherwise those the Tracking Plan has
  private kindsOf(views: EventViews): ('screen' | 'page')[] {
    const kinds = ['screen', 'page'] as const
    const tiedTo = kinds.filter(kind => views[namesOf[kind].names].length > 0)

    return tiedTo.length > 0 ? tiedTo : kinds.filter(kind => this.names[namesOf[kind].names].length > 0)
  }

  // A single option is filled in; several must be chosen from; none means any the Tracking Plan has, if it has any
  private nameOneOf(attribute: 'screen' | 'page' | 'feature', options: string[], properties: ObjectDefinition['properties'], required: string[], filledIn: SourceSchema['filledIn'], mustChoose = false) {
    if (options.length === 0) {
      const { names, list } = namesOf[attribute]
      if (this.names[names].length > 0) {
        properties[attribute] = { $ref: `#/$defs/${list}` }
        required.push(attribute)
      }
      return
    }

    properties[attribute] = { type: 'string', enum: options }
    if (options.length === 1 && !mustChoose) {
      filledIn[attribute] = options[0]
    } else {
      required.push(attribute)
    }
  }
}
