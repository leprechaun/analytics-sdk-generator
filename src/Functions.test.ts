import ts, { factory } from 'typescript'
import * as functions from './Functions'
import * as EventTypes from './EventTypes'
import * as InputTypes from './InputTypes'
import * as Types from './Types'
import TypeMapper from './TypeMapper'

const print = (nodelist: any[]) => {
  const nodes = factory.createNodeArray(nodelist)
  const sourceFile = ts.createSourceFile(
    "example.ts",
    "",
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  )

  const printer = ts.createPrinter({
    omitTrailingSemicolon: true
  })

  const outputFile = printer.printList(
    ts.ListFormat.MultiLine,
    nodes,
    sourceFile
  )

  console.log(outputFile)
}


describe(functions.AnalyticsFunction, () => {
  const properties = {
    thing: {
      type: 'string',
      enum: ['hello']
    }
  }

  const defaultPropsCall = {
    type: 'object',
    properties,
    required: [],
    additionalProperties: false
  } 

  let track: EventTypes.Track
  let trackProps
  let trackPropsToAST
  let trackSource
  let trackSourceToAST
  let sourceToPartialLiteralAST
  let fn: functions.AnalyticsFunction
  let ast: any

  let spyTrackPropsToAST
  let spySourceToObjectType
  let spyTrackSourceToPartialLiteralAST

  let partialLiteralAST

  beforeEach( () => {
    track = new EventTypes.Track({
      key: "Test&Event",
      name: "Test And Event",
      properties
    } as InputTypes.TrackDefinition)

    trackProps = TypeMapper.toSpecificType(
      defaultPropsCall as InputTypes.ObjectDefinition
    ).toAST({})

    trackSource = (TypeMapper.toSpecificType(
      {
        type: 'object',
        properties: {
          lolsource: {
            type: 'string'
          }
        }
      } as InputTypes.ObjectDefinition
    )) as Types.ObjectType

    partialLiteralAST = trackSource.toPartialLiteralAST()

    spyTrackPropsToAST = jest.spyOn(track.properties, 'toAST')
    spyTrackPropsToAST.mockReturnValueOnce(trackProps)

    spySourceToObjectType = jest.spyOn(track, 'sourceToObjectType')
    spySourceToObjectType.mockReturnValue(trackSource)

    spyTrackSourceToPartialLiteralAST = jest.spyOn(trackSource, 'toPartialLiteralAST')
    spyTrackSourceToPartialLiteralAST.mockReturnValueOnce(partialLiteralAST)

    fn = new functions.AnalyticsFunction(track)
    ast = fn.toAST({hasImplementation: false, methodsAsync: true})
  })

  afterEach( () => {
    (track.properties.toAST as any).mockReset()
  })

  it('returns an arrow function', () => {
    expect(ast.kind).toEqual(210)
  })

  describe('async/await', () => {
    it('gets marked as async when `methodsAsync=true', () => {
      ast = fn.toAST({hasImplementation: false, methodsAsync: true})
      expect(ast.modifiers[0].kind).toEqual(ts.SyntaxKind.AsyncKeyword)
    })

    it('gets marked as sync when `methodsAsync=false`', () => {
      ast = fn.toAST({hasImplementation: false, methodsAsync: false})
      expect(ast.modifiers).toBeUndefined()
    })
  })

  describe('parameters', () => {
    let propsParameter
    let sourceParameter

    beforeEach( () => {
      propsParameter = ast.parameters[0]
      sourceParameter = ast.parameters[1]
    })

    describe('properties', () => {
      it('casts an expanded props object', () => {
        expect(spyTrackPropsToAST).toHaveBeenCalled()
      })

      it('has props as first argument', () => {
        expect(propsParameter.name.escapedText).toEqual('props')
      })

      it('marks props as required', () => {
        expect(propsParameter.questionToken).toBeUndefined()
      })

      it('sets whatever that returns to the props parameter', () => {
        expect(propsParameter.type.members).toEqual(trackProps.members)
      })
    })

    describe('source', () => {
      it('has source as second argument', () => {
        expect(sourceParameter.name.escapedText).toEqual('source')
      })

      it('marks source as optional', () => {
        expect(sourceParameter.questionToken).not.toBeUndefined()
      })

      it('calls track.sourceToObjectType', () => {
        expect(track.sourceToObjectType).toHaveBeenCalled()
      })

      it('sets whatever that returns to the props parameter', () => {
        expect(sourceParameter.type.members).toEqual(trackSource.toAST().members)
      })
    })
  })

  describe('body', () => {
    describe('w/out implementation', () => {
      it('calls console.log', () => {
        expect(ast.body.statements[0].expression.expression.escapedText).toEqual("console")
        expect(ast.body.statements[0].expression.name.escapedText).toEqual("log")
      })

      describe('parameters', () => {
        it('has type as first parameter', () => {
          expect(ast.body.statements[0].arguments[0].text).toEqual('track')

        })

        it('has name as second parameter', () => {
          expect(ast.body.statements[0].arguments[1].text).toEqual('Test And Event')
        })

        it('has props as third parameter', () => {
          expect(ast.body.statements[0].arguments[2].escapedText).toEqual('props')
        })

        it('overwrites source with defaults as 4th argument', () => {
          expect(ast.body.statements[0].arguments[3].kind).toEqual(201)
        })
      })
    })

    describe('w/ implementation', () => {
      beforeEach( () => {
        ast = fn.toAST({hasImplementation: true, methodsAsync: true})
      })

      it('calls implementation', () => {
        expect(ast.body.statements[0].expression.expression.expression.escapedText).toEqual("implementation")
      })

      describe('parameters', () => {
        it('has type as first parameter', () => {
          expect(ast.body.statements[0].expression.expression.arguments[0].text).toEqual('track')
        })

        it('has name as second parameter', () => {
          expect(ast.body.statements[0].expression.expression.arguments[1].text).toEqual('Test And Event')
        })

        it('has props as third parameter', () => {
          expect(ast.body.statements[0].expression.expression.arguments[2].escapedText).toEqual('props')
        })

        it('overwrites source with defaults as 4th argument', () => {
          const source = ast.body.statements[0].expression.expression.arguments[3]
          expect(source.kind).toEqual(201)
          expect(source.properties[ source.properties.length - 1].kind).toEqual(291)
          expect(source.properties[ source.properties.length - 1].expression.escapedText).toEqual("source")
        })
      })
    })

    describe('varies `type` accordingly', () => {
      let screen
      let ast

      beforeEach( () => {
        screen = new EventTypes.Screen({
          key: "Test&Event",
          name: "Test And Event",
          properties
        } as InputTypes.TrackDefinition)

        ast = new functions.AnalyticsFunction(screen).toAST({hasImplementation: true, methodsAsync: true})
      })

      describe('parameters', () => {
        it('has type as first parameter', () => {
          expect(ast.body.statements[0].expression.expression.arguments[0].text).toEqual('screen')
        })
      })
    })
  })
})

describe(functions.ScreenAnalyticsFunction, () => {
  const screen = new EventTypes.Screen({
    key: "SomeScreen",
    name: "Some Screen"
  })
  const fn = new functions.ScreenAnalyticsFunction(screen)

  describe('a bare screen without tracks', () => {
    const ast = fn.toAST({methodsAsync: true})
    const main = ast[0]

    it('just has one statement', () => {
      expect((ast as any).length).toEqual(1)
    })

    it('default exports an AnalyticsFunction', () => {
      expect(main.kind).toEqual(ts.SyntaxKind.ExportAssignment)
      expect((main as any).expression.kind).toEqual(ts.SyntaxKind.ArrowFunction)
      expect((main as any).expression.expression).toEqual((fn.toAST()[0] as any).body)
    })

    describe('a bare screen and description without tracks', () => {
      const screen = new EventTypes.Screen({
        key: "SomeScreen",
        name: "Some Screen",
        description: "blah blah"
      })
      const fn = new functions.ScreenAnalyticsFunction(screen)

      const ast = fn.toAST({methodsAsync: true})
      const comment = ast[0]
      const main = ast[1]

      it('has two statements', () => {
        expect((ast as any).length).toEqual(2)
      })

      it('has a jsdoc as first statement', () => {
        expect(comment.kind).toEqual(ts.SyntaxKind.JSDocComment)
        expect((comment as any).comment).toEqual('blah blah')
      })

      it('default exports an AnalyticsFunction', () => {
        expect(main.kind).toEqual(ts.SyntaxKind.ExportAssignment)
        expect((main as any).expression.kind).toEqual(ts.SyntaxKind.ArrowFunction)
        expect((main as any).expression.expression).toEqual((fn.toAST({methodsAsync: true})[0] as any).body)
      })
    })
  })

  describe('screen with a couple tracks', () => {
    const screen = new EventTypes.Screen({
      key: "SomeScreen",
      name: "Some Screen"
    })
    screen.tracks.push(new EventTypes.Track({
      key: "sometrack"
    }))
    screen.tracks.push(new EventTypes.Track({
      key: "anothertrack"
    }))

    const fn = new functions.ScreenAnalyticsFunction(screen)

    describe('the screen', () => {
      const ast = fn.toAST({methodsAsync: true})
      const main = ast[0]

      it('has one statement for each', () => {
        expect((ast as any).length).toEqual(3)
      })

      it('default exports an AnalyticsFunction', () => {
        expect(main.kind).toEqual(ts.SyntaxKind.ExportAssignment)
        expect((main as any).expression.kind).toEqual(ts.SyntaxKind.ArrowFunction)
        expect((main as any).expression.expression).toEqual((fn.toAST({methodsAsync: true})[0] as any).body)
      })

      it('calls tracks with the same ToASTOptions', () => {
        const saf = new functions.ScreenAnalyticsFunction(screen)
        jest.spyOn(saf, 'tracks')

        const toASTOptions = {importMappings: {"$defs": ['foo', 'bar']}, methodsAsync: true}

        saf.toAST(toASTOptions)

        expect(saf.tracks).toHaveBeenCalledWith(toASTOptions)
      })


      it('exports named functions for each track', () => {
        expect(ast[1].kind).toEqual(ts.SyntaxKind.VariableStatement)
        expect((ast[1] as any).declarationList.declarations.length).toEqual(1)
        expect((ast[1] as any).declarationList.declarations[0].name.escapedText).toEqual('sometrack')
      })

      it('exports named functions for each track', () => {
        expect(ast[2].kind).toEqual(ts.SyntaxKind.VariableStatement)
        expect((ast[2] as any).declarationList.declarations.length).toEqual(1)
        expect((ast[2] as any).declarationList.declarations[0].name.escapedText).toEqual('anothertrack')
      })
    })
  })
})

describe(functions.ScreenSpecificTrackAnalyticsFunction, () => {
  const screen = new EventTypes.Screen({
    key: "SomeScreen",
    name: "Some Screen"
  })

  const track = new EventTypes.Track({
    key: "SomeTrack",
    name: "Some Track",
    description: "hello world"
  })

  const fn = new functions.ScreenSpecificTrackAnalyticsFunction(track, screen)

  const ast = fn.toAST({methodsAsync: true})
  const comment = ast[0]
  const main = ast[1]

  const declaration = main.declarationList.declarations[0]

  it('has a comment', () => {
    expect(comment.kind).toEqual(ts.SyntaxKind.JSDocComment)
    expect((comment as any).comment).toEqual('hello world')
  })

  it('exports a function named with $key', () => {
    expect(declaration.name.escapedText).toEqual("SomeTrack")
    expect(declaration.initializer.kind).toEqual(ts.SyntaxKind.ArrowFunction)
  })

  it('should use AnalyticsFunction', () => {
    expect(declaration.initializer).toEqual(new functions.AnalyticsFunction(track).toAST({methodsAsync: true}))
  })

})
