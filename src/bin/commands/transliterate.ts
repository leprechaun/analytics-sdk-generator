import yargs from 'yargs'

import TransliterateCommand from '../../commands/TransliterateCommand'

const module = {
  usage: 'transliterate -i ./human-readable.yml -o ./output',
  command: 'transliterate [-i <input>] [-o <output>] [--implementation <implementation>]',
  describe: 'transliterate an analytics descriptor file',
  builder: function () {
    return yargs
      .describe('input', 'Schema file')
      .describe('implementation', "function file that gets called")
      .describe('methodsAsync', "Whether the methods should be asynchronous or not (true by default)")
      .help('-h')
  },

  handler: function (args: {[key: string]: any}) {
    const TC = new TransliterateCommand({
      schema_path: args.input,
      output: args.output,
      implementation: args.implementation,
      methodsAsync: !(args.methodsAsync == 'false')
    })

    TC.run()
  }
}


export default module;
