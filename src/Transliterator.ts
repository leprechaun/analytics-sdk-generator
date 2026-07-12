import ts, { factory } from 'typescript'

import TrackingPlan from './TrackingPlan'
import TypeMapper from './TypeMapper'
import { NamedType } from './Types'
import * as functions from './Functions'

export default class Transliterator {
  options: {
    implementation?: string
    methodsAsync: boolean
  }

  constructor(options?: {
    implementation?: string,
    methodsAsync?: boolean
  }) {
    this.options = {
      ...options,
      methodsAsync: options?.methodsAsync ?? false
    }
  }

  private push(acc: Map<string, ts.Node[]>, key: string, nodes: ts.Node | ts.Node[]) {
    const existing = acc.get(key) ?? []
    acc.set(key, existing.concat(Array.isArray(nodes) ? nodes : [nodes]))
  }

  private sharedEnum(name: string, values: string[], description: string): ts.Node[] {
    return new NamedType(name, TypeMapper.toSpecificType({
      type: 'string',
      enum: values,
    }), description).toAST()
  }

  transliterate(plan: TrackingPlan): Map<string, ts.Node[]> {
    const acc = new Map<string, ts.Node[]>()
    const importMappings = { "$defs": ["shared-definitions", "shared"] }
    const toASTOptions = {
      importMappings,
      hasImplementation: !!this.options.implementation,
      methodsAsync: this.options.methodsAsync
    }

    this.push(acc, 'shared-definitions', this.sharedEnum('FeatureNames', plan.features.map(f => f.name), "List of all the feature names"))
    this.push(acc, 'shared-definitions', this.sharedEnum('ScreenNames', plan.screens.map(f => f.name), "List of all the screen names"))
    for (const def of plan.defs) {
      this.push(acc, 'shared-definitions', def.toAST({}))
    }

    this.push(acc, 'tracks', this.sharedDefsImport('./shared-definitions'))
    if (this.options.implementation) {
      this.push(acc, 'tracks', this.importImplementation(this.options.implementation))
    }
    this.push(acc, 'tracks', this.reExportSharedDefs('./shared-definitions'))
    for (const track of plan.tracks) {
      this.push(acc, 'tracks', functions.trackToAST(track, toASTOptions))
    }

    for (const screen of plan.screens) {
      const key = `screens/${screen.escapeKey()}`
      this.push(acc, key, this.sharedDefsImport('../shared-definitions'))
      if (this.options.implementation) {
        this.push(acc, key, this.importImplementation('../' + this.options.implementation))
      }
      this.push(acc, key, this.reExportSharedDefs('../shared-definitions'))
      this.push(acc, key, functions.screenToAST(screen, toASTOptions))
    }

    this.push(acc, 'shared-traits', this.sharedDefsImport('./shared-definitions'))
    for (const trait of plan.traits) {
      this.push(acc, 'shared-traits', trait.toAST({ importMappings }))
    }

    return acc
  }

  importImplementation(path: string) {
    return factory.createImportDeclaration(
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
      false,
      factory.createNamespaceExport(factory.createIdentifier("Types")),
      factory.createStringLiteral(path)
    )
  }

  sharedDefsImport(path: string) {
    return factory.createImportDeclaration(
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
