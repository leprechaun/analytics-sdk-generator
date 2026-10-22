import ts, {factory } from 'typescript'

import { Track, View } from './EventTypes'
import { BaseType, ObjectType } from './Types'
import { Sources, SourceSchema } from './Source'
import TypeMapper from './TypeMapper'

type ImportMapping = string[]

type ImportMappings = {
  [key: string]: ImportMapping
}

type ToASTOptions = {
  hasImplementation?: boolean,
  importMappings?: ImportMappings,
  methodsAsync: boolean,
  sources: Sources
}

export class AnalyticsFunction {
  event: Track | View

  constructor(definition: Track | View) {
    this.event = definition
  }

  parameter(name: string, type: ts.TypeNode, optional = false) {
    return factory.createParameterDeclaration(
      undefined,
      undefined,
      factory.createIdentifier(name),
      optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type,
      undefined
    )
  }

  propsParameter(properties: ObjectType, options: ToASTOptions) {
    return properties.properties.length === 0
      ? this.parameter("props", factory.createLiteralTypeNode(factory.createNull()), true)
      : this.parameter("props", properties.toAST(options), false)
  }

  sourceParameter(source: BaseType, options?: ToASTOptions) {
    const sourceType = source.toAST(options) as ts.TypeNode
    return this.parameter(
      "source",
      ts.isTypeLiteralNode(sourceType)
        ? factory.createTypeLiteralNode(sourceType.members)
        : sourceType as ts.TypeNode,
      true
    )
  }

  // The values filled in for the caller, overridden by their own Source
  filledInSource(filledIn: SourceSchema['filledIn']) {
    return factory.createObjectLiteralExpression(
      [
        ...Object.entries(filledIn).map(([name, value]) => factory.createPropertyAssignment(
          factory.createIdentifier(name),
          typeof value === 'number' ? factory.createNumericLiteral(value) : factory.createStringLiteral(value)
        )),
        factory.createSpreadAssignment(factory.createIdentifier("source"))
      ],
      true
    )
  }

  implementation(options: ToASTOptions, sourceLiteral: ts.Expression) {
    const params = [
      factory.createStringLiteral(this.event.type),
      factory.createStringLiteral(this.event.name),
      factory.createIdentifier("props"),
      sourceLiteral
    ]

    return options.hasImplementation
      ? this.specifiedImplementation(options, params)
      : this.emptyImplementation(params)
  }

  fn(asynchronous: ts.Modifier[] | undefined, parameters: ts.ParameterDeclaration[], implementation: ts.ExpressionStatement | ts.CallExpression) {
    return factory.createArrowFunction(
      asynchronous,
      undefined,
      parameters,
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock(
        [implementation as ts.Statement],
        true
      )
    )
  }

  toAST(options?: ToASTOptions) {
    const [source, sourceLiteral] = this.sourceOf(options)
    return this.fn(
      options.methodsAsync ? [factory.createModifier(ts.SyntaxKind.AsyncKeyword)] : undefined,
      [
        this.propsParameter(this.event.properties, options),
        this.sourceParameter(source, options),
      ],
      this.implementation(options, sourceLiteral)
    )
  }

  // The Source type the helper accepts, and the literal it passes on
  sourceOf(options: ToASTOptions): [BaseType, ts.Expression] {
    const schema = options.sources.of(this.event.eventViews())
    return [TypeMapper.toSpecificType(schema.type), this.filledInSource(schema.filledIn)]
  }

  specifiedImplementation(options: ToASTOptions, params: ts.Expression[]) {
    const implementationCall = factory.createCallExpression(
      factory.createIdentifier("implementation"),
      undefined,
      params
    )

    return factory.createExpressionStatement(
      options.methodsAsync
        ? factory.createAwaitExpression(implementationCall)
        : implementationCall
    )
  }

  emptyImplementation(params: ts.Expression[]) {
    return factory.createCallExpression(
      factory.createPropertyAccessExpression(
        factory.createIdentifier("console"),
        factory.createIdentifier("log")
      ),
      undefined,
      params
    )
  }
}

function comment(event: View | Track): ts.Node[] {
  return event.description ? [factory.createJSDocComment(event.description)] : []
}

function namedExport(event: Track, options: ToASTOptions): ts.Node[] {
  return [factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(
        factory.createIdentifier(event.escapeKey()),
        undefined,
        undefined,
        new AnalyticsFunction(event).toAST(options)
      )],
      ts.NodeFlags.Const
    )
  )]
}

export function trackToAST(track: Track, options: ToASTOptions): ts.Node[] {
  return [...comment(track), ...namedExport(track, options)]
}

export function viewToAST(view: View, options: ToASTOptions): ts.Node[] {
  return [
    ...comment(view),
    factory.createExportAssignment(
      undefined,
      undefined,
      new AnalyticsFunction(view).toAST(options)
    ),
    ...view.tracks.flatMap(track => trackToAST(track, options))
  ]
}
