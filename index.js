#!/usr/bin/env node
/* jshint esversion: 6 */
"use strict";

const async = require("async");
const chalk = require("chalk");
const Config = require("merge-config");
const css = require("node-css");
const d3 = require("d3");
const download = require("download");
const fs = require("fs-extra");
const hash = require("object-hash");
const jsdom = require("jsdom");
const ogr2ogr = require("ogr2ogr");
const path = require("path");
const program = require("commander");
const projections = require('./libs/projections');
const MapBuilder = require('./libs/map-builder');
const urljoin = require("url-join");

// Main script entry point using commander - calls build_map.
program
  .arguments("<spec_file>", "Config file defining the mapbuilder to build.  E.g. examples/france.yaml")
  .option("-t, --test", "Copy resulting mapbuilder to test server")
  .option("-f, --force", "Force mapbuilder to be re-created even if nothing has changed")
  .option("-d, --debug", "Extra debug information while building the mapbuilder")
  .action(build_map)
  .parse(process.argv);

// Main processing function.
function build_map(spec_file) {
  if (program.debug) process.env.debug = true;
  var mapbuilder = new MapBuilder();
  async.series({
    build_config: (callback) => {
      console.log(chalk.bold.cyan("Building config..."));
      mapbuilder.build_config(callback, spec_file);
    },
    check_for_existing_output: (callback) => {
      fs.access(mapbuilder.config.derived.output_svg, (err) => {
        if (!err && !program.force) {
          console.log(chalk.bold.yellow("Output already generated: ") +
            mapbuilder.config.derived.output_svg);
          mapbuilder.output_exists = true;
        }
        return callback(null);
      });
    },
    get_data_files: (callback) => {
      if (!mapbuilder.output_exists) {
        console.log(chalk.bold.cyan("Checking data sources..."));
        mapbuilder.get_data_files(callback);
      } else {
        return callback(null);
      }
    },
    filter_data: (callback) => {
      if (!mapbuilder.output_exists) {
        console.log(chalk.bold.cyan("Filtering data..."));
        mapbuilder.filter_data(callback);
      } else {
        return callback(null);
      }
    },
    build_css: (callback) => {
      if (!mapbuilder.output_exists) {
        console.log(chalk.bold.cyan("Generating CSS..."));
        mapbuilder.build_css(callback);
      } else {
        return callback(null);
      }
    },
    create_svg: (callback) => {
      if (!mapbuilder.output_exists) {
        console.log(chalk.bold.cyan("Creating SVG..."));
        mapbuilder.create_svg(callback);
      } else {
        return callback(null);
      }
    },
    write_to_test_site: (callback) => {
      if (program.test) {
        console.log(chalk.bold.cyan("Writing to test-site..."));
        mapbuilder.write_to_test_site(callback);
      } else {
        callback(null);
      }
    },
  }, function(err, results) {
    if (err) {
      console.log(chalk.bold.red("Failed!  ") + err);
    } else {
      console.log(chalk.bold.green("Complete!  ") + "Finished processing for " + spec_file);
    }
  });
}
