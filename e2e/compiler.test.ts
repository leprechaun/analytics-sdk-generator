import ts from "typescript";

import TransliterateCommand from "../src/commands/TransliterateCommand";

function compile(fileNames: string[], extraOptions: ts.CompilerOptions = {}): {
  result?: boolean,
  diagnostics: any[]
} {
  const options = {
    noEmit: true,
    noImplicitAny: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    ...extraOptions
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
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("Property 'companyType' is missing")
      )
    })

    it('borks when `props` is left out while a Property is required', () => {
      const result = compile(['./e2e/failing-build-examples/missing-props-param.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("Property 'props' is missing")
      )
    })

    it('borks when `props` is passed to a helper whose Event has no Properties', () => {
      const result = compile(['./e2e/failing-build-examples/passing-props-when-none-are-required.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'props' does not exist")
      )
    })
  })

  describe('Views', () => {
    beforeAll(() => {
      new TransliterateCommand({
        schema_path: './e2e/view-examples/plan.yml',
        output: './e2e/output/view'
      }).run()
    })

    it('compiles a client calling View helpers', () => {
      const result = compile(['./e2e/view-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a View helper is given a View, which the Implementation completes', () => {
      const result = compile(['./e2e/view-examples/names-view.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'view' does not exist")
      )
    })

    it('borks when a View helper is given a URL, which the Implementation completes', () => {
      const result = compile(['./e2e/view-examples/names-url.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'url' does not exist")
      )
    })

    it('borks when a Track on a View is given a `screen`', () => {
      const result = compile(['./e2e/view-examples/track-with-screen.ts'])
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

    it('compiles calls that leave the View to the Implementation', () => {
      const result = compile(['./e2e/view-choice-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a call names a View', () => {
      const result = compile(['./e2e/view-choice-examples/names-view.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("'view' does not exist")
      )
    })

    it('compiles a call without a View when the plan has no Views', () => {
      const result = compile(['./e2e/no-view-examples/valid.ts'])
      expect(result.diagnostics).toEqual([])
    })
  })

  describe('the Implementation', () => {
    beforeAll(() => {
      new TransliterateCommand({
        schema_path: './e2e/implementation-examples/plan.yml',
        output: './e2e/output/implementation',
        implementation: './e2e/implementation-examples/implementation'
      }).run()
    })

    it('compiles a client whose helpers hand an Implementation typed with `Implementation` its Events, for it to complete', () => {
      const result = compile(['./e2e/implementation-examples/client.ts'])
      expect(result.diagnostics).toEqual([])
    })

    it('compiles the same client in strict mode', () => {
      const result = compile(['./e2e/implementation-examples/client.ts'], { strict: true })
      expect(result.diagnostics).toEqual([])
    })

    it('borks when the Implementation expects a kind of Event the SDK never sends', () => {
      const result = compile(['./e2e/implementation-examples/wrong-type.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining(`'\\"screen\\"' have no overlap`)
      )
    })

    it('borks when the Implementation expects a View attribute value the Tracking Plan never declares', () => {
      const result = compile(['./e2e/implementation-examples/wrong-attribute.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining(`'\\"garden\\"' have no overlap`)
      )
    })

    it('types an Event narrowed on `type` and `name` by the Tracking Plan, in strict mode', () => {
      const result = compile(['./e2e/implementation-examples/narrowing.ts'], { strict: true })
      expect(result.diagnostics).toEqual([])
    })

    it('borks when a narrowed Event is read for a Property it does not have', () => {
      const result = compile(['./e2e/implementation-examples/wrong-property.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("Property 'colour' does not exist")
      )
    })

    it('borks when a narrowed Track is expected on a View it is not on', () => {
      const result = compile(['./e2e/implementation-examples/wrong-view-name.ts'], { strict: true })
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining(`is not assignable to type '\\"Settings\\" | undefined'`)
      )
    })

    it('borks when the Implementation reads a field the Event does not have', () => {
      const result = compile(['./e2e/implementation-examples/missing-field.ts'])
      expect(result.result).toBeFalsy()
      expect(JSON.stringify(result.diagnostics[0].message)).toEqual(
        expect.stringContaining("Property 'screen' does not exist")
      )
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
