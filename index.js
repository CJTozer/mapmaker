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

// Anonymous object representing the module.
var MapBuilder = function () {
  this.config = {};
  this.data = {};
  this.output_exists = false;
  this.css_string = "";
};

// Main script entry point using commander - calls build_map.
program
  .arguments("<spec_file>", "Config file defining the map to build.  E.g. examples/france.yaml")
  .option("-t, --test", "Copy resulting map to test server")
  .option("-f, --force", "Force map to be re-created even if nothing has changed")
  .option("-d, --debug", "Extra debug information while building the map")
  .action(build_map)
  .parse(process.argv);

// Main processing function.
function build_map(spec_file) {
  var mm = new MapBuilder();
  async.series({
    build_config: (callback) => {
      console.log(chalk.bold.cyan("Building config..."));
      mm.build_config(callback, spec_file);
    },
    check_for_existing_output: (callback) => {
      fs.access(mm.config.derived.output_svg, (err) => {
        if (!err && !program.force) {
          console.log(chalk.bold.yellow("Output already generated: ") +
            mm.config.derived.output_svg);
          mm.output_exists = true;
        }
        return callback(null);
      });
    },
    get_data_files: (callback) => {
      if (!mm.output_exists) {
        console.log(chalk.bold.cyan("Checking data sources..."));
        mm.get_data_files(callback);
      } else {
        return callback(null);
      }
    },
    filter_data: (callback) => {
      if (!mm.output_exists) {
        console.log(chalk.bold.cyan("Filtering data..."));
        mm.filter_data(callback);
      } else {
        return callback(null);
      }
    },
    build_css: (callback) => {
      if (!mm.output_exists) {
        console.log(chalk.bold.cyan("Generating CSS..."));
        mm.build_css(callback);
      } else {
        return callback(null);
      }
    },
    create_svg: (callback) => {
      if (!mm.output_exists) {
        console.log(chalk.bold.cyan("Creating SVG..."));
        mm.create_svg(callback);
      } else {
        return callback(null);
      }
    },
    write_to_test_site: (callback) => {
      if (program.test) {
        console.log(chalk.bold.cyan("Writing to test-site..."));
        mm.write_to_test_site(callback);
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
MapBuilder.prototype.build_config = function (callback, spec_file) {
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
  this.config = built_config.get();
  debug("Config", this.config);
  return callback(null);
};

// Ensure raw data is available.
MapBuilder.prototype.get_data_files = function (callback) {
  // Get the destination and check for existing data.
  fs.access(this.config.derived.shape_dir, (err) => {
    if (!err) {
      console.log(chalk.bold.yellow("Data already available: ") + this.config.derived.shape_dir);
      return callback(null);
    } else {
      // Directory doesn't exist, proceed with download.
      console.log(chalk.bold.cyan("Downloading data: ") + this.config.derived.download_url);
      // @@@ Get extract value from spec file...
      download(this.config.derived.download_url, this.config.derived.shape_dir, {extract: true}).then(() => {
        return callback(null);
      }, (err) => {
        return callback(err);
      });
    }
  });
};

// Filter data using ogr2ogr.
MapBuilder.prototype.filter_data = function (callback) {
  debug("Countries config", this.config.parameters.countries);
  var filter = "ADM0_A3 IN (\'" + Object.keys(this.config.parameters.countries).join("\', \'") + "\')";
  var ogr = ogr2ogr(this.config.derived.shape_file)
    .format("GeoJSON") // @@@ Get this from repo config?
    .options(["-where", filter])
    .exec(function (err, geo_data) {
      if (err) return callback(err);
      this.data = geo_data;
      return callback(null);
    });
};

// Generate the CSS.
MapBuilder.prototype.build_css = function (callback) {
  // Base styles.
  var base_style = this.config.style;
  Object.keys(base_style).forEach((key) => {
    var data = base_style[key];
    if (data) {
      this.css_string += css(key, data);
    }
  });

  // Per-country CSS.
  var countries = this.config.parameters.countries;
  Object.keys(countries).forEach((key) => {
    var data = countries[key];
    if (data) {
      this.css_string += css(`.ADM0_A3-${key}`, data);
    }
  });
  debug(this.css_string);
  return callback(null);
};

// Create the SVG file.
MapBuilder.prototype.create_svg = function (callback) {
  // Use jsdom to create a fake DOM to work in.
  jsdom.env("<body />",
    function (err, window) {
      if (err) return callback(err);

      // Create an SVG element for the map.
      var body = d3.select(window.document).select("body");
      var svg = body.append("svg")
        .attr("width", this.config.parameters.projection.width)
        .attr("height", this.config.parameters.projection.height);

      // @@@ TODO - get projection from spec
      let {proj_err, projection} = projections.get_projection(this.config);
      if (proj_err) return callback(proj_err);
      var path = d3.geoPath()
        .projection(projection);

      // Add an appropriate class to each country.
      svg.selectAll(".country")
        .data(this.data.features)
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
      svg.append("style").text(this.css_string);

      // Write SVG to the output directory.
      // Write body.html() to the SVG file as this is effectively svg.outerHTML.
      if (!fs.existsSync("output")) fs.mkdirSync("output");
      fs.writeFile(this.config.derived.output_svg, body.html(), function(err) {
        if(err) {
          console.log(err);
          return callback(err);
        }

        console.log("Saved to " + this.config.derived.output_svg);
        return callback(null);
      });
    }
  );
};

// Write data to the test-site.
MapBuilder.prototype.write_to_test_site = function (callback) {
  fs.copy(this.config.derived.output_svg, "test-site/map_data.svg", function (err) {
    if (err) return callback(err);
    return callback(null);
  });
};

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

MapBuilder.prototype.test = function (config) {
  console.log("MapBuilder test");
};

// Finally, export the object.
module.exports = new MapBuilder();
