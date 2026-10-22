import { Implementation, ViewAttributes, ViewNames, viewAttributes } from '../output/implementation/shared-definitions'

const current: { name?: ViewNames, url?: string } = {}

// Completes each Event with what the generated SDK can't know, in a copy: where the user is, and where they came from
const implementation: Implementation = async event => {
  const view: { name?: ViewNames, url?: string } & Partial<ViewAttributes> = event.view.name
    ? { ...event.view, url: 'https://example.com/current' }
    : { ...event.view, ...(current.name && { name: current.name, ...viewAttributes[current.name] }), url: current.url }
  const source = event.type === 'view' ? { ...event.source, view: current.name, url: current.url } : event.source

  if (event.type === 'view') {
    current.name = view.name
    current.url = view.url
  }
  console.log(event.name, event.properties, view.section, source)
}

export default implementation
