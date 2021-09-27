import TypeMapper from './TypeMapper'
import * as types from './Types'
import TrackingPlan from './TrackingPlan'
import { Feature, Screen, Track } from './EventTypes'

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
        features: [ 'AnotherFeature', 'Onboarding' ]
      }
    },
    traits: {
      userId: {
        $ref: "userId"
      }
    },
    $defs: {
      userId: {
        type: 'string',
        format: 'email'
      }
    }
  }

  const spy = jest.spyOn(TypeMapper, 'toSpecificType')

  afterEach( () => {
    spy.mockClear()
  })


  const TP = new TrackingPlan(plan)

  describe(Feature, () => {
    it('creates the features it finds', () => {
      const features = TP.features

      expect(features.length).toEqual(3)

      expect(features[0]).toBeInstanceOf(Feature)
      expect(features[0].name).toEqual('Onboarding')

      expect(features[1]).toBeInstanceOf(Feature)
      expect(features[1].name).toEqual('Just Onboarding')

      expect(features[2]).toBeInstanceOf(Feature)
      expect(features[2].name).toEqual('AnotherFeature')
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

  describe('traits', () => {
    it('has traits', () => {
      expect(TP.traits[0]).toBeInstanceOf(types.NamedType)
      expect(TP.traits[0].type).toBeInstanceOf(types.TypeReference)
      expect(TP.traits[0].name).toEqual('userId')
    })

    it("calls TypeMapper.toSpecificType with the definition", () => {
      const TP = new TrackingPlan(plan)
      expect(spy).toHaveBeenCalledWith({
        $ref: "userId"
      })
    })
  })

  describe('defs', () => {
    it('has traits', () => {
      expect(TP.traits[0]).toBeInstanceOf(types.NamedType)
      expect(TP.traits[0].type).toBeInstanceOf(types.TypeReference)
      expect(TP.traits[0].name).toEqual('userId')
    })
  })


})
