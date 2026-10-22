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
      ThirdTrack: {
        name: "Third Track"
      }
    },
    views: {
      Welcome: {
        name: "Welcome Screen",
        tracks: ["SomeTrack", "AnotherTrack"]
      },
      AnotherScreen: {
        name: "Another Screen"
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

  describe('views', () => {
    it('should have a file for "Welcome"', () => {
      expect(results.has('views/Welcome')).toBe(true)
    })

    it('should have a file for "AnotherScreen"', () => {
      expect(results.has('views/AnotherScreen')).toBe(true)
    })
  })

  describe('tracks', () => {
    it('should produce a tracks file', () => {
      expect(results.has('tracks')).toBe(true)
    })
  })

  describe('shared-definitions', () => {
    const shared = results.get('shared-definitions') ?? []

    describe('ViewNames', () => {
      it('should include ViewNames', () => {
        expect(shared).toEqual(expect.arrayContaining([
          expect.objectContaining({
            comment: "List of all the view names"
          }),
          expect.objectContaining({
            name: expect.objectContaining({
              escapedText: "ViewNames"
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
