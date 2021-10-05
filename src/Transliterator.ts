import ts, { factory } from 'typescript'

import TrackingPlan from './TrackingPlan'
import TypeMapper from './TypeMapper'
import { NamedType } from './Types'
import { Screen, Track } from './EventTypes'
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

  sharedEnum(path: string[], name: string, values: string[], description: string) {
    return {
      path,
      nodes: new NamedType(name, TypeMapper.toSpecificType({
        type: 'string',
        enum: values,
      }), description).toAST()
    }
  }

  featureNamesType(plan: TrackingPlan) {
    return this.sharedEnum(
      ['shared-definitions'],
      'FeatureNames',
      plan.features.map( f => f.name as string ),
      "List of all the feature names"
    )
  }

  screenNamesType(plan: TrackingPlan) {
    return this.sharedEnum(
      ['shared-definitions'],
      'ScreenNames',
      plan.screens.map( f => f.name as string ),
      "List of all the screen names"
    )
  }

  screenFunction(screen: Screen, importMappings) {
    const nodes = []
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
      path: ['screens', screen.escapeKey()],
      nodes: [this.reExportSharedDefs("../shared-definitions")]
    })

    nodes.push({
      path: [
        'screens',
        screen.escapeKey()
      ],
      nodes: new functions.ScreenAnalyticsFunction(screen).toAST({ importMappings, hasImplementation: !!this.options?.implementation })
    })

    return nodes
  }

  screenFunctions(plan: TrackingPlan, importMappings) {
    let nodes = []
    for(const screen of plan.screens) {
      nodes = nodes.concat(this.screenFunction(screen, importMappings))
    }

    return nodes
  }

  trackFunctions(plan: TrackingPlan, importMappings) {
    const nodes = []
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
      path: ['tracks'],
      nodes: [this.reExportSharedDefs("./shared-definitions")]
    })

    for(const track of plan.tracks) {
      nodes.push({
        path: [
          'tracks',
        ],
        nodes: new functions.TrackAnalyticsFunction(track).toAST({importMappings, hasImplementation: !!this.options.implementation})
      })
    }

    return nodes
  }

  traits(plan: TrackingPlan, importMappings) {
    const nodes = []

    nodes.push({
      path: ['shared-traits'],
      nodes: [this.sharedDefsImport("./shared-definitions")]
    })

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

  defs(plan: TrackingPlan) {
    const nodes = []
    for(const definition of plan.defs) {
      nodes.push(
        {
          path: ['shared-definitions'],
          nodes: definition.toAST({})
        }
      )
    }

    return nodes
  }

  transliterate(plan: TrackingPlan): FileNodesList {
    const nodes: FileNodesList = []

    const importMappings = {
      "$defs": ["shared-definitions", "shared"]
    }

    nodes.push(this.featureNamesType(plan))
    nodes.push(this.screenNamesType(plan))

    return nodes.concat(
      this.screenFunctions(plan, importMappings)
    ).concat(
      this.trackFunctions(plan, importMappings)
    ).concat(
      this.traits(plan, importMappings)
    ).concat(
      this.defs(plan)
    )
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

  reExportSharedDefs(path: string) {
    return factory.createExportDeclaration(
      undefined,
      undefined,
      false,
      factory.createNamespaceExport(factory.createIdentifier("Types")),
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
