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

  implementation(options: ToASTOptions) {
    const params = [
        factory.createStringLiteral(this.event.type),
        factory.createStringLiteral(this.event.name),
      factory.createIdentifier("props"),
      this.event.sourceToObjectType().toPartialLiteralAST("source")
    ]

    if(options.hasImplementation) {
      return this.specifiedImplementation(options, params)
    } else {
      return this.emptyImplementation(params)
    }
  }

  fn(asynchronous: ts.Modifier[] | undefined, parameters: ts.ParameterDeclaration[], implementation: ts.ExpressionStatement | ts.CallExpression, options: ToASTOptions) {
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
    return this.fn(
      options.methodsAsync ? [factory.createModifier(ts.SyntaxKind.AsyncKeyword)] : undefined,
      [
        this.propsParameter(this.event.properties, options),
        this.sourceParameter(options),
      ],
      this.implementation(options),
      options
    )
  }

  specifiedImplementation(options: ToASTOptions, params: ts.Expression[]) {
    if(options.methodsAsync) {
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
    else {
      return factory.createExpressionStatement(
        factory.createCallExpression(
          factory.createIdentifier("implementation"),
          undefined,
          params
        )
      )
    }

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

export class TrackFunction extends BaseEvent {
  track: Track

  toAST(options?: ToASTOptions) {
    const comment = this.comment(this.track)
    const main = this.asNamedExport(this.track, options)

    return comment.concat(main)
  }
}

export class TrackAnalyticsFunction extends TrackFunction {
  track: Track

  constructor(track: Track) {
    super()
    this.track = track
  }
}

export class ScreenSpecificTrackAnalyticsFunction extends TrackFunction {
  track: Track
  screen: Screen

  constructor(track: Track, screen: Screen) {
    super()
    this.track = track
    this.screen = screen
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
    if(this.screen.tracks.length > 0) {
      const functionsAndComments = this.screen.tracks.map( track => {
        return new ScreenSpecificTrackAnalyticsFunction(track, this.screen).toAST(options)
      })

      return [].concat(...functionsAndComments)
    } else {
      return []
    }
  }
}
