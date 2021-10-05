import ts from "typescript";

function compile(fileNames: string[]): {
  result?: boolean,
  diagnostics: any[]
} {
  const options = {
    noEmit: true,
    noImplicitAny: true,
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
  })
})
