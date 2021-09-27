import TypeMapper from './TypeMapper'
import * as types from './Types'
import { Screen, Track } from './EventTypes'

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

        it('doesn\'t let you change the type', () => {
          const thing = new t({key: "SomeScreen", type: "random"})
          expect(thing.type).toEqual(t.name.toLowerCase())
        })
      })
    })
  }
})

