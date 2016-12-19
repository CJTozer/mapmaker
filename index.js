#!/usr/bin/env node
var program = require('commander');

program
  .arguments('<spec_file>')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(function(spec_file) {
    console.log('spec_file: %s, test: %s', spec_file, program.test);
  })
  .parse(process.argv);
