import ts, {factory } from 'typescript'

import { Track, View } from './EventTypes'
import { ObjectType } from './Types'
import { Sources } from './Source'
import { ViewAttributeValue } from './InputTypes'
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

export function literal(value: ViewAttributeValue): ts.Expression {
  if (typeof value === 'number') return factory.createNumericLiteral(value)
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse()
  return factory.createStringLiteral(value)
}

export class AnalyticsFunction {
  event: Track | View

  constructor(definition: Track | View) {
    this.event = definition
  }

  // A type literal member of the helper's argument
  member(name: string, type: ts.TypeNode, optional: boolean) {
    return factory.createPropertySignature(
      undefined,
      name,
      optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type
    )
  }

  // One named argument: `props` (only when the Event has Properties) and `source`
  argsParameter(properties: ObjectType, source: ObjectType, options: ToASTOptions) {
    const members = [
      ...(this.hasProperties() ? [this.member("props", properties.toAST(options), !this.requires(properties))] : []),
      this.member("source", source.toAST(options), !this.requires(source))
    ]
    const optional = !this.requires(properties) && !this.requires(source)

    return factory.createParameterDeclaration(
      undefined,
      undefined,
      factory.createIdentifier("args"),
      undefined,
      factory.createTypeLiteralNode(members),
      optional ? factory.createObjectLiteralExpression() : undefined
    )
  }

  // Whether the caller must pass some of these attributes
  requires(type: ObjectType) {
    return type.properties.some(property => property.required)
  }

  hasProperties() {
    return this.event.properties.properties.length > 0
  }

  // `args.<name>`
  arg(name: string) {
    return factory.createPropertyAccessExpression(factory.createIdentifier("args"), name)
  }

  // The Event handed to the Implementation: what happened, the View it happened on, and its Source
  eventLiteral(sourceLiteral: ts.Expression) {
    // A single View is named, with its View attributes; otherwise the Implementation completes it
    const { views } = this.event.eventViews()
    const view = views.length === 1
      ? [
        factory.createPropertyAssignment("name", factory.createStringLiteral(views[0].name)),
        ...Object.entries(views[0].attributes).map(([name, value]) => factory.createPropertyAssignment(name, literal(value)))
      ]
      : []

    return factory.createObjectLiteralExpression(
      [
        factory.createPropertyAssignment("type", factory.createStringLiteral(this.event.type)),
        factory.createPropertyAssignment("name", factory.createStringLiteral(this.event.name)),
        // The Implementation always sees `null` when there are no Properties to report
        factory.createPropertyAssignment("properties", this.hasProperties()
          ? factory.createBinaryExpression(this.arg("props"), ts.SyntaxKind.QuestionQuestionToken, factory.createNull())
          : factory.createNull()),
        factory.createPropertyAssignment("view", factory.createObjectLiteralExpression(view, true)),
        factory.createPropertyAssignment("source", sourceLiteral)
      ],
      true
    )
  }

  implementation(options: ToASTOptions, sourceLiteral: ts.Expression) {
    const params = [this.eventLiteral(sourceLiteral)]

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
      [this.argsParameter(this.event.properties, source, options)],
      this.implementation(options, sourceLiteral)
    )
  }

  // The Source type the helper accepts, and what it passes on: the caller's Source, as an object even when left out
  sourceOf(options: ToASTOptions): [ObjectType, ts.Expression] {
    return [
      TypeMapper.toSpecificType(options.sources.of()) as ObjectType,
      factory.createObjectLiteralExpression([factory.createSpreadAssignment(this.arg("source"))], true)
    ]
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
