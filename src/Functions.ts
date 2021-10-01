import ts, {factory } from 'typescript'

import { Screen, Track } from './EventTypes'
import { NamedType, PrintableDataType, ObjectType, ObjectProperty, Constant, StringType } from './Types'
import * as InputTypes from './InputTypes'
import TypeMapper from './TypeMapper'

type ImportMapping = string[]

type ImportMappings = {
  [key: string]: ImportMapping
}

type ToASTOptions = {
  hasImplementation?: boolean,
  importMappings?: ImportMappings
}

export class AnalyticsFunction {
  event: Track | Screen

  constructor(definition: Track | Screen) {
    this.event = definition
  }

  propsParameter(properties: ObjectType, options: ToASTOptions) {
    return factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      factory.createIdentifier("props"),
      undefined,
      properties.toAST(options),
      undefined
    )
  }

  sourceParameter(options?: ToASTOptions) {
    return factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      factory.createIdentifier("source"),
      factory.createToken(ts.SyntaxKind.QuestionToken),
      factory.createTypeLiteralNode(
        this.event.sourceToObjectType().toAST(options).members
      ),
      undefined
    )
  }

  toAST(options?: ToASTOptions) {
    const block = this.functionBlock(options)

    let implementation: ts.ExpressionStatement | ts.CallExpression
    const params = [
        factory.createStringLiteral(this.event.type),
        factory.createStringLiteral(this.event.name),
      factory.createIdentifier("props"),
      this.event.sourceToObjectType().toPartialLiteralAST("source")
    ]

    if(options.hasImplementation) {
      implementation = this.specifiedImplementation(params)
    } else {
      implementation = this.emptyImplementation(params)
    }

    return factory.createArrowFunction(
      [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      [
        this.propsParameter(this.event.properties, options),
        this.sourceParameter(options),
      ],
      undefined,
      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock(
        [implementation as ts.Statement],
        true
      )
    )
  }

  specifiedImplementation(params: ts.Expression[]) {
    return factory.createExpressionStatement(
      factory.createAwaitExpression(
        factory.createCallExpression(
          factory.createIdentifier("implementation"),
          undefined,
          params
          )
      )
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

  stringVariable(name: string, value: string) {
    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(name),
          undefined,
          undefined,
          factory.createStringLiteral(value)
        )],
        ts.NodeFlags.Const | ts.NodeFlags.AwaitContext | ts.NodeFlags.ContextFlags | ts.NodeFlags.TypeExcludesFlags
      )
    )
  }

  eventType() {
    return this.stringVariable("type", this.event.type)
  }

  eventName() {
    return this.stringVariable("name", this.event.name)
  }

  functionBlock(options: ToASTOptions): any[] {
    return []
  }
}


export class TrackAnalyticsFunction {
  track: Track

  constructor(track: Track) {
    this.track = track
  }

  toAST(options?: ToASTOptions) {
    const nodes = []

    if(this.track.description) {
      nodes.push(factory.createJSDocComment(this.track.description))
    }

    nodes.push(factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(this.track.escapeKey()),
          undefined,
          undefined,
          new AnalyticsFunction(this.track).toAST({
            ...options
          })
        )],
        ts.NodeFlags.Const
      )
    ))

    return nodes
  }
}

export class ScreenSpecificTrackAnalyticsFunction {
  track: Track
  screen: Screen

  constructor(track: Track, screen: Screen) {
    this.track = track
    this.screen = screen
  }

  toAST(options?: ToASTOptions) {
    const nodes = []

    if(this.track.description) {
      nodes.push(factory.createJSDocComment(this.track.description))
    }

    nodes.push(factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(this.track.escapeKey()),
          undefined,
          undefined,
          new AnalyticsFunction(this.track).toAST({
            ...options
          })
        )],
        ts.NodeFlags.Const
      )
    ))

    return nodes
  }
}

export class ScreenAnalyticsFunction {
  screen: Screen

  constructor(screen: Screen) {
    this.screen = screen
  }

  toAST(options?: ToASTOptions): ts.Node[] {
    const nodes = []

    if(this.screen.description) {
      nodes.push(factory.createJSDocComment(this.screen.description))
    }

    nodes.push(
      factory.createExportAssignment(
        undefined,
        undefined,
        undefined,
        new AnalyticsFunction(this.screen).toAST({
          ...options
        })
      )
    )

    if(this.screen.tracks.length > 0) {
      for(const track of this.screen.tracks) {
        const ast = new ScreenSpecificTrackAnalyticsFunction(track, this.screen).toAST(options)
        for(const n of ast) {
          nodes.push(n)
        }
      }
    }

    return nodes
  }
}
