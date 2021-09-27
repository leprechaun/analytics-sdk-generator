import ts, { factory } from 'typescript'

import TrackingPlan from './TrackingPlan'
import TypeMapper from './TypeMapper'
import { NamedType } from './Types'
import * as functions from './Functions'

export type FileNodesList = {
  path: string[],
  nodes: ts.Node[]
}[]

export default class Transliterator {
  options: {
    implementation?: string
  }
  constructor(options?: {
    implementation?: string
  }) {
    this.options = options
  }

  transliterate(plan: TrackingPlan): FileNodesList {
    const nodes: FileNodesList = []

    const importMappings = {
      "$defs": ["shared-definitions", "shared"]
    }

    nodes.push({
      path: ['shared-definitions'],
      nodes: new NamedType("FeatureNames", TypeMapper.toSpecificType({
        type: 'string',
        enum: plan.features.map( f => f.name as string )
      }), "List of all the feature names").toAST()
    })

    nodes.push({
      path: ['shared-definitions'],
      nodes: new NamedType("ScreenNames", TypeMapper.toSpecificType({
        type: 'string',
        enum: plan.screens.map( s => s.name as string)
      }), "List of all the screen names").toAST()
    })

    for(const screen of plan.screens) {
      nodes.push({
        path: ['screens', screen.escapeKey()],
        nodes: [this.sharedDefsImport("../shared-definitions")]
      })

      if(!!this.options.implementation) {
        nodes.push({
          path: ['screens', screen.escapeKey()],
          nodes: [this.importImplementation("../" + this.options.implementation)]
        })
      }

      nodes.push({
        path: [
          'screens',
          screen.escapeKey()
        ],
        nodes: new functions.ScreenAnalyticsFunction(screen).toAST({importMappings, hasImplementation: !!this.options?.implementation})
      })
    }

    nodes.push({
      path: ['tracks'],
      nodes: [this.sharedDefsImport("./shared-definitions")]
    })

    if(!!this.options.implementation) {
      nodes.push({
        path: ['tracks'],
        nodes: [this.importImplementation(this.options.implementation)]
      })
    }

    nodes.push({
      path: ['shared-traits'],
      nodes: [this.sharedDefsImport("./shared-definitions")]
    })

    for(const track of plan.tracks) {
      nodes.push({
        path: [
          'tracks',
        ],
        nodes: new functions.TrackAnalyticsFunction(track).toAST({importMappings, hasImplementation: !!this.options.implementation})
      })
    }

    for(const definition of plan.defs) {
      nodes.push(
        {
          path: ['shared-definitions'],
          nodes: definition.toAST({})
        }
      )
    }

    for(const trait of plan.traits) {
      nodes.push(
        {
          path: ['shared-traits'],
          nodes: trait.toAST({importMappings})
        }
      )
    }

    return nodes
  }

  importImplementation(path: string) {
    return factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
        false,
        factory.createIdentifier("implementation"),
        undefined
      ),
      factory.createStringLiteral(path)
    )
  }

  sharedDefsImport(path: string) {
    return factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
        false,
        undefined,
        factory.createNamespaceImport(factory.createIdentifier("shared"))
      ),
      factory.createStringLiteral(path)
    )
  }
}
