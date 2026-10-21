import fs from 'fs'
import yaml from 'yaml'
import ts, { factory } from 'typescript'

import TrackingPlan from './TrackingPlan'
import Transliterator from './Transliterator'

const print = (nodes: ts.Node[]) => {
  const sourceFile = ts.createSourceFile("golden.ts", "", ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  return ts.createPrinter({ omitTrailingSemicolon: true }).printList(
    ts.ListFormat.MultiLine,
    factory.createNodeArray(nodes),
    sourceFile
  )
}

const transliterate = (planPath: string, options: { implementation?: string, methodsAsync?: boolean }) => {
  const plan = new TrackingPlan(yaml.parse(fs.readFileSync(planPath).toString('utf-8')))
  const files = new Transliterator(options).transliterate(plan)
  return Object.fromEntries(
    Array.from(files.entries()).map(([key, nodes]) => [key, print(nodes)])
  )
}

describe('generated output for the example Tracking Plan', () => {
  it('is unchanged without an implementation', () => {
    expect(transliterate('src/example/example-schema.yml', {})).toMatchSnapshot()
  })

  it('is unchanged with an async implementation', () => {
    expect(transliterate('src/example/example-schema.yml', {
      implementation: './implementation',
      methodsAsync: true
    })).toMatchSnapshot()
  })
})
