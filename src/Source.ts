import { ObjectDefinition } from './InputTypes'

// Source attributes used when a Tracking Plan doesn't configure its own.
// `screen` and `feature` are always derived per Event, so they aren't listed here.
export const defaultSourceDefinition: ObjectDefinition = {
  type: 'object',
  properties: {
    widget: { type: 'string' },
    element: { type: 'string' },
    action: { type: 'string' }
  },
  required: []
}

// Source attributes the generator derives itself, so a Tracking Plan can't declare them
export const reservedSourceAttributes = ['screen', 'feature', 'page', 'url']
