import yargs from 'yargs'

import TransliterateCommand from '../command'

const module = {
  usage: 'transliterate -i ./human-readable.yml -o ./output',
  command: 'transliterate [-i <input>] [-o <output>] [--implementation <implementation>]',
  describe: 'transliterate an analytics descriptor file',
  builder: function () {
    return yargs
      .describe('input', 'Schema file')
      .describe('implementation', "function file that gets called")
      .help('-h')
  },

  handler: function (args: {[key: string]: any}) {
    const TC = new TransliterateCommand({
      schema_path: args.input,
      output: args.output,
      implementation: args.implementation
    })

    TC.run()
  }
}


export default module;
