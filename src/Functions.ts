import ts, {factory } from 'typescript'

import { Event, EventType, Screen, Track } from './TrackingPlan'
import BaseType, { ObjectType, ObjectProperty, Constant, TypeReference } from './Types'

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

  uniqueFeaturesAndScreens() {
    const featureNamesSet = new Set<string>()
    const screenNamesSet = new Set<string>()

    if('screens' in this.event) {
      for(const s of this.event.screens) {
        screenNamesSet.add(s.name)
        for(const f of s.features) {
          featureNamesSet.add(f.name)
        }
      }
    }

    if('features' in this.event) {
      for(const f of this.event.features) {
        featureNamesSet.add(f.name)
      }
    }

    const featureNames = Array.from(featureNamesSet)
    const screenNames = Array.from(screenNamesSet)

    return {
      features: featureNames,
      screens: screenNames
    }

  }

  overwrites(options?: ToASTOptions) {
    const {
      screens,
      features
    } = this.uniqueFeaturesAndScreens()

    const overwrites = []

    if(features.length == 1) {
      overwrites.push(factory.createPropertyAssignment(
        factory.createIdentifier('feature'),
        factory.createStringLiteral(features[0] as string)
      ))
    }

    if(screens.length == 1) {
      overwrites.push(factory.createPropertyAssignment(
        factory.createIdentifier('screen'),
        factory.createStringLiteral(screens[0] as string)
      ))
    }

    return overwrites
  }

  sourcePropertySignatures(options: ToASTOptions) {
    const uniqueSourceAttributeValues = this.uniqueFeaturesAndScreens()

    return ['feature', 'screen', 'widget', 'element', 'action'].map( name => {
      let type: BaseType

      const k = name + 's'
      if(!(k in uniqueSourceAttributeValues)) {
        return new ObjectProperty(
          name,
          BaseType.toSpecificType({
            'type': 'string'
          }),
          false
        ).toAST(options)
      }
      else {
        let ref: string
        if(name == 'feature') {
          ref = 'FeatureNames'
        } else if(name == 'screen') {
          ref = 'ScreenNames'
        }

        const k = name + 's'
        switch(uniqueSourceAttributeValues[k].length) {
          case 0:
            return new ObjectProperty(
              name,
              BaseType.toSpecificType({
                "$ref": `#/$defs/${ref}`
              }),
              true
            ).toAST(options)

          case 1:
            return new ObjectProperty(
              name,
              new Constant(uniqueSourceAttributeValues[k][0]),
              false
            ).toAST(options)

          default:
            return new ObjectProperty(
              name,
              BaseType.toSpecificType({
                type: 'string',
                enum: uniqueSourceAttributeValues[k]
              }),
              true
            ).toAST(options)
        }
      }
    })
  }

  sourceParameter(options?: ToASTOptions) {
    const o = {
      required: false,
      items: {
        feature: true,
        screen: true,
        widget: true,
        element: true,
        action: true
      }
    }

    return factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      factory.createIdentifier("source"),
      o.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
      factory.createTypeLiteralNode(
        this.sourcePropertySignatures(options)
      ),
      undefined
    )
  }

  toAST(options?: ToASTOptions) {
    const block = this.functionBlock(options)

    let implementation: ts.ExpressionStatement | ts.CallExpression
    if(options.hasImplementation) {
      implementation = this.specifiedImplementation()
    } else {
      implementation = this.emptyImplementation()
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
        block.concat([implementation]),
        true
      )
    )
  }

  specifiedImplementation() {
    return factory.createExpressionStatement(
      factory.createAwaitExpression(
        factory.createCallExpression(
          factory.createIdentifier("implementation"),
          undefined,
          [
            factory.createIdentifier("type"),
            factory.createIdentifier("name"),
            factory.createIdentifier("props"),
            factory.createIdentifier("overwrittenSource")
          ]
        )
      )
    )
  }

  emptyImplementation() {
    return factory.createCallExpression(
      factory.createPropertyAccessExpression(
        factory.createIdentifier("console"),
        factory.createIdentifier("log")
      ),
      undefined,
      [
        factory.createIdentifier("type"),
        factory.createIdentifier("name"),
        factory.createIdentifier("props"),
        factory.createIdentifier("overwrittenSource")
      ]
    )
  }

  functionBlock(options: ToASTOptions): any[] {
    const overwritten = this.overwrites(options)
    return [
      factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [factory.createVariableDeclaration(
                factory.createIdentifier("type"),
                undefined,
                undefined,
                factory.createStringLiteral(this.event.type)
              )],
              ts.NodeFlags.Const | ts.NodeFlags.AwaitContext | ts.NodeFlags.ContextFlags | ts.NodeFlags.TypeExcludesFlags
            )
          ),
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier("name"),
            undefined,
            undefined,
            factory.createStringLiteral(this.event.name)
          )],
          ts.NodeFlags.Const | ts.NodeFlags.AwaitContext | ts.NodeFlags.ContextFlags | ts.NodeFlags.TypeExcludesFlags
        )
      ),
      factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList(
          [factory.createVariableDeclaration(
            factory.createIdentifier("overwrittenSource"),
            undefined,
            undefined,
            factory.createObjectLiteralExpression(
              (overwritten as any[]).concat([
                factory.createSpreadAssignment(factory.createIdentifier("source"))
              ]),
              true
            )
          )],
          ts.NodeFlags.Const | ts.NodeFlags.AwaitContext | ts.NodeFlags.ContextFlags | ts.NodeFlags.TypeExcludesFlags
        )
      )
    ]
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

  generateIdentifier() {
    return factory.createPropertyAccessExpression(
      factory.createIdentifier(this.screen.escapeKey()),
      factory.createIdentifier(this.track.escapeKey())
    )
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
