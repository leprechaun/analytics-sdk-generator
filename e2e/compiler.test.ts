import ts from "typescript";

import TransliterateCommand from "../src/commands/TransliterateCommand";

function compile(fileNames: string[]): {
  result?: boolean,
  diagnostics: any[]
} {
  const options = {
    noEmit: true,
    noImplicitAny: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  } as ts.CompilerOptions


  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  return {
    result: allDiagnostics.length == 0,
    diagnostics: allDiagnostics.map( diagnostic => {
      return {
        position: ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!),
        message: diagnostic.messageText
      }
    })
  }
}

describe("Compilation tests", () => {
  describe('success', () => {
    it('can compile the example client', () => {
      const result = compile(['src/example/example-client.ts'])
      expect(result.result).toBeTruthy()
    })
  })

  describe('types', () => {
    it('borks when assigning an invalid option to an enum', () => {
      const result = compile(['./e2e/failing-build-examples/invalid-enum.ts'])
      expect(result.result).toBeFalsy()
      expect(result.diagnostics[0].message).toEqual(
        expect.stringContaining("is not assignable to type 'Sector'")
      )
    })

    it('borks when an object property is missing', () => {
      const result = compile(['./e2e/failing-build-examples/missing-property.ts'])
      expect(result.result).toBeFalsy()
      expect(result.diagnostics[0].message.messageText).toEqual(
        expect.stringContaining("is not assignable")
      )
      expect(result.diagnostics[0].message.next[0].messageText).toEqual(
        expect.stringContaining("Property 'companyType' is missing")
      )
    })

    it('borks when props arent passed', () => {
      const result = compile(['./e2e/failing-build-examples/missing-props-param.ts'])
      expect(result.result).toBeFalsy()
      expect(result.diagnostics[0].message).toEqual(
        expect.stringContaining("Expected 1-2 arguments, but got 0.")
      )
    })

    it('borks when props are passed when it should be null', () => {
      const result = compile(['./e2e/failing-build-examples/passing-props-when-none-are-required.ts'])
      expect(result.result).toBeFalsy()
      expect(result.diagnostics[0].message).toEqual(
        expect.stringContaining("not assignable to parameter of type 'null'")
      )
    })
  })

  describe('Pages', () => {
    beforeAll(() => {
      new TransliterateCommand({
        schema_path: './e2e/page-examples/plan.yml',
        output: './e2e/output/page'
      }).run()
    })

    it('compiles a web client calling Page helpers', () => {
      const result = compile(['./e2e/page-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a Page helper is given another Page', () => {
      const result = compile(['./e2e/page-examples/wrong-page.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining(`'\\"FarmMap\\"' is not assignable to type '\\"Login\\"'`)
      )
    })

    it('borks when a Track on a Page is given a `screen`', () => {
      const result = compile(['./e2e/page-examples/track-with-screen.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'screen' does not exist")
      )
    })
  })

  describe('Tracks not tied to one View', () => {
    beforeAll(() => {
      new TransliterateCommand({
        schema_path: './e2e/view-choice-examples/plan.yml',
        output: './e2e/output/view-choice'
      }).run()
      new TransliterateCommand({
        schema_path: './e2e/no-view-examples/plan.yml',
        output: './e2e/output/no-view'
      }).run()
    })

    it('compiles a call naming either a Screen or a Page', () => {
      const result = compile(['./e2e/view-choice-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a call names both a Screen and a Page', () => {
      const result = compile(['./e2e/view-choice-examples/both-views.ts'])
      expect(result.result).toBeFalsy()
    })

    it('borks when a call on a View of both kinds names neither', () => {
      const result = compile(['./e2e/view-choice-examples/no-view.ts'])
      expect(result.result).toBeFalsy()
    })

    it('compiles a call without a View when the plan has no Views', () => {
      const result = compile(['./e2e/no-view-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })
  })

  describe('configured Source attributes', () => {
    beforeAll(() => {
      new TransliterateCommand({
        schema_path: './e2e/source-examples/plan.yml',
        output: './e2e/output/source'
      }).run()
    })

    it('compiles a call using the declared Source attributes', () => {
      const result = compile(['./e2e/source-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('compiles a call overriding a constant Source attribute', () => {
      const result = compile(['./e2e/source-examples/overriding-constant.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a Source attribute is outside its enum', () => {
      const result = compile(['./e2e/source-examples/invalid-enum.ts'])
      expect(result.result).toBeFalsy()
      const message = JSON.stringify(result.diagnostics[0].message)
      expect(message).toEqual(expect.stringContaining(`'\\"sidebar\\"' is not assignable`))
      // TypeScript orders union members itself, so check each one separately
      expect(message).toEqual(expect.stringContaining(`\\"header\\"`))
      expect(message).toEqual(expect.stringContaining(`\\"footer\\"`))
    })

    it('borks when a Source attribute is not declared', () => {
      const result = compile(['./e2e/source-examples/undeclared-attribute.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'widget' does not exist")
      )
    })

    it('borks when a required Source attribute is missing', () => {
      const result = compile(['./e2e/source-examples/missing-required.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("Property 'campaign' is missing")
      )
    })
  })
})
