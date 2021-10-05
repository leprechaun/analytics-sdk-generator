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

class BaseEvent {
  comment(event: Screen | Track) {
    const nodes = []

    if(event.description) {
      nodes.push(factory.createJSDocComment(event.description))
    }

    return nodes
  }

  asNamedExport(event: Screen | Track, options: ToASTOptions) {
    return [factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(event.escapeKey()),
          undefined,
          undefined,
          new AnalyticsFunction(event).toAST({
            ...options
          })
        )],
        ts.NodeFlags.Const
      )
    )]
  }
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
      undefined,
      factory.createIdentifier(name),
      optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type,
      undefined
    )
  }

  propsParameter(properties: ObjectType, options: ToASTOptions) {
    if(properties.properties.length == 0) {
      return this.parameter("props", factory.createLiteralTypeNode(factory.createNull()), true)
    } else {
      return this.parameter("props", properties.toAST(options), false)
    }
  }

  sourceParameter(options?: ToASTOptions) {
    return this.parameter(
      "source",
      factory.createTypeLiteralNode(
        (this.event.sourceToObjectType().toAST(options) as ts.TypeLiteralNode).members
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


export class TrackAnalyticsFunction extends BaseEvent {
  track: Track

  constructor(track: Track) {
    super()
    this.track = track
  }

  toAST(options?: ToASTOptions) {
    const comment = this.comment(this.track)
    const main = this.asNamedExport(this.track, options)

    return comment.concat(main)
  }
}

export class ScreenSpecificTrackAnalyticsFunction extends BaseEvent {
  track: Track
  screen: Screen

  constructor(track: Track, screen: Screen) {
    super()
    this.track = track
    this.screen = screen
  }

  toAST(options?: ToASTOptions) {
    const comment = this.comment(this.track)
    const main = this.asNamedExport(this.track, options)

    return comment.concat(main)
  }
}

export class ScreenAnalyticsFunction extends BaseEvent {
  screen: Screen

  constructor(screen: Screen) {
    super()
    this.screen = screen
  }

  toAST(options?: ToASTOptions): ts.Node[] {
    const comment = this.comment(this.screen)
    const main = [
      factory.createExportAssignment(
        undefined,
        undefined,
        undefined,
        new AnalyticsFunction(this.screen).toAST({
          ...options
        })
      )
    ]

    const tracks = this.tracks(options)
    return comment.concat(main).concat(tracks)
  }

  tracks(options?: ToASTOptions) {
    const nodes = []

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
