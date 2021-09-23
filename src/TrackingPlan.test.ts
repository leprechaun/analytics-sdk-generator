import TrackingPlan, { Feature, Screen, Track } from './TrackingPlan'
import * as types from './Types'

describe(TrackingPlan, () => {
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
        features: [ 'AnotherFeature']
      }
    }
  }

  const TP = new TrackingPlan(plan)

  describe(Feature, () => {
    it('creates the features it finds', () => {
      const features = TP.features

      expect(features[0]).toBeInstanceOf(Feature)
      expect(features[0].name).toEqual('Onboarding')

      expect(features[1]).toBeInstanceOf(Feature)
      expect(features[1].name).toEqual('Just Onboarding')
    })
  })

  describe(Screen, () => {
    it('puts screens in .screens', () => {
      const screens = TP.screens
      expect(screens[0]).toBeInstanceOf(Screen)
      expect(screens[0].key).toEqual('Welcome')

      expect(screens[0]).toBeInstanceOf(Screen)
      expect(screens[0].key).toEqual('Welcome')
    })

    it('puts the screens in the features', () => {
      const screen = TP.features[0].screens[0]
      expect(screen).toBeInstanceOf(Screen)
      expect(screen.key).toEqual('Welcome')
    })

    it('puts the tracks in the feature screens', () => {
      const track = TP.features[0].screens[0].tracks[0]
      expect(track.constructor.name).toEqual('Track')
      expect(track.key).toEqual('SomeTrack')
    })
  })

  describe(Track, () => {
    it('puts tracks in .tracks', () => {
      const tracks = TP.tracks
      expect(tracks[0]).toBeInstanceOf(Track)
      expect(tracks[0].key).toEqual('SomeTrack')
      expect(tracks[1]).toBeInstanceOf(Track)
      expect(tracks[1].key).toEqual('AnotherTrack')
    })

    it('links the screens as well', () => {
      expect(TP.screens[0].name).toEqual('Welcome Screen')
      expect(TP.tracks[0].name).toEqual('SomeTrack')

      expect(TP.tracks[0].screens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Welcome Screen"
          })
        ])
      )
    })
  })

  describe(Feature, () => {
    it('has a name when constructed', () => {
      const feature = new Feature("SomeFeature")

      expect(feature.name).toEqual("SomeFeature")
    })

    it('has no screens by default', () => {
      const feature = new Feature("SomeFeature")
      expect(feature.screens).toEqual([])
    })

    it('has no tracks by default', () => {
      const feature = new Feature("SomeFeature")
      expect(feature.tracks).toEqual([])
    })
  })
})

describe("EventTypes", () => {
  for(const t of[Screen, Track]) {
    describe(t, () => {
      describe('key', () => {
        it('throws when it doesnt have a key', () => {
          expect( () => {
            return new t({})
          }).toThrowError("'key' is required")
        })

        it("exposes key from the cosntructor", () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.key).toEqual('SomeScreen')
        })

        describe('escapeKey', () => {
          it("replaces & which can't be part of a name", () => {
            const thing = new t({key: "T&CScreen"})
            expect(thing.escapeKey()).toEqual('TnCScreen')
          })

          it("replaces ' ' which can't be part of a name", () => {
            const thing = new t({key: "T&C Screen"})
            expect(thing.escapeKey()).toEqual('TnCScreen')
          })
        })
      })

      describe('name', () => {
        it('has name=key out of the box', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.name).toEqual('SomeScreen')
        })

        it('can overwrite name', () => {
          const thing = new t({key: "SomeScreen", name: "Some Screen"})
          expect(thing.name).toEqual('Some Screen')
        })
      })

      describe('additionalProperties', () => {
        it('has additionalProperties=false out of the box', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.additionalProperties).toEqual(false)
        })

        it('has additionalProperties=true when configured', () => {
          const thing = new t({key: "SomeScreen", additionalProperties: true})
          expect(thing.additionalProperties).toEqual(true)
        })
      })

      describe('properties', () => {
        it('has properties default to {}', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.properties).toBeInstanceOf(types.ObjectType)
        })

        it('has properties set in the constructor', () => {
          const thing = new t({
            key: "SomeScreen",
            properties: {
              unique: {
                type: "string"
              },
              test: {
                "$ref": "SomeReference"
              }
            }
          })

          expect(thing.properties).toBeInstanceOf(types.ObjectType)
        })
      })

      describe('loginRequired', () => {
        it('defaults to undefined', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.loginRequired).toEqual(undefined)
        })

        it('also can be set in the constructor', () => {
          const thing = new t({key: "SomeScreen", loginRequired: false})
          expect(thing.loginRequired).toEqual(false)
        })
      })

      describe('type', () => {
        it('has type=$type out of the box', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.type).toEqual(t.name.toLowerCase())
        })

        it('doesn\'t let you change the type', () => {
          const thing = new t({key: "SomeScreen", type: "random"})
          expect(thing.type).toEqual(t.name.toLowerCase())
        })
      })
    })
  }
})
