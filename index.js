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
const ogr2ogr = require('ogr2ogr');
const path = require('path');
const program = require('commander');
const urljoin = require('url-join');

// Globals
var config = {};

// Main entrypoint using commander - calls build_map.
program
  .arguments('<spec_file>', 'Config file defining the map to build.  E.g. examples/france.yaml')
  .option('-t, --test', 'Copy resulting map to test server')
  .action(build_map)
  .parse(process.argv);

// Main processing function.
function build_map(spec_file) {
  build_config(spec_file);

  ensure_data(config).then(() => {
    // @@@ TODO Continue with map building...
    filter_data();
    console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
  }, (err) => {
    console.log(chalk.bold.red('Failed!  ') + 'Could not retrieve data.');
    console.log(err);
  });
}

// Build up the configuration.
function build_config(spec_file) {
  // Get the global defaults then override with the specified specification.
  var built_config = new Config();
  built_config.file('defaults.yaml');
  built_config.file(spec_file);

  // Set up derived config values:
  // - Download dirs and shapefile name
  var shape_data = built_config.get('shape_data');
  var file_base = shape_data.filename.substr(0, shape_data.filename.lastIndexOf('.')) || shape_data.filename;
  var shape_dir = path.join('data', shape_data.repo, shape_data.base, file_base);
  built_config.set('derived:shape_dir',  shape_dir);
  built_config.set('derived:shape_file', path.join(shape_dir, file_base + '.shp'));

  // - Info for the current repo
  var repo_info = built_config.get('repos')[shape_data.repo];
  built_config.set('derived:repo_info', repo_info);

  // - Download target
  built_config.set('derived:download_url', urljoin(repo_info.base_url, shape_data.base, shape_data.filename));

  // Store off the config as a 'normal' object.
  config = built_config.get();
  console.log(chalk.bold.cyan('Config:'));
  console.log(config);
}

// Ensure raw data is available.
function ensure_data() {
  // Get the destination and check for existing data.
  try {
    // No error if already present, so return empty promise.
    fs.statSync(config.derived.shape_dir);
    console.log(chalk.bold.yellow('Data already available: ') + config.derived.shape_dir);
    return Promise.resolve();
  } catch (err) {
    // Directory doesn't exist, proceed with download.
    console.log(chalk.bold.yellow('Downloading data: ') + config.derived.download_url);

    // Return the promise of complete downloads.
    return download(config.derived.download_url, config.derived.shape_dir, {extract: true});
  }
}

// Filter data using ogr2ogr.
function filter_data() {
  console.log("STARTING");
  var ogr = ogr2ogr(config.derived.shape_file)
    .format('GeoJSON') // @@@ Get this from repo config?
    .options(['-where', 'ADM0_A3 IN (\'FRA\')'])
    .destination(path.join('build', 'test.json'))
    .stream()
    .on('error', (err) => {
      console.log(err);
    })
    .on('close', () => {
      console.log("DONE");
    });

  // @@@ Switch all this stuff to use async.series.
  // Each success/failure case then calls the provided callback (with the error or null) and this ensures serial operation.
}
