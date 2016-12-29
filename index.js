#!/usr/bin/env node
/* jshint esversion: 6 */
"use strict";

const chalk = require("chalk");
const fs = require("fs-extra");
const program = require("commander");
const MapBuilder = require('./libs/map-builder');

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
  var mapbuilder = new MapBuilder(program, spec_file)
    .onError((err) => {
      console.log(chalk.bold.red(err));
    })
    .onSuccess((data) => {
      if (program.test) {
        console.log(chalk.bold.cyan("Writing to test-site..."));
        fs.writeFile("test-site/map_data.svg", data, function (err) {
          if (err) {
            console.log(chalk.bold.red(err));
          }
        });
      }
    });
  mapbuilder.build_map();
}
