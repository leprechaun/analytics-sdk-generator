import TypeMapper from './TypeMapper'
import * as types from './Types'
import { Feature, Screen, Track } from './EventTypes'

describe("EventTypes", () => {
  it('sets type=screen on Screen', () => {
    const thing = new Screen({key: "SomeScreen"})
    expect(thing.type).toEqual('screen')
  })

  it('sets type=track on Track', () => {
    const thing = new Track({key: "SomeScreen"})
    expect(thing.type).toEqual('track')
  })

  describe('sourceToObjectType', () => {
    const track = new Track({
      key: 'SomeEvent',
      name: 'Some Event',
    })

    const source = track.sourceToObjectType()

    it('returns an ObjectType', () => {
      expect(source).toBeInstanceOf(types.ObjectType)
    })

    describe('without screens or features', () => {
      const screen = source.properties.filter( p => p.name == 'screen' )[0]
      const feature = source.properties.filter( p => p.name == 'feature' )[0]
      const widget = source.properties.filter( p => p.name == 'widget' )[0]
      const element = source.properties.filter( p => p.name == 'element' )[0]
      const action = source.properties.filter( p => p.name == 'action' )[0]

      it('restrict `feature` to `FeatureNames`', () => {
        expect(feature.type).toBeInstanceOf(types.TypeReference)
        expect(
          (feature.type as types.TypeReference).reference)
            .toEqual('#/$defs/FeatureNames')
      })

      it('restrict `screen` to `ScreenNames`', () => {
        expect(screen.type).toBeInstanceOf(types.TypeReference)
        expect(
          (screen.type as types.TypeReference).reference
        ).toEqual('#/$defs/ScreenNames')
      })

      it('lets widget be any string', () => {
        expect(widget.type).toBeInstanceOf(types.StringType)
      })

      it('lets element be any string', () => {
        expect(element.type).toBeInstanceOf(types.StringType)
      })

      it('lets action be any string', () => {
        expect(action.type).toBeInstanceOf(types.StringType)
      })
    })

    describe('screen', () => {
      describe('with one screen', () => {
        it('restricts `screen` to a constant', () => {
          const track = new Track({
            key: 'SomeEvent',
            name: 'Some Event',
          })

          track.screens.push(new Screen({
            key: "TheScreen",
            name: 'The Screen'
          }))

          const screen = track.sourceToObjectType().properties.filter( p => p.name == 'screen' )[0]

          expect(screen.type).toBeInstanceOf(types.Constant)
        })
      })

      describe('with two or more screens', () => {
        it('restricts `screen` to a union of the two', () => {
          const track = new Track({
            key: 'SomeEvent',
            name: 'Some Event',
          })

          track.screens.push(new Screen({
            key: "TheScreen",
            name: 'The Screen'
          }))

          track.screens.push(new Screen({
            key: "AnotherScreen",
            name: 'Another Screen'
          }))

          const screen = track.sourceToObjectType().properties.filter( p => p.name == 'screen' )[0]

          expect(screen.type).toBeInstanceOf(types.UnionType)
          expect((screen.type as types.UnionType).options.length).toEqual(2)
          expect((screen.type as types.UnionType).options[0]).toBeInstanceOf(types.Constant)
          expect((screen.type as types.UnionType).options[0].value).toEqual("The Screen")
          expect((screen.type as types.UnionType).options[1]).toBeInstanceOf(types.Constant)
          expect((screen.type as types.UnionType).options[1].value).toEqual("Another Screen")
        })
      })
    })

    describe('feature', () => {
      describe('with one feature', () => {
        it('restricts `feature` to a constant', () => {
          const track = new Track({
            key: 'SomeEvent',
            name: 'Some Event',
          })

          track.features.push(new Feature("Some Feature"))

          const feature = track.sourceToObjectType().properties.filter( p => p.name == 'feature' )[0]

          expect(feature.type).toBeInstanceOf(types.Constant)
        })
      })

      describe('with two or more features', () => {
        it('restricts `feature` to a union of the two', () => {
          const track = new Track({
            key: 'SomeEvent',
            name: 'Some Event',
          })

          track.features.push(new Feature("Some Feature"))
          track.features.push(new Feature("Another Feature"))

          const feature = track.sourceToObjectType().properties.filter( p => p.name == 'feature' )[0]

          expect(feature.type).toBeInstanceOf(types.UnionType)
          expect((feature.type as types.UnionType).options.length).toEqual(2)
          expect((feature.type as types.UnionType).options[0]).toBeInstanceOf(types.Constant)
          expect((feature.type as types.UnionType).options[0].value).toEqual("Some Feature")
          expect((feature.type as types.UnionType).options[1]).toBeInstanceOf(types.Constant)
          expect((feature.type as types.UnionType).options[1].value).toEqual("Another Feature")
        })
      })
    })
  })

  for(const t of[Screen, Track]) {
    describe(t, () => {
      describe('key', () => {
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
        const spy = jest.spyOn(TypeMapper, 'toSpecificType')

        beforeEach( () => {
          spy.mockClear()
        })

        it('has properties', () => {
          const e = new t({
            key: 'test',
          })
          expect(e.properties).toBeInstanceOf(types.ObjectType)
        })

        it('calls TypeMapper.toSpecificType with defaults', () => {
          const e = new t({
            key: 'test',
          })
          expect(spy).toHaveBeenCalledWith({
            type: 'object',
            required: [],
            properties: {},
            additionalProperties: false
          })
        })

        it('sets whatever TypeMapper.toSpecificType returns to .properties', () => {
          spy.mockReturnValueOnce({
            blahblah: 'foobar'
          })

          const e = new t({
            key: 'test',
          })

          expect(e.properties).toEqual({
            blahblah: 'foobar'
          })
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
      })

      describe('description', () => {
        it('puts description in when defined', () => {
          const thing = new t({key: "SomeScreen", description: "foobar"})
          expect(thing.description).toEqual("foobar")
        })

        it('has no description otherwise', () => {
          const thing = new t({key: "SomeScreen"})
          expect(thing.description).toBeUndefined()
        })
      })
    })
  }
})

