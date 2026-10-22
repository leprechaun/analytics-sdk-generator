import { Implementation } from '../output/implementation/shared-definitions'

const implementation: Implementation = event => {
  if (event.type === 'track' && event.name === 'LoginFailed') {
    const view: 'Settings' | undefined = event.view.name
    console.log(view)
  }
}

export default implementation
