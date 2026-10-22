import { Implementation } from '../output/implementation/shared-definitions'

const implementation: Implementation = event => {
  if (event.type === 'track' && event.name === 'LoginFailed') {
    const reason: string | undefined = event.properties?.reason
    const view: 'Login' | 'Signup' | undefined = event.view.name
    console.log(reason, view)
  }
  if (event.type === 'view' && event.name === 'Settings') {
    const properties: null = event.properties
    console.log(properties)
  }
}

export default implementation
