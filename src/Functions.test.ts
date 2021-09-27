import ts from 'typescript'
import * as functions from './Functions'
import * as EventTypes from './EventTypes'

describe(functions.AnalyticsFunction, () => {
  const track = new EventTypes.Track({
    key: "Test&Event",
    name: "Test And Event",
    properties: {
      thing: {
        type: 'object',
        properties: {
          subthing: {
            type: 'string',
            enum: ['one', 'two', 'three']
          }
        }
      },
      anotherthing: {
        type: 'string'
      }
    }
  })

  const fn = new functions.AnalyticsFunction(track)
  const ast = fn.toAST({})

  it('returns an arrow function', () => {
    expect(ts.isArrowFunction(ast)).toBeTruthy()
  })

  describe('function', () => {
    describe('input', () => {
      describe('properties', () => {
        const props = ast.parameters[0] as any

        it('takes `props` as first required argument', () => {
          expect((props.name as ts.Identifier).escapedText).toEqual('props')
          expect(ast.parameters[0].questionToken).toBeUndefined()
        })

        it('is an object', () => {
          expect(props.type).toBeTruthy()
          expect(ts.isTypeNode(props.type)).toBeTruthy()
          expect(props.kind).toEqual(161)
        })

        describe('properties properties', () => {
          it('has thing', () => {
            const thing = props.type.members[0]
            expect(thing.name.escapedText).toEqual('thing')
            expect(thing.type.kind).toEqual(178)
          })

          it('has anotherthing', () => {
            const thing = props.type.members[1]
            expect(thing.name.escapedText).toEqual('anotherthing')
            expect(thing.type.kind).toEqual(147)
          })
        })
      })

      describe('source', () => {
        it('takes `source` as second optional argument', () => {
          expect((ast.parameters[1].name as any).escapedText).toEqual('source')
          expect(ast.parameters[1].questionToken).not.toBeUndefined()
        })

        describe('feature', () => {
          const feature = (ast.parameters[1].type as any ).members[0]
          it('is named "feature"', () => {
            expect(feature).toEqual(
              expect.objectContaining({
                name: expect.objectContaining({
                  escapedText: "feature"
                })
              })
            )
          })

          it('sets feature required by default', () => {
            expect(feature.questionToken).toBeUndefined()
          })

          it('restricts to FeatureNames when unknown', () => {
            expect(feature.questionToken).toBeUndefined()
            expect(feature.type.typeName.escapedText).toEqual("FeatureNames")
          })

          it('is an enum\'ish when there are 2 or more options', () => {
            const track = new EventTypes.Screen({
              key: "Test&Event",
              name: "Test And Event",
              features: [
              ],
              properties: {
                thing: {
                  type: 'object',
                  properties: {
                    subthing: {
                      type: 'string',
                      enum: ['one', 'two', 'three']
                    }
                  }
                }
              }
            })

            track.features.push(
              {
                name: "SomeFeatureName"
              } as EventTypes.Feature
            )
            track.features.push(
              {
                name: "AnotherFeature"
              } as EventTypes.Feature
            )

            const fn = new functions.AnalyticsFunction(track)
            const ast = fn.toAST({})
            const feature = (ast.parameters[1].type as any).members[0]

            expect(feature.questionToken).toBeUndefined()
            expect(feature.type.types).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  literal: expect.objectContaining({
                    "text": "SomeFeatureName"
                  })
                }),
                expect.objectContaining({
                  literal: expect.objectContaining({
                    "text": "AnotherFeature"
                  })
                })
              ])
            )
          })

          it('sets a constant when theres only one option', () => {
            const track = new EventTypes.Screen({
              key: "Test&Event",
              name: "Test And Event",
              features: [
              ],
              properties: {
                thing: {
                  type: 'object',
                  properties: {
                    subthing: {
                      type: 'string',
                      enum: ['one', 'two', 'three']
                    }
                  }
                }
              }
            })

            track.features.push(
              {
                name: "SomeFeatureName"
              } as EventTypes.Feature
            )

            const fn = new functions.AnalyticsFunction(track)
            const ast = fn.toAST({})
            const feature = (ast.parameters[1].type as any).members[0]

            expect(feature.type.literal.text).toEqual('SomeFeatureName')
            expect(feature.questionToken).not.toBeUndefined()
          })

        })

        describe('screen', () => {
          const feature = (ast.parameters[1].type as any ).members[1]
          it('is named "screen"', () => {
            expect(feature).toEqual(
              expect.objectContaining({
                name: expect.objectContaining({
                  escapedText: "screen"
                })
              })
            )
          })

          it('sets screen required by default', () => {
            expect(feature.questionToken).toBeUndefined()
          })

          it('restricts to ScreenNames when unknown', () => {
            expect(feature.type.typeName.escapedText).toEqual("ScreenNames")
          })

          it('is an enum\'ish when there are 2 or more options', () => {
            const track = new EventTypes.Track({
              key: "Test&Event",
              name: "Test And Event",
              features: [
              ],
              properties: {
                thing: {
                  type: 'object',
                  properties: {
                    subthing: {
                      type: 'string',
                      enum: ['one', 'two', 'three']
                    }
                  }
                }
              }
            })

            track.screens.push(
              {
                key: "SomeScreen",
                name: "SomeScreen",
                features: [{name:"SomeFeature"}]
              } as EventTypes.Screen
            )
            track.screens.push(
              {
                key: "AnotherScreen",
                name: "AnotherScreen",
                features: [{name:"AnotherFeature"}]
              } as EventTypes.Screen
            )

            const fn = new functions.AnalyticsFunction(track)
            const ast = fn.toAST({})
            const screen = (ast.parameters[1].type as any).members[1]

            expect(screen.name.escapedText).toEqual('screen')
            expect(screen.type.types.constructor.name).toBe('Array')
            expect(screen.type.types.length).toBe(2)
            expect(screen.type.types).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  literal: expect.objectContaining({
                    "text": "SomeScreen"
                  })
                }),
                expect.objectContaining({
                  literal: expect.objectContaining({
                    "text": "AnotherScreen"
                  })
                })
              ])
            )
          })

          it('sets a constant when theres only one option', () => {
            const track = new EventTypes.Track({
              key: "Test&Event",
              name: "Test And Event",
              features: [
              ],
              properties: {
                thing: {
                  type: 'object',
                  properties: {
                    subthing: {
                      type: 'string',
                      enum: ['one', 'two', 'three']
                    }
                  }
                }
              }
            })

            track.screens.push(
              {
                key: "SomeScreen",
                name: "SomeScreen",
                features: [{name:"SomeFeature"}]
              } as EventTypes.Screen
            )

            const fn = new functions.AnalyticsFunction(track)
            const ast = fn.toAST({})
            const screen = (ast.parameters[1].type as any).members[1]

            expect(screen.type.literal.text).toEqual('SomeScreen')
            expect(screen.questionToken).not.toBeUndefined()
          })
        })
      })
    })
  })
})

describe.skip(functions.TrackAnalyticsFunction, () => {

})

describe.skip(functions.ScreenAnalyticsFunction, () => {

})

describe.skip(functions.ScreenSpecificTrackAnalyticsFunction, () => {

})
