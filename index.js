#!/usr/bin/env node --harmony
/* jshint esversion: 6 */
'use strict';

//// Steps to reproduce below.
// (From https://bost.ocks.org/mike/map/ and https://medium.com/@mbostock/command-line-cartography-part-1-897aa8f8ca2c#.u7rhxzq3t)
//
// - [x] Get data from naturalearthdata
// - [x] Filter down (and convert to JSON) using ogr2ogr
//   - `ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('GBR', 'IRL', 'FRA')" subunits.json ne_10m_admin_0_map_subunits.shp`
// - [ ] Convert to TopoJSON format
//   - `topojson -o topo.json -- geo.json`
// - [ ] Copy to /test-site (boiler-plate test site)
// - [ ] Just do it in Python, reading from a JSON file?
// - [ ] Move all the re-scaling, projections etc. into the map specfile not the HTML?

const async = require('async');
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
  async.series({
    build_config: function(callback) {
      console.log(chalk.bold.cyan('Building config...'));
      build_config(callback, spec_file);
    },
    get_data_files: function(callback) {
      console.log(chalk.bold.cyan('Checking data sources...'));
      get_data_files(callback);
    },
    filter_data: function(callback) {
      console.log(chalk.bold.cyan('Filtering data...'));
      filter_data(callback);
    },
  }, function(err, results) {
    if (err) {
      console.log(chalk.bold.red('Failed!  ') + err);
    } else {
      console.log(chalk.bold.green('Complete!') + '  Finished processing for ' + spec_file);
    }
  });
}

// Build up the configuration.
function build_config(callback, spec_file) {
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

  return callback(null);
}

// Ensure raw data is available.
function get_data_files(callback) {
  // Get the destination and check for existing data.
  try {
    // No error if already present, so return empty promise.
    fs.statSync(config.derived.shape_dir);
    console.log(chalk.bold.yellow('Data already available: ') + config.derived.shape_dir);
    return callback(null);
  } catch (err) {
    // Directory doesn't exist, proceed with download.
    console.log(chalk.bold.yellow('Downloading data: ') + config.derived.download_url);

    // Return the promise of complete downloads.
    download(config.derived.download_url, config.derived.shape_dir, {extract: true}).then(() => {
      return callback(null);
    }, (err) => {
      return callback(err);
    });
  }
}

// Filter data using ogr2ogr.
function filter_data(callback) {
  // @@@ Ensure build directory exists otherwise this will fail.
  // @@@ Delete existing test.json
  // @@@ Use a unique hash for this filtered file, and check whether file already exists.
  var ogr = ogr2ogr(config.derived.shape_file)
    .format('GeoJSON') // @@@ Get this from repo config?
    .options(['-where', 'ADM0_A3 IN (\'FRA\')'])
    .destination(path.join('build', 'test.json'))
    .stream()
    .on('error', (err) => {
      return callback(err);
    })
    .on('close', () => {
      return callback(null);
    });
}
