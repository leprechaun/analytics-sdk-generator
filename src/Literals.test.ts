import ts, { factory } from 'typescript'

import * as InputTypes from './InputTypes'
import TypeMapper from './TypeMapper'
import { NamedType, Constant, StringType } from './Types'


const print = (nodelist: any[]) => {
  const nodes = factory.createNodeArray(nodelist)
  const sourceFile = ts.createSourceFile(
    "example.ts",
    "",
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  )

  const printer = ts.createPrinter({
    omitTrailingSemicolon: true
  })

  const outputFile = printer.printList(
    ts.ListFormat.MultiLine,
    nodes,
    sourceFile
  )

  console.log(outputFile)
}


describe('blah', () => {
  it('does something', () => {
    const c = TypeMapper.toSpecificType({
      type: 'string',
      enum: ['onechoice']
    })

    const nt = new NamedType("somename", c, "comments lol")

    //print(nt.toPartialLiteralAST())
  })

  it('does something', () => {
    const c = TypeMapper.toSpecificType({
      type: 'array',
      items: {
        type: 'string'
      },
      enum: ['onechoice']
    } as InputTypes.TypeDefinition)

    const nt = new NamedType("somename", c, "comments lol")

    //print(nt.toPartialLiteralAST())
  })


  it('does something', () => {
    const c = TypeMapper.toSpecificType({
      type: 'object',
      properties: {
        first: {
          type: 'string',
          enum: ['onechoice']
        },
        second: {
          type: 'object',
          properties: {
            sub: {
              type: 'string',
              enum: ['another one option']
            },
            subsub: {
              type: 'object',
              properties: {
                subsubsub: {
                  type: 'string',
                  enum: ['another one option']
                }
              }
            }
          }
        },
        third: {
          type: 'number',
          enum: [123]
        },
        fourth: {
          type: 'boolean',
          enum: [false]
        },

      }
    } as InputTypes.TypeDefinition)

    //console.log(c)

    const nt = new NamedType("somename", c, "comments lol")

    const r = nt.toPartialLiteralAST()

    //print(r)
  })

})
