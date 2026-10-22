import { Implementation } from '../output/implementation/shared-definitions'

const implementation: Implementation = event => {
  if (event.type === 'track' && event.name === 'LoginFailed') console.log(event.properties?.colour)
}

export default implementation
