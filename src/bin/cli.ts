#!/usr/bin/env node

import yargs from 'yargs';

import transliterate from '../commands/transliterate'

yargs(process.argv.slice(2))
  .scriptName('analytics-descriptor')
  .usage('$0 <cmd> [args]')
  .pkgConf('analytics-descriptor')
  .command(transliterate)
  .demandCommand()
  .help()
  .argv;
