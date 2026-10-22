import TypeMapper from './TypeMapper'
import * as types from './Types'
import TrackingPlan from './TrackingPlan'
import { Track, View } from './EventTypes'

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

  describe(View, () => {
    it('reads each `views:` entry as a View', () => {
      expect(TP.views.map(view => [view.key, view.name])).toEqual([
        ['Welcome', 'Welcome Screen'],
        ['AnotherScreen', 'Another Screen']
      ])
      expect(TP.views[0]).toBeInstanceOf(View)
    })
  })

  describe(Track, () => {
    it('sees 3 tracks', () => {
      const tracks = TP.tracks

      expect(tracks.length).toEqual(3)
    })

    it('puts tracks in .tracks', () => {
      const tracks = TP.tracks
      expect(tracks[0]).toBeInstanceOf(Track)
      expect(tracks[0].key).toEqual('SomeTrack')
      expect(tracks[1]).toBeInstanceOf(Track)
      expect(tracks[1].key).toEqual('AnotherTrack')
    })

    it('links the views as well', () => {
      expect(TP.views[0].name).toEqual('Welcome Screen')
      expect(TP.tracks[0].name).toEqual('SomeTrack')

      expect(TP.tracks[0].views).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Welcome Screen"
          })
        ])
      )
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

describe('Features, which are no longer supported', () => {
  it.each([
    ['a View', { views: { Login: { features: ['Onboarding'] } } }, 'View Login'],
    ['a Track', { tracks: { LoginFailed: { features: ['Onboarding'] } } }, 'Track LoginFailed']
  ])('make the Tracking Plan fail to load when declared on %s, naming it', (_, plan, entry) => {
    expect(() => new TrackingPlan(plan)).toThrow(`\`features\` is no longer supported: declared on ${entry}`)
  })
})
