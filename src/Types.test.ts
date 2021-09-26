import path from 'path'
import fs from 'fs'
import ts, { factory } from 'typescript'

import BaseType, * as types from './Types'

describe(BaseType, () => {
  describe(types.ComplexType, () => {
    describe(types.ArrayType, () => {
      it('understands arrays', () => {
        const t = BaseType.toSpecificType({
          type: "array",
          items: {
            "$ref": "SomeReference"
          }
        } as types.ArrayDefinition) as types.ArrayType

        expect(t).toBeInstanceOf(types.ArrayType)
        expect(t.type).toBeInstanceOf(types.TypeReference)
        expect((t.type as types.TypeReference).reference).toEqual("SomeReference")
      })
    })

    describe(types.ObjectType, () => {
      const t = BaseType.toSpecificType({
        type: "object",
        properties: {
          "thing": {
            type: "string"
          },
          "ref": {
            "$ref": "SomeType"
          },
          "oneOf": {
            oneOf: [
              {
                type: "string"
              }
            ]
          }
        },
        required: ['thing']
      } as types.ObjectDefinition) as types.ObjectType

      it('understands objects', () => {
        expect(t).toBeInstanceOf(types.ObjectType)
      })

      describe(types.ObjectProperty, () => {
        it('casts properties as Object', () => {
          expect(t.properties[0]).toBeInstanceOf(types.ObjectProperty)
          expect(t.properties[1]).toBeInstanceOf(types.ObjectProperty)
          expect(t.properties[2]).toBeInstanceOf(types.ObjectProperty)
        })

        it('casts the correct types', () => {
          expect(t.properties[0].type).toBeInstanceOf(types.StringType)
          expect(t.properties[1].type).toBeInstanceOf(types.TypeReference)
          expect(t.properties[2].type).toBeInstanceOf(types.Constant)
        })

        it('flags required properties as such', () => {
          expect(t.properties[0].required).toBeTruthy()
          expect(t.properties[1].required).toBeFalsy()
          expect(t.properties[2].required).toBeFalsy()
        })
      })
    })

    describe('Oneof', () => {
      it('understands unions of varying types', () => {
        const typed = BaseType.toSpecificType({
          'oneOf': [
            {
              'type': "string"
            },
            {
              '$ref': "SomeReference"
            }
          ]
        })

        expect(typed).toBeInstanceOf(types.UnionType)

        expect((typed as types.UnionType).options).toEqual([
          new types.StringType({type: "string"}),
          new types.TypeReference({"$ref": "SomeReference"})
        ])
      })
    })
  })

  describe('with .type attribute', () => {
    describe(types.UnionType, () => {
      describe('String enums', () => {
        it('returns a UnionType with strings', () => {
          expect(BaseType.toSpecificType({
            'type': 'string',
            'enum': ["one", "two"]

          })).toBeInstanceOf(types.UnionType)

          expect((BaseType.toSpecificType({
            'type': 'string',
            'enum': ["one", "two"]

          }) as types.UnionType).options).toEqual([new types.Constant("one"), new types.Constant("two")])
        })

        it('returns a constant when its one option of a simple type', () => {
          const t = BaseType.toSpecificType({
            'type': 'string',
            'enum': ["one"]
          }) as types.Constant
          expect(t).toBeInstanceOf(types.Constant)
          expect(t.type).toEqual('string')
          expect(t.value).toEqual("one")
        })
      })
    })

    describe(types.StringType, () => {
      it('recognises strings', () => {
        expect(BaseType.toSpecificType({
          'type': 'string'
        })).toBeInstanceOf(types.StringType)
      })

      it('sets format on strings', () => {
        expect((BaseType.toSpecificType({
          'type': 'string',
          'format': 'date'
        } as types.AnyStringDefinition) as types.StringType).format).toEqual('date')
      })


      it('doesnt return a String when it should be union', () => {
        expect(BaseType.toSpecificType({
          'type': 'string',
          'enum': ['v1', 'v2']
        })).not.toBeInstanceOf(types.StringType)
      })
    })

    describe(types.NumberType, () => {
      it('recognises numbers', () => {
        expect(BaseType.toSpecificType({
          'type': 'number'
        })).toBeInstanceOf(types.NumberType)
      })

      it('doesnt return a Number when it should be union', () => {
        expect(BaseType.toSpecificType({
          'type': 'number',
          'enum': [1, 2, 3]
        })).not.toBeInstanceOf(types.NumberType)
      })
    })

    describe(types.BooleanType, () => {
      it('recognises booleans', () => {
        expect(BaseType.toSpecificType({
          'type': 'boolean'
        })).toBeInstanceOf(types.BooleanType)
      })
    })

    describe(types.TypeReference, () => {
      it('recognises $refs', () => {
        expect(BaseType.toSpecificType({
          '$ref': "SomeType"
        })).toBeInstanceOf(types.TypeReference)
      })

    })
  })
})
