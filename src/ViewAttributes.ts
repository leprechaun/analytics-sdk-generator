import { ObjectDefinition, TypeDefinition, ViewAttributeValue } from './InputTypes'

// A View on an Event already carries these, so a Tracking Plan can't declare them
const reservedViewAttributes = ['name', 'url']

// Facts about Views declared by the Tracking Plan, and the values each View sets
export class ViewAttributes {
  private definition: ObjectDefinition

  constructor(block: Omit<ObjectDefinition, 'type'> | undefined) {
    const reserved = Object.keys(block?.properties ?? {}).filter(name => reservedViewAttributes.includes(name))
    if (reserved.length > 0) {
      throw new Error(`Reserved View attributes cannot be declared in \`view_attributes\`: ${reserved.join(', ')}`)
    }

    this.definition = { type: 'object', properties: {}, required: [], ...block }
  }

  // The declaration, as JSON Schema
  schema(): ObjectDefinition {
    return this.definition
  }

  // The values a View sets, checked against the Tracking Plan's declaration
  of(view: string, values: { [attribute: string]: ViewAttributeValue } = {}) {
    const undeclared = Object.keys(values).filter(name => !(name in this.definition.properties))
    if (undeclared.length > 0) {
      throw new Error(`View ${view} sets undeclared View attributes: ${undeclared.join(', ')}`)
    }

    const missing = (this.definition.required ?? []).filter(name => !(name in values))
    if (missing.length > 0) {
      throw new Error(`View ${view} is missing required View attributes: ${missing.join(', ')}`)
    }

    for (const [name, value] of Object.entries(values)) {
      if (!fits(this.definition.properties[name], value)) {
        throw new Error(`View ${view} sets View attribute ${name} to ${JSON.stringify(value)}, which doesn't fit its declaration`)
      }
    }

    return values
  }
}

// Checks a value's type and enum; other schemas (e.g. a `$ref`) are left to the generated SDK's types
function fits(definition: TypeDefinition, value: ViewAttributeValue) {
  const types = { string: 'string', number: 'number', integer: 'number', boolean: 'boolean' }
  if ('type' in definition && definition.type in types && typeof value !== types[definition.type]) return false
  if ('enum' in definition && !(definition.enum as ViewAttributeValue[]).includes(value)) return false
  return true
}
