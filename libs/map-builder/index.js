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
const projections = require('../projections');
const urljoin = require("url-join");
const utils = require('../utils');

// Anonymous object representing the module.
var MapBuilder = function () {
  var self = this;
  self.config = {};
  self.data = {};
  self.spec_obj = {};
  self.spec_file = "";
  self.output_exists = false;
  self.css_string = "";
  self.svg_text = "Failed to buid SVG";
};

// Setters for error and success callbacks.
MapBuilder.prototype.onError = function (err_cb) {
  this.err_cb = err_cb;
  return this;
};
MapBuilder.prototype.onSuccess = function (ok_cb) {
  this.ok_cb = ok_cb;
  return this;
};

// Setters for options
MapBuilder.prototype.spec = function (spec_obj) {
  this.spec_obj = spec_obj;
  return this;
};
MapBuilder.prototype.specFile = function (spec_file) {
  this.spec_file = spec_file;
  return this;
};
MapBuilder.prototype.force = function (force) {
  this.force = force;
  return this;
};

// Main function to build the map using async.
MapBuilder.prototype.build_map = function () {
  var self = this;
  async.series({
    build_config: (callback) => {
      console.log(chalk.bold.cyan("Building config..."));
      self.build_config(callback, self.spec_file);
    },
    check_for_existing_output: (callback) => {
      fs.readFile(self.config.derived.output_svg, function (err, data) {
        if (!err && !self.force) {
          console.log(chalk.bold.yellow("Output already generated: ") + self.config.derived.output_svg);
          self.output_exists = true;
          self.svg_text = data;
        }
        return callback(null);
      });
    },
    get_data_files: (callback) => {
      if (!self.output_exists) {
        console.log(chalk.bold.cyan("Checking data sources..."));
        self.get_data_files(callback);
      } else {
        return callback(null);
      }
    },
    filter_data: (callback) => {
      if (!self.output_exists) {
        console.log(chalk.bold.cyan("Filtering data..."));
        self.filter_data(callback);
      } else {
        return callback(null);
      }
    },
    build_css: (callback) => {
      if (!self.output_exists) {
        console.log(chalk.bold.cyan("Generating CSS..."));
        self.build_css(callback);
      } else {
        return callback(null);
      }
    },
    create_svg: (callback) => {
      if (!self.output_exists) {
        console.log(chalk.bold.cyan("Creating SVG..."));
        self.create_svg(callback);
      } else {
        return callback(null);
      }
    },
  }, function(err) {
    if (err) {
      console.log(chalk.bold.red("Failed!  ") + err);
      if (self.err_cb) self.err_cb(err);
    } else {
      console.log(chalk.bold.green("Map Building Complete!"));
      if (self.ok_cb) self.ok_cb(self.svg_text);
    }
  });
};

// Build up the configuration.
MapBuilder.prototype.build_config = function (callback) {
  var self = this;

  // Get the global defaults then override with the specified specification.
  var built_config = new Config();
  built_config.file(path.join(__dirname, "..", "..", "defaults.yaml"));
  if (self.spec_file) built_config.file(self.spec_file);
  if (self.spec_obj) built_config.merge(self.spec_obj);
  utils.debug("Pure Config", self.config);

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
  self.config = built_config.get();
  utils.debug("Full Config", self.config);
  return callback(null);
};

// Ensure raw data is available.
MapBuilder.prototype.get_data_files = function (callback) {
  var self = this;

  // Get the destination and check for existing data.
  fs.access(self.config.derived.shape_dir, (err) => {
    if (!err) {
      console.log(chalk.bold.yellow("Data already available: ") + self.config.derived.shape_dir);
      return callback(null);
    } else {
      // Directory doesn't exist, proceed with download.
      console.log(chalk.bold.cyan("Downloading data: ") + self.config.derived.download_url);
      // @@@ Get extract value from spec file...
      download(self.config.derived.download_url, self.config.derived.shape_dir, {extract: true}).then(() => {
        return callback(null);
      }, (err) => {
        return callback(err);
      });
    }
  });
};

// Filter data using ogr2ogr.
MapBuilder.prototype.filter_data = function (callback) {
  var self = this;
  utils.debug("Countries config", self.config.parameters.countries);
  var options = [];
  utils.debug("Filter", self.config.filter);
  var filter = self.config.parameters.filter;
  if (filter) {
    switch (filter.type) {
      case "countries":
        if (!self.config.parameters.countries) return callback(`Cannot filter on countries with no countries specified - use "type: all"`);
        var values = Object.keys(self.config.parameters.countries).join("\', \'");
        options = options.concat(["-where", `${filter.key} IN (\'${values}\')`]);
        break;
      case "all":
        // Include all countries - no filter
        break;
      default:
        return callback(`Unknown value for "filter": ${filter.type}`);
    }
  }
  ogr2ogr(self.config.derived.shape_file)
    .format("GeoJSON") // @@@ Get this from repo config?
    .options(options)
    .exec(function (err, geo_data) {
      if (err) return callback(err);
      self.data = geo_data;
      return callback(null);
    });
};

// Generate the CSS.
MapBuilder.prototype.build_css = function (callback) {
  var self = this;
  // Base styles.
  var base_style = self.config.style;
  Object.keys(base_style).forEach((key) => {
    var data = base_style[key];
    if (data) {
      self.css_string += css(key, data);
    }
  });

  // Per-country CSS.
  var countries = self.config.parameters.countries;
  if (countries) {
    Object.keys(countries).forEach((key) => {
      var data = countries[key];
      if (data) {
        self.css_string += css(`.ADM0_A3-${key}`, data);
      }
    });
  }
  utils.debug("Generated CSS", self.css_string);
  return callback(null);
};

// Create the SVG file.
MapBuilder.prototype.create_svg = function (callback) {
  var self = this;
  // Use jsdom to create a fake DOM to work in.
  jsdom.env("<body />",
    function (err, window) {
      if (err) return callback(err);

      // Create an SVG element for the map.
      var body = d3.select(window.document).select("body");
      var svg = body.append("svg")
        .attr("width", self.config.parameters.projection.width)
        .attr("height", self.config.parameters.projection.height);

      let {proj_err, projection} = projections.get_projection(self.config);
      if (proj_err) return callback(proj_err);
      var path = d3.geoPath()
        .projection(projection);

      // Add an appropriate class to each country.
      svg.selectAll(".country")
        .data(self.data.features)
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
      svg.append("style").text(self.css_string);

      // Write SVG to the output directory.
      // Write body.html() to the SVG file as this is effectively svg.outerHTML.
      if (!fs.existsSync("output")) fs.mkdirSync("output");
      self.svg_text = body.html();
      fs.writeFile(self.config.derived.output_svg, self.svg_text, function(err) {
        if(err) {
          console.log(err);
          return callback(err);
        }

        console.log("Saved to " + self.config.derived.output_svg);
        return callback(null);
      });
    }
  );
};

// Get info from the shape file.
MapBuilder.prototype.get_shape_info = function () {
  var self = this;
  if (self.err_cb) self.err_cb("get_shape_info not yet implemented");
};

// Finally, export the object.
module.exports = MapBuilder;
