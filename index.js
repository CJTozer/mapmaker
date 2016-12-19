#!/usr/bin/env node
var program = require('commander');
var chalk = require('chalk');

program
  .arguments('<spec_file>')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(function(spec_file) {
    console.log('spec_file: %s, test: %s', spec_file, program.test);
    console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
  })
  .parse(process.argv);
