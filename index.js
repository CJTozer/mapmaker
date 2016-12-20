#!/usr/bin/env node
/* jshint esversion: 6 */
'use strict';

//// Steps to reproduce below.
// (From https://bost.ocks.org/mike/map/ and https://medium.com/@mbostock/command-line-cartography-part-1-897aa8f8ca2c#.u7rhxzq3t)
//
// - [x] Get data from naturalearthdata
// - [ ] Filter down (and convert to JSON) using ogr2ogr
//   - `ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('GBR', 'IRL', 'FRA')" subunits.json ne_10m_admin_0_map_subunits.shp`
// - [ ] Convert to TopoJSON format
//   - `topojson -o topo.json -- geo.json`
// - [ ] Copy to /test-site (boiler-plate test site)
// - [ ] Just do it in Python, reading from a JSON file?
// - [ ] Move all the re-scaling, projections etc. into the map Makefile not the HTML?
// - [ ] Sort out dependencies - right now everything is happening always...

const chalk = require('chalk');
const Config = require('merge-config');
const download = require('download');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const urljoin = require('url-join');

// Globals
var config = new Config();

// Main entrypoint using commander - calls build_map
program
  .arguments('<spec_file>', 'Config file defining the map to build.  E.g. examples/france.yaml')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(build_map)
  .parse(process.argv);

// Main processing function
function build_map(spec_file) {
  build_config(spec_file);

  ensure_data(config).then(() => {
    // @@@ TODO Continue with map building...
    console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
  }, (err) => {
    console.log(chalk.bold.red('Failed!  ') + 'Could not retrieve data.');
    console.log(err);
  });
}

// Build up the configuration.
function build_config(spec_file) {
  // Get the global defaults then override with the specified specification.
  config.file('defaults.yaml');
  config.file(spec_file);

  console.log(chalk.bold.cyan('Config:'));
  console.log(config.get());
}

// Ensure raw data is available
function ensure_data(config) {
  var shape_data = config.get('shape_data');
  var repo_info = config.get('repos')[shape_data.repo];

  // Get the destination and check for existing data.
  var shape_file = shape_data.file;
  var file_base = shape_file.substr(0, shape_file.lastIndexOf('.')) || shape_file;
  var destination = path.join('data', shape_data.repo, shape_data.base, file_base);
  try {
    // No error if already present, so return empty promise.
    fs.statSync(destination);
    console.log(chalk.bold.yellow('Data already available: ') + destination);
    return Promise.resolve();
  } catch (err) {
    // Directory doesn't exist, proceed with download.
    var url = urljoin(repo_info.base_url, shape_data.base, shape_file);
    console.log(chalk.bold.yellow('Downloading data: ') + url);

    // Return the promise of complete downloads.
    return download(url, destination, {extract: true});
  }
}
