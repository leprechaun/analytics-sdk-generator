import { Implementation } from '../output/implementation/shared-definitions'

const implementation: Implementation = event => {
  if (event.type === 'screen') console.log(event.name)
}

export default implementation
