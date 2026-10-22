import { ObjectDefinition } from './InputTypes'

// Source attributes used when a Tracking Plan doesn't configure its own.
// `view` is always derived per Event, so it isn't listed here.
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
const reservedSourceAttributes = ['view', 'url']

// The Views an Event can be fired from
export type EventViews = {
  views: string[]
}

export type SourceSchema = {
  type: ObjectDefinition
  // Defaults: optional in `type`, and the caller's Source always overrides them
  filledIn: { [attribute: string]: string | number }
}

// Every rule deciding the Source an Event accepts, for one Tracking Plan
export class Sources {
  private definition: ObjectDefinition

  constructor(sourceBlock: Omit<ObjectDefinition, 'type'> | undefined, private viewNames: string[]) {
    const reserved = Object.keys(sourceBlock?.properties ?? {}).filter(name => reservedSourceAttributes.includes(name))
    if (reserved.length > 0) {
      throw new Error(`Reserved Source attributes cannot be declared in \`source\`: ${reserved.join(', ')}`)
    }

    this.definition = sourceBlock ? { type: 'object', ...sourceBlock } : defaultSourceDefinition
  }

  of({ views }: EventViews): SourceSchema {
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

    // A single View is filled in; several must be chosen from; none means any the Tracking Plan has, if it has any
    if (views.length === 0) {
      if (this.viewNames.length > 0) {
        properties['view'] = { $ref: '#/$defs/ViewNames' }
        required.push('view')
      }
    } else {
      properties['view'] = { type: 'string', enum: views }
      if (views.length === 1) {
        filledIn['view'] = views[0]
      } else {
        required.push('view')
      }
    }

    // The caller, or the Implementation, knows the URL; the generator never does
    properties['url'] = { type: 'string' }

    return { type: { type: 'object', properties, required }, filledIn }
  }
}
