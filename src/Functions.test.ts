import ts, { factory } from 'typescript'
import * as functions from './Functions'
import * as EventTypes from './EventTypes'
import * as InputTypes from './InputTypes'
import * as Types from './Types'
import TypeMapper from './TypeMapper'

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
    ast = fn.toAST({hasImplementation: false})
  })

  afterEach( () => {
    (track.properties.toAST as any).mockReset()
  })

  it('returns an arrow function', () => {
    expect(ast.kind).toEqual(210)
  })

  it('gets marked as async', () => {
    expect(ast.modifiers[0].kind).toEqual(129)
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
        ast = fn.toAST({hasImplementation: true})
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

        ast = new functions.AnalyticsFunction(screen).toAST({hasImplementation: true})
      })

      describe('parameters', () => {
        it('has type as first parameter', () => {
          expect(ast.body.statements[0].expression.expression.arguments[0].text).toEqual('screen')
        })
      })
    })
  })
})
