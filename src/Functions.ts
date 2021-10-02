import ts, {factory } from 'typescript'

import { Screen, Track } from './EventTypes'
import { ObjectType } from './Types'

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

  parameter(name: string, type, optional = false) {
    return factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      factory.createIdentifier(name),
      optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type as ts.TypeNode,
      undefined
    )
  }

  propsParameter(properties: ObjectType, options: ToASTOptions) {
    return this.parameter("props", properties.toAST(options), false)
  }

  sourceParameter(options?: ToASTOptions) {
    return this.parameter(
      "source",
      factory.createTypeLiteralNode(
        this.event.sourceToObjectType().toAST(options).members
      ),
      true
    )
  }

  toAST(options?: ToASTOptions) {
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
