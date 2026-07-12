import { SyntaxKind } from 'typescript'

import TrackingPlan from './TrackingPlan'
import Transliterator from './Transliterator'

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

  describe('screens', () => {
    it('should have a file for "Welcome"', () => {
      expect(results.has('screens/Welcome')).toBe(true)
    })

    it('should have a file for "AnotherScreen"', () => {
      expect(results.has('screens/AnotherScreen')).toBe(true)
    })
  })

  describe('tracks', () => {
    it('should produce a tracks file', () => {
      expect(results.has('tracks')).toBe(true)
    })
  })

  describe('shared-definitions', () => {
    const shared = results.get('shared-definitions') ?? []

    describe('FeatureNames', () => {
      it('should include FeatureNames', () => {
        expect(shared).toEqual(expect.arrayContaining([
          expect.objectContaining({
            comment: "List of all the feature names"
          }),
          expect.objectContaining({
            name: expect.objectContaining({
              escapedText: "FeatureNames"
            }),
            type: expect.objectContaining({
              kind: SyntaxKind.UnionType
            })
          })
        ]))
      })
    })

    describe('ScreenNames', () => {
      it('should include ScreenNames', () => {
        expect(shared).toEqual(expect.arrayContaining([
          expect.objectContaining({
            comment: "List of all the screen names"
          }),
          expect.objectContaining({
            name: expect.objectContaining({
              escapedText: "ScreenNames"
            }),
            type: expect.objectContaining({
              kind: SyntaxKind.UnionType
            })
          })
        ]))
      })
    })

    describe('defs', () => {
      it('should include userId from $defs', () => {
        expect(shared).toEqual(expect.arrayContaining([
          expect.objectContaining({
            name: expect.objectContaining({
              escapedText: "userId"
            }),
            type: expect.objectContaining({
              kind: SyntaxKind.StringKeyword
            })
          })
        ]))
      })
    })
  })
})
