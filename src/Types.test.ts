import TypeMapper from './TypeMapper'
import * as types from './Types'
import * as InputTypes from './InputTypes'

describe(TypeMapper, () => {
  describe("Unknown types", () => {
    it('throws an error when I give it obvious garbage', () => {
      expect( () => {
        TypeMapper.toSpecificType({'asd': 'garbage'} as any as InputTypes.TypeDefinition)
      }).toThrowError()
    })
  })

  describe(types.ComplexType, () => {
    describe(types.ArrayType, () => {
      it('understands arrays', () => {
        const t = TypeMapper.toSpecificType({
          type: "array",
          items: {
            "$ref": "SomeReference"
          }
        } as InputTypes.ArrayDefinition) as types.ArrayType

        expect(t).toBeInstanceOf(types.ArrayType)
        expect(t.type).toBeInstanceOf(types.TypeReference)
        expect((t.type as types.TypeReference).reference).toEqual("SomeReference")
      })
    })

    describe(types.ObjectType, () => {
      const t = TypeMapper.toSpecificType({
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
              },
              {
                type: "number"
              }
            ]
          }
        },
        required: ['thing']
      } as InputTypes.ObjectDefinition) as types.ObjectType

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
          expect(t.properties[2].type).toBeInstanceOf(types.UnionType)
        })

        it('flags required properties as such', () => {
          expect(t.properties[0].required).toBeTruthy()
          expect(t.properties[1].required).toBeFalsy()
          expect(t.properties[2].required).toBeFalsy()
        })
      })
    })

    describe('oneOf', () => {
      it('understands unions of varying types', () => {
        const typed = TypeMapper.toSpecificType({
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

      it('reverts to a simpler type when theres only one option', () => {
        const typed = TypeMapper.toSpecificType({
          'oneOf': [
            {
              'type': "string"
            }
          ]
        })

        expect(typed).toBeInstanceOf(types.StringType)
      })

      it('throws an error when it is a union of 0 types', () => {
        expect( () => {
          TypeMapper.toSpecificType({
            oneOf: []
          })
        }).toThrowError()
      })
    })
  })

  describe('with .type attribute', () => {
    describe(types.UnionType, () => {
      describe('String enums', () => {
        it('returns a UnionType with strings', () => {
          expect(TypeMapper.toSpecificType({
            'type': 'string',
            'enum': ["one", "two"]

          })).toBeInstanceOf(types.UnionType)

          expect((TypeMapper.toSpecificType({
            'type': 'string',
            'enum': ["one", "two"]

          }) as types.UnionType).options).toEqual([new types.Constant("one"), new types.Constant("two")])
        })

        it('returns a constant when its one option of a simple type', () => {
          const t = TypeMapper.toSpecificType({
            'type': 'string',
            'enum': ["one"]
          }) as types.Constant
          expect(t).toBeInstanceOf(types.Constant)
          expect(t.type).toEqual('string')
          expect(t.value).toEqual("one")
        })

        it('throws an error when there are no options', () => {
          expect( () => {
            TypeMapper.toSpecificType({
              type: 'string',
              enum: []
            })
          }).toThrowError()
        })
      })
    })

    describe(types.StringType, () => {
      it('recognises strings', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'string'
        })).toBeInstanceOf(types.StringType)
      })

      describe(types.FormattedStringType, () => {
        it('sets format on strings ti doesnt recognise', () => {
          const typed = TypeMapper.toSpecificType({
            'type': 'string',
            'format': 'date'
          } as InputTypes.AnyStringDefinition)

          expect(
            (typed  as types.StringType).format
          ).toEqual('date')
        })

        it('supports date-time out of the box', () => {
          const typed = TypeMapper.toSpecificType({
            type: 'string',
            format: 'date-time'
          } as InputTypes.TypeDefinition)

          expect(typed).toBeInstanceOf(types.DateFormattedStringType)
        })

        it('supports adding custom formatted types', () => {
          class CustomType extends types.FormattedStringType {
            toAST(options: {}) {
              return []
            }
          }

          TypeMapper.addStringFormat('custom', CustomType)

          const typed = TypeMapper.toSpecificType({
            type: 'string',
            format: 'custom'
          } as InputTypes.TypeDefinition)

          expect(typed).toBeInstanceOf(CustomType)
        })
      })

      it('doesnt return a String when it should be union', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'string',
          'enum': ['v1', 'v2']
        })).not.toBeInstanceOf(types.StringType)
      })
    })

    describe(types.NumberType, () => {
      it('recognises numbers', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'number'
        })).toBeInstanceOf(types.NumberType)
      })

      it('doesnt return a Number when it should be union', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'number',
          'enum': [1, 2, 3]
        })).not.toBeInstanceOf(types.NumberType)
      })
    })

    describe(types.BooleanType, () => {
      it('recognises booleans', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'boolean'
        })).toBeInstanceOf(types.BooleanType)
      })
    })

    describe(types.TypeReference, () => {
      it('recognises $refs', () => {
        expect(TypeMapper.toSpecificType({
          '$ref': "SomeType"
        })).toBeInstanceOf(types.TypeReference)
      })

    })
  })
})
