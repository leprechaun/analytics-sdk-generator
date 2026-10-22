import ts, { factory } from 'typescript'

import TrackingPlan from './TrackingPlan'
import TypeMapper from './TypeMapper'
import { NamedType, NeverType } from './Types'
import * as functions from './Functions'
import { Track, View } from './EventTypes'
import { ViewAttributes } from './ViewAttributes'

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
    const type = values.length === 0
      ? new NeverType({})
      : TypeMapper.toSpecificType({ type: 'string', enum: values })

    return new NamedType(name, type, description).toAST()
  }

  transliterate(plan: TrackingPlan): Map<string, ts.Node[]> {
    const acc = new Map<string, ts.Node[]>()
    const importMappings = { "$defs": ["shared-definitions", "shared"] }
    const toASTOptions = {
      importMappings,
      hasImplementation: !!this.options.implementation,
      methodsAsync: this.options.methodsAsync,
      sources: plan.sources
    }

    this.push(acc, 'shared-definitions', this.sharedEnum('ViewNames', plan.views.map(v => v.name), "List of all the view names"))
    for (const def of plan.defs) {
      this.push(acc, 'shared-definitions', def.toAST({}))
    }
    this.push(acc, 'shared-definitions', this.viewAttributes(plan.viewAttributes, plan.views))
    this.push(acc, 'shared-definitions', this.eventTypes(plan))

    this.push(acc, 'tracks', this.sharedDefsImport('./shared-definitions'))
    if (this.options.implementation) {
      this.push(acc, 'tracks', this.importImplementation(this.options.implementation))
    }
    this.push(acc, 'tracks', this.reExportSharedDefs('./shared-definitions'))
    for (const track of plan.tracks) {
      this.push(acc, 'tracks', functions.trackToAST(track, toASTOptions))
    }

    for (const view of plan.views) {
      const key = `views/${view.escapeKey()}`
      this.push(acc, key, this.sharedDefsImport('../shared-definitions'))
      if (this.options.implementation) {
        this.push(acc, key, this.importImplementation('../' + this.options.implementation))
      }
      this.push(acc, key, this.reExportSharedDefs('../shared-definitions'))
      this.push(acc, key, functions.viewToAST(view, toASTOptions))
    }

    this.push(acc, 'shared-traits', this.sharedDefsImport('./shared-definitions'))
    for (const trait of plan.traits) {
      this.push(acc, 'shared-traits', trait.toAST({ importMappings }))
    }

    return acc
  }

  // The View attributes the Tracking Plan declares, and each View's values, keyed by View name
  private viewAttributes(viewAttributes: ViewAttributes, views: View[]): ts.Node[] {
    const key = (name: string) => /^[A-Za-z_$][\w$]*$/.test(name) ? factory.createIdentifier(name) : factory.createStringLiteral(name)
    const values = factory.createObjectLiteralExpression(views.map(view => factory.createPropertyAssignment(
      key(view.name),
      factory.createObjectLiteralExpression(Object.entries(view.attributes).map(([name, value]) =>
        factory.createPropertyAssignment(key(name), functions.literal(value))
      ))
    )))

    return [
      ...new NamedType('ViewAttributes', TypeMapper.toSpecificType(viewAttributes.schema()), "Facts about Views, declared in the Tracking Plan").toAST(),
      factory.createJSDocComment("Every View's View attributes"),
      factory.createVariableStatement(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createVariableDeclarationList([factory.createVariableDeclaration(
          'viewAttributes',
          undefined,
          factory.createTypeReferenceNode('Record', [factory.createTypeReferenceNode('ViewNames'), factory.createTypeReferenceNode('ViewAttributes')]),
          values
        )], ts.NodeFlags.Const)
      )
    ]
  }

  // The Event handed to the Implementation, and the Implementation itself
  private eventTypes(plan: TrackingPlan): ts.Node[] {
    const member = (name: string, type: ts.TypeNode, optional = false) => factory.createPropertySignature(
      undefined,
      name,
      optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type
    )
    const string = factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    const literal = (value: string) => factory.createLiteralTypeNode(factory.createStringLiteral(value))
    const nullType = factory.createLiteralTypeNode(factory.createNull())

    // What a helper passes as `properties`: `null` when called without any
    const propertiesOf = (event: View | Track) => {
      if (event.properties.properties.length === 0) return nullType
      const type = event.properties.toAST({}) as ts.TypeNode
      return event.properties.properties.some(property => property.required)
        ? type
        : factory.createUnionTypeNode([type, nullType])
    }

    // The Views an Event can happen on: any View for a Track on none
    const viewsOf = (views: View[]) => views.length === 0
      ? factory.createTypeReferenceNode('ViewNames')
      : factory.createUnionTypeNode(views.map(view => literal(view.name)))

    // One member per Event, told apart by `type` and `name` together
    const memberOf = (event: View | Track, views: View[]) => factory.createTypeLiteralNode([
      member('type', literal(event.type)),
      member('name', literal(event.name)),
      member('properties', propertiesOf(event)),
      member('view', factory.createTypeLiteralNode([member('name', viewsOf(views), true)]))
    ])
    const members = [
      ...plan.views.map(view => memberOf(view, [view])),
      ...plan.tracks.map(track => memberOf(track, track.views))
    ]

    const shared = factory.createTypeLiteralNode([
      // The Implementation completes what the generator can't know
      member('view', factory.createIntersectionTypeNode([
        factory.createTypeLiteralNode([member('url', string, true)]),
        factory.createTypeReferenceNode('Partial', [factory.createTypeReferenceNode('ViewAttributes')])
      ])),
      // What the caller passed, plus the View the user came from and its URL
      member('source', factory.createTypeLiteralNode([
        ...(TypeMapper.toSpecificType(plan.sources.of()).toAST({}) as ts.TypeLiteralNode).members,
        member('view', factory.createTypeReferenceNode('ViewNames'), true),
        member('url', string, true)
      ]))
    ])

    const event = factory.createIntersectionTypeNode([
      members.length === 0 ? factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword) : factory.createParenthesizedType(factory.createUnionTypeNode(members)),
      shared
    ])

    const implementation = factory.createFunctionTypeNode(
      undefined,
      [factory.createParameterDeclaration(undefined, undefined, 'event', undefined, factory.createTypeReferenceNode('AnalyticsEvent'))],
      factory.createUnionTypeNode([
        factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
        factory.createTypeReferenceNode('Promise', [factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)])
      ])
    )

    const alias = (name: string, type: ts.TypeNode) => factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)], name, undefined, type
    )

    return [
      factory.createJSDocComment("The Event each helper hands to the Implementation. Optional fields are for the Implementation to complete"),
      alias('AnalyticsEvent', event),
      factory.createJSDocComment("What the generated SDK calls to deliver each Event"),
      alias('Implementation', implementation)
    ]
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
