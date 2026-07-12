import ts, {factory } from 'typescript'

import { Screen, Track } from './EventTypes'
import { ObjectType } from './Types'

type ImportMapping = string[]

type ImportMappings = {
  [key: string]: ImportMapping
}

type ToASTOptions = {
  hasImplementation?: boolean,
  importMappings?: ImportMappings,
  methodsAsync: boolean
}

export class AnalyticsFunction {
  event: Track | Screen

  constructor(definition: Track | Screen) {
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

  sourceParameter(source: ObjectType, options?: ToASTOptions) {
    const sourceType = source.toAST(options)
    return this.parameter(
      "source",
      ts.isTypeLiteralNode(sourceType)
        ? factory.createTypeLiteralNode(sourceType.members)
        : factory.createTypeLiteralNode([]),
      true
    )
  }

  implementation(options: ToASTOptions, source: ObjectType) {
    const params = [
      factory.createStringLiteral(this.event.type),
      factory.createStringLiteral(this.event.name),
      factory.createIdentifier("props"),
      source.toPartialLiteralAST("source")
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
    const source = this.event.sourceToObjectType()
    return this.fn(
      options.methodsAsync ? [factory.createModifier(ts.SyntaxKind.AsyncKeyword)] : undefined,
      [
        this.propsParameter(this.event.properties, options),
        this.sourceParameter(source, options),
      ],
      this.implementation(options, source)
    )
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

function comment(event: Screen | Track): ts.Node[] {
  return event.description ? [factory.createJSDocComment(event.description)] : []
}

function namedExport(event: Screen | Track, options: ToASTOptions): ts.Node[] {
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

export function screenToAST(screen: Screen, options: ToASTOptions): ts.Node[] {
  return [
    ...comment(screen),
    factory.createExportAssignment(
      undefined,
      undefined,
      new AnalyticsFunction(screen).toAST(options)
    ),
    ...screen.tracks.flatMap(track => trackToAST(track, options))
  ]
}
