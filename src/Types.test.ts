import ts from 'typescript'
import TypeMapper from './TypeMapper'
import * as types from './Types'
import * as InputTypes from './InputTypes'

describe(TypeMapper, () => {
  describe("Unknown types", () => {
    it('throws an error when I give it obvious garbage', () => {
      expect( () => {
        TypeMapper.toSpecificType({'asd': 'garbage'} as any as InputTypes.TypeDefinition)
      }).toThrowError("Unknown type definition")
    })
  })

  describe(types.Constant, () => {
    it('recognises the `const` keyword', () => {
      const t = TypeMapper.toSpecificType({
        'const': "asdas"
      })

      expect(t).toBeInstanceOf(types.Constant)
    })

    describe('casting to a type based on typeof', () => {
      it('guesses strings', () => {
        const t = TypeMapper.toSpecificType({
          'const': "asdasd"
        })

        expect(t.type).toBeInstanceOf(types.StringType)
      })

      it('guesses numbers', () => {
        const t = TypeMapper.toSpecificType({
          'const': 123
        })

        expect(t.type).toBeInstanceOf(types.NumberType)
      })
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

      describe.skip("ObjectType to partial literal", () => {
        const definition = {
          type: "object",
          required: [],
          properties: {
            has_one_option: {
              type: "string",
              enum: [
                "just one option"
              ]
            },
            has_two_options: {
              type: "string",
              enum: [
                "one", "two"
              ]
            }
          }
        } as InputTypes.TypeDefinition

        it('casts stuff', () => {
          const o = TypeMapper.toSpecificType(definition)
        })
      })

      describe('.toAST', () => {
        it('returns an object definition', () => {
          const a = t.toAST()
          expect(t.toAST().kind).toEqual(ts.SyntaxKind.TypeLiteral)
        })

        it('returns has 3 properties', () => {
          const a = t.toAST()
          expect((t.toAST() as any).members.length).toBe(3)
        })
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

        describe('toAST', () => {
          let t: types.StringType
          let op: types.ObjectProperty
          let typeAST: any
          let ast: any

          beforeEach( () => {
            t = new types.StringType({})
            typeAST = t.toAST()
            jest.spyOn(t, 'toAST').mockReturnValueOnce(typeAST)

            op = new types.ObjectProperty("some-name", t, true)
            ast = op.toAST()
          })

          it('returns a property assignment', () => {
            expect(ast.kind).toEqual(ts.SyntaxKind.PropertySignature)
          })

          it('marks the property as required', () => {
            expect(ast.modifiers).toBeUndefined()
          })

          it('calls whatever type\'s .toAST()', () => {
            expect(t.toAST).toHaveBeenCalled()
          })

          it('sets the type as whatever toAST returned', () => {
            expect(ast.type).toBe(typeAST)
          })
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
        }).toThrowError("Unions must have atleast one option")
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

          const options = (TypeMapper.toSpecificType({
            'type': 'string',
            'enum': ["one", "two"]

          }) as types.UnionType).options

          expect(options[0]).toBeInstanceOf(types.Constant)
          expect(options[0].value).toEqual("one")

          expect(options[1]).toBeInstanceOf(types.Constant)
          expect(options[1].value).toEqual("two")
        })

        it('returns a constant when its one option of a simple type', () => {
          const t = TypeMapper.toSpecificType({
            'type': 'string',
            'enum': ["one"]
          }) as types.Constant
          expect(t).toBeInstanceOf(types.Constant)
          expect(t.type).toBeInstanceOf(types.StringType)
          expect(t.value).toEqual("one")
        })

        it('throws an error when there are no options', () => {
          expect( () => {
            TypeMapper.toSpecificType({
              type: 'string',
              enum: []
            })
          }).toThrowError("Enums must have atleast one option")
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

      it('casts integer as number', () => {
        expect(TypeMapper.toSpecificType({
          'type': 'integer'
        })).toBeInstanceOf(types.NumberType)
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
