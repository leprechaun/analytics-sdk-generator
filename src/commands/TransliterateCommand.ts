import yaml from 'yaml'
import ts, { factory } from "typescript"
import fs from 'fs'
import path from 'path'

import TrackingPlan from '../TrackingPlan'
import Transliterator from '../Transliterator'

export default class TransliterateCommand {
  args: {
    schema_path: string,
    output: string,
    implementation?: string,
    methodsAsync: boolean
  }

  constructor(args: {
    schema_path: string,
    output: string,
    implementation?: string,
    methodsAsync?: boolean
  }) {
    this.args = {
      ...args,
      methodsAsync: !!args.methodsAsync
    }

  }

  run() {

    const options = {
      methodsAsync: this.args.methodsAsync
    }

    if(this.args.implementation) {
      const implementationSplit = this.args.implementation.split(path.sep)

      if(implementationSplit[0] == '.') {
        implementationSplit.shift()
      }

      options['implementation'] = "../".repeat(this.args.output.split(path.sep).length - 1) + implementationSplit.join(path.sep)
    }


    const plan = this.readTrackingPlan()
    const transliterator = new Transliterator(options)

    const result = transliterator.transliterate(plan)

    this.write(result)
  }

  readTrackingPlan() {
    const contents = yaml.parse(
      fs.readFileSync(this.args.schema_path).toString('utf-8')
    )
    return new TrackingPlan(contents)
  }

  groupByPath(pathnodes: {path: string[], nodes: ts.Node[]}[]) {
    return pathnodes.map( pn => {
      pn.path.unshift(this.args.output)
      return {
        path: path.join(...pn.path) + '.ts',
        nodes: pn.nodes
      }
    }).reduce( (accumulated, current) => {
      const nodes = accumulated[current.path] || []

      const newNodes = nodes.concat(current.nodes)
      accumulated[current.path] = newNodes

      return accumulated
    }, {})
  }

  write(pathnodes: {path: string[], nodes: ts.Node[]}[]) {
    const paths = this.groupByPath(pathnodes)

    for(const filepath in paths) {
      const nodes = factory.createNodeArray(paths[filepath]);
      const sourceFile = ts.createSourceFile(
        filepath,
        "",
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TS
      );

      const printer = ts.createPrinter({
        omitTrailingSemicolon: true
      });

      const outputFile = printer.printList(
        ts.ListFormat.MultiLine,
        nodes,
        sourceFile
      );

      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, outputFile);
    }
  }
}
