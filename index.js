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
const urljoin = require("url-join");

// Globals
var config = {};
var data = {};
var output_exists = false;
var css_string = "";

// Main entry point using commander - calls build_map.
program
  .arguments("<spec_file>", "Config file defining the map to build.  E.g. examples/france.yaml")
  .option("-t, --test", "Copy resulting map to test server")
  .option("-f, --force", "Force map to be re-created even if nothing has changed")
  .option("-d, --debug", "Extra debug information while building the map")
  .action(build_map)
  .parse(process.argv);

// Main processing function.
function build_map(spec_file) {
  async.series({
    build_config: (callback) => {
      console.log(chalk.bold.cyan("Building config..."));
      build_config(callback, spec_file);
    },
    check_for_existing_output: (callback) => {
      fs.access(config.derived.output_svg, (err) => {
        if (!err && !program.force) {
          console.log(chalk.bold.yellow("Output already generated: ") +
            config.derived.output_svg);
          output_exists = true;
        }
        return callback(null);
      });
    },
    get_data_files: (callback) => {
      if (!output_exists) {
        console.log(chalk.bold.cyan("Checking data sources..."));
        get_data_files(callback);
      } else {
        return callback(null);
      }
    },
    filter_data: (callback) => {
      if (!output_exists) {
        console.log(chalk.bold.cyan("Filtering data..."));
        filter_data(callback);
      } else {
        return callback(null);
      }
    },
    build_css: (callback) => {
      if (!output_exists) {
        console.log(chalk.bold.cyan("Generating CSS..."));
        build_css(callback);
      } else {
        return callback(null);
      }
    },
    create_svg: (callback) => {
      if (!output_exists) {
        console.log(chalk.bold.cyan("Creating SVG..."));
        create_svg(callback);
      } else {
        return callback(null);
      }
    },
    write_to_test_site: (callback) => {
      if (program.test) {
        console.log(chalk.bold.cyan("Writing to test-site..."));
        write_to_test_site(callback);
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

// Build up the configuration.
function build_config(callback, spec_file) {
  // Get the global defaults then override with the specified specification.
  var built_config = new Config();
  built_config.file("defaults.yaml");
  built_config.file(spec_file);

  // Set up derived config values:
  // - Download dirs and shapefile name
  var shape_data = built_config.get("shape_data");
  var file_base = shape_data.filename.substr(0, shape_data.filename.lastIndexOf(".")) || shape_data.filename;
  var shape_dir = path.join("data", shape_data.repo, shape_data.base, file_base);
  built_config.set("derived:shape_dir",  shape_dir);
  built_config.set("derived:shape_file", path.join(shape_dir, file_base + ".shp"));

  // - Info for the current repo
  var repo_info = built_config.get("repos")[shape_data.repo];
  built_config.set("derived:repo_info", repo_info);

  // - Download target
  built_config.set("derived:download_url", urljoin(repo_info.base_url, shape_data.base, shape_data.filename));

  // - SHA of the spec file, and output file.
  var sha = hash(built_config.get());
  built_config.set("derived:spec_sha1", sha);
  built_config.set("derived:output_svg", path.join("output", sha + ".svg"));

  // Store off the config as a 'normal' object.
  config = built_config.get();
  debug("Config", config);
  return callback(null);
}

// Ensure raw data is available.
function get_data_files(callback) {
  // Get the destination and check for existing data.
  fs.access(config.derived.shape_dir, (err) => {
    if (!err) {
      console.log(chalk.bold.yellow("Data already available: ") + config.derived.shape_dir);
      return callback(null);
    } else {
      // Directory doesn't exist, proceed with download.
      console.log(chalk.bold.cyan("Downloading data: ") + config.derived.download_url);
      // @@@ Get extract value from spec file...
      download(config.derived.download_url, config.derived.shape_dir, {extract: true}).then(() => {
        return callback(null);
      }, (err) => {
        return callback(err);
      });
    }
  });
}

// Filter data using ogr2ogr.
function filter_data(callback) {
  debug("Countries config", config.parameters.countries);
  var filter = "ADM0_A3 IN (\'" + Object.keys(config.parameters.countries).join("\', \'") + "\')";
  var ogr = ogr2ogr(config.derived.shape_file)
    .format("GeoJSON") // @@@ Get this from repo config?
    .options(["-where", filter])
    .exec(function (err, geo_data) {
      if (err) return callback(err);
      data = geo_data;
      return callback(null);
    });
}

// Generate the CSS.
function build_css(callback) {
  // Base styles.
  var base_style = config.style;
  Object.keys(base_style).forEach((key) => {
    var data = base_style[key];
    if (data) {
      css_string += css(key, data);
    }
  });

  // Per-country CSS.
  var countries = config.parameters.countries;
  Object.keys(countries).forEach((key) => {
    var data = countries[key];
    if (data) {
      css_string += css(`.ADM0_A3-${key}`, data);
    }
  });
  debug(css_string);
  return callback(null);
}

// Create the SVG file.
function create_svg(callback) {
  // Use jsdom to create a fake DOM to work in.
  jsdom.env("<body />",
    function (err, window) {
      if (err) return callback(err);

      // Create an SVG element for the map.
      var body = d3.select(window.document).select("body");
      var svg = body.append("svg")
        .attr("width", config.parameters.projection.width)
        .attr("height", config.parameters.projection.height);

      // @@@ TODO - get projection from spec
      let {proj_err, projection} = projections.get_projection(config);
      if (proj_err) return callback(proj_err);
      var path = d3.geoPath()
        .projection(projection);

      // Add an appropriate class to each country.
      svg.selectAll(".country")
        .data(data.features)
        .enter().append("path")
        .attr("class", function(d) {
          return [
            "ADM0_A3-" + d.properties.ADM0_A3,
            "SU_A3-" + d.properties.SU_A3,
            "GU_A3-" + d.properties.GU_A3,
          ].join(" ");
        })
        .attr("d", path);

      // Add in the CSS style.
      svg.append("style").text(css_string);

      // Write SVG to the output directory.
      // Write body.html() to the SVG file as this is effectively svg.outerHTML.
      if (!fs.existsSync("output")) fs.mkdirSync("output");
      fs.writeFile(config.derived.output_svg, body.html(), function(err) {
        if(err) {
          console.log(err);
          return callback(err);
        }

        console.log("Saved to " + config.derived.output_svg);
        return callback(null);
      });
    }
  );
}

// Write data to the test-site.
function write_to_test_site(callback) {
  fs.copy(config.derived.output_svg, "test-site/map_data.svg", function (err) {
    if (err) return callback(err);
    return callback(null);
  });
}

// Debug log
function debug(tag, obj) {
  if (program.debug) {
    if (!obj) {
      obj = tag;
      tag = "Debug:";
    }
    var str = chalk.bold.magenta(tag);
    str += ": ";
    if (typeof obj === "string") {
      str += chalk.dim.gray(obj);
    } else {
      str += chalk.dim.gray(JSON.stringify(obj, undefined, 2));
    }
    console.log(str);
  }
}
