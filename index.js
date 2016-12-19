#!/usr/bin/env node
var program = require('commander');
var chalk = require('chalk');
var Config = require('merge-config');

function build_map(spec_file) {
  var config = new Config();
  config.file('defaults.yaml');
  config.file(spec_file);

  console.log(chalk.bold.cyan('Config:'));
  console.log(config.get());
  console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
}

program
  .arguments('<spec_file>', 'Config file defining the map to build.  E.g. examples/france.yaml')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(build_map)
  .parse(process.argv);
