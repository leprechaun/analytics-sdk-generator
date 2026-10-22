import { Implementation } from '../output/implementation/shared-definitions'

const implementation: Implementation = event => {
  console.log(event.source.screen)
}

export default implementation
