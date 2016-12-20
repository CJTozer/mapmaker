#!/usr/bin/env node
const chalk = require('chalk');
const Config = require('merge-config');
const download = require('download');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const urljoin = require('url-join');

// Main entrypoint using commander - calls build_map
program
  .arguments('<spec_file>', 'Config file defining the map to build.  E.g. examples/france.yaml')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(build_map)
  .parse(process.argv);

// Main processing function
function build_map(spec_file) {
  var config = new Config();
  config.file('defaults.yaml');
  config.file(spec_file);

  console.log(chalk.bold.cyan('Config:'));
  console.log(config.get());

  ensure_data(config).then(() => {
    // @@@ TODO Continue with map building...
    console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
  }, () => {
    console.log(chalk.bold.red('Failed!  ') + 'Could not retrieve data.');
  });
}

// Ensure raw data is available
function ensure_data(config) {
  var shape_data = config.get('shape_data');
  var repo_info = config.get('repos')[shape_data['repo']];

  // Get the destination and check for existing data.
  var destination = path.join('data', shape_data['repo'], shape_data['base']);
  try {
    // No error if already present, so return empty promise.
    fs.statSync(destination);
    console.log(chalk.bold.yellow('Data already available: ') + destination);
    return Promise.resolve();
  } catch (err) {
    // Directory doesn't exist, proceed with download.
    var url = urljoin(repo_info['url'], shape_data['base'], shape_data['file']);
    console.log(chalk.bold.yellow('Downloading data: ') + url);

    // Return the promise of complete downloads.
    return download(url, destination, {extract: true});
  }
}