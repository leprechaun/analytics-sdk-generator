import { ObjectDefinition } from './InputTypes'

// Source attributes used when a Tracking Plan doesn't configure its own.
const defaultSourceDefinition: ObjectDefinition = {
  type: 'object',
  properties: {
    widget: { type: 'string' },
    element: { type: 'string' },
    action: { type: 'string' }
  },
  required: []
}

// Source attributes reserved for the generator and the Implementation, so a Tracking Plan can't declare them
const reservedSourceAttributes = ['view', 'url']

// Every rule deciding the Source an Event accepts, for one Tracking Plan
export class Sources {
  private definition: ObjectDefinition

  constructor(sourceBlock: Omit<ObjectDefinition, 'type'> | undefined) {
    const reserved = Object.keys(sourceBlock?.properties ?? {}).filter(name => reservedSourceAttributes.includes(name))
    if (reserved.length > 0) {
      throw new Error(`Reserved Source attributes cannot be declared in \`source\`: ${reserved.join(', ')}`)
    }

    const constants = Object.entries(sourceBlock?.properties ?? {}).filter(([, definition]) => 'const' in definition).map(([name]) => name)
    if (constants.length > 0) {
      throw new Error(`Source attributes cannot be constants, since facts about the build belong to the Implementation: ${constants.join(', ')}`)
    }

    this.definition = sourceBlock ? { type: 'object', ...sourceBlock } : defaultSourceDefinition
  }

  // What callers pass: the same for every Event. The View an Event happened on is part of the Event, and the
  // Implementation completes `view` and `url`
  of(): ObjectDefinition {
    return this.definition
  }
}
