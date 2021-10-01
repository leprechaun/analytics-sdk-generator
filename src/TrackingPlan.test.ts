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

      expect(features.length).toEqual(4)

      expect(features.map( f => f.name)).toEqual(
        expect.arrayContaining(['Onboarding', 'Just Onboarding', 'AnotherFeature', 'Special Feature'])
      )
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
      const screen = TP.features.filter( f => f.name == 'Onboarding')[0].screens[0]
      expect(screen).toBeInstanceOf(Screen)
      expect(screen.key).toEqual('Welcome')
    })

    it('puts the tracks in the feature screens', () => {
      const screen = TP.features.filter( f => f.name == 'Onboarding')[0].screens.filter( s => s.key == 'Welcome')[0]
      expect(screen.tracks.length).toEqual(2)
    })
  })

  describe(Track, () => {
    it('sees 3 tracks', () => {
      const tracks = TP.tracks

      expect(tracks.length).toEqual(3)
    })

    it('puts features in tracks', () => {
      const tracks = TP.tracks
      expect(tracks[2].features).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Special Feature'
          })
        ])
      )

      expect(tracks[2].features.length).toEqual(1)
    })

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

      expect(TP.traits.length).toEqual(1)
    })
  })
})
