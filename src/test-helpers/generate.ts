// Helpers for tests at the Tracking Plan -> generated code seam
import ts, { factory } from 'typescript'

import TrackingPlan from '../TrackingPlan'
import Transliterator from '../Transliterator'

export const generate = (plan: unknown): { [file: string]: string } => {
  const files = new Transliterator({}).transliterate(new TrackingPlan(plan))
  const sourceFile = ts.createSourceFile("generated.ts", "", ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const printer = ts.createPrinter({ omitTrailingSemicolon: true })

  return Object.fromEntries(
    Array.from(files.entries()).map(([key, nodes]) => [
      key,
      printer.printList(ts.ListFormat.MultiLine, factory.createNodeArray(nodes), sourceFile)
    ])
  )
}

// The text of the type of `source` in a generated helper's argument; `default` for a View's own helper
export const sourceParameterOf = (code: string, helper: string) => {
  const declaration = helper === 'default' ? 'export default ' : `export const ${helper} = `
  const match = code.match(new RegExp(`${declaration}(?:async )?\\(args: \\{[^]*?source\\??: (\\{[^}]*\\})`))
  if (!match) throw new Error(`No helper named ${helper} in:\n${code}`)
  return match[1].replace(/\s+/g, ' ')
}
