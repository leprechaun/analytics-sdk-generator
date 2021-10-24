import TrackingPlan from './TrackingPlan'
import Transliterator, { FileNodes } from './Transliterator'

describe(Transliterator, () => {
  const plan = {
    tracks: {
      SomeTrack: {},
      AnotherTrack: {
        name: "Another Track",
        properties: {
          some_property: {
            type: "string"
          }
        }
      },
      FeatureSpecificTrack: {
        name: "Feature Specific Track",
        features: ['Special Feature']
      }
    },
    screens: {
      Welcome: {
        name: "Welcome Screen",
        features: [
          "Onboarding", "Just Onboarding"
        ],
        tracks: ["SomeTrack", "AnotherTrack"]
      },
      AnotherScreen: {
        name: "Another Screen",
        features: [ 'AnotherFeature', 'Onboarding' ]
      }
    },
    traits: {
      userId: {
        $ref: "#/$defs/userId"
      }
    },
    $defs: {
      userId: {
        type: 'string',
        format: 'email'
      }
    }
  }

  const TP = new TrackingPlan(plan)
  const T = new Transliterator({})

  const results = T.transliterate(TP)

  describe('output', () => {
    describe('screens', () => {
      const screens = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'screens'
      })

      it('should have a file for "Welcome"', () => {
        expect(screens.filter( s => s.path[1] == 'Welcome').length).toBeGreaterThanOrEqual(1)
      })

      it('should have a file for "AnotherScreen"', () => {
        expect(screens.filter( s => s.path[1] == 'AnotherScreen').length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('tracks', () => {
      const tracks = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'tracks'
      })

      it('should include a number of tracks', () => {
        expect(tracks.length).toBeGreaterThanOrEqual(3)
      })
    })

    describe('shared-definitions', () => {
      const shared = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'shared-definitions'
      })

      describe('Featurenames', () => {
        it('should include FeatureNames in shared definitions', () => {
          expect(
            shared
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                nodes: expect.arrayContaining([
                  expect.objectContaining({
                    comment: "List of all the feature names"
                  }),
                  expect.objectContaining({
                    name: expect.objectContaining({
                      escapedText: "FeatureNames"
                    }),
                    type: expect.objectContaining({
                      kind: 183
                    })
                  })
                ])
              })
            ])
          )
        })
      })

      describe('ScreenNames', () => {
        it('should include ScreenNames in shared definitions', () => {
          expect(
            shared
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                nodes: expect.arrayContaining([
                  expect.objectContaining({
                    comment: "List of all the screen names"
                  }),
                  expect.objectContaining({
                    name: expect.objectContaining({
                      escapedText: "ScreenNames"
                    }),
                    type: expect.objectContaining({
                      kind: 183
                    })
                  })
                ])
              })
            ])
          )
        })
      })

      describe('traits', () => {
        it('should include userId in shared definitions', () => {
          expect(
            shared
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                nodes: expect.arrayContaining([
                  expect.objectContaining({
                    name: expect.objectContaining({
                      escapedText: "userId"
                    }),
                    type: expect.objectContaining({
                      kind: 147
                    })
                  })
                ])
              })
            ])
          )
        })
      })
    })
  })
})
