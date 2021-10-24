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
    it('should include FeatureNames in shared definitions', () => {
      const shared = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'shared-definitions'
      })
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

    it('should include ScreenNames in shared definitions', () => {
      const shared = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'shared-definitions'
      })
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

    it('should include userId in shared definitions', () => {
      const shared = results.filter( (fnl: FileNodes) => {
        return fnl.path[0] == 'shared-definitions'
      })
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
