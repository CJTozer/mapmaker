#!/usr/bin/env node
var program = require('commander');
var chalk = require('chalk');
var Config = require('merge-config');

program
  .arguments('<spec_file>')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(function(spec_file) {
    var config = new Config();
    config.file('defaults.yaml');
    config.file(spec_file);
    console.log(chalk.bold.cyan('Config:'));
    console.log(config.get());
    console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
  })
  .parse(process.argv);

