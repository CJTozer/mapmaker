#!/usr/bin/env node
/* jshint esversion: 6 */
"use strict";

const d3 = require("d3");

// Anonymous object representing the module.
var Projections = function () {};

// Get the projection object from the specified config.
Projections.prototype.get_projection = function (config) {
  var err = null;
  var projection = d3.geoMercator()
    .center(config.parameters.projection.center)
    .scale(config.parameters.projection.scale)
    .translate([
      config.parameters.projection.width / 2,
      config.parameters.projection.height / 2]);
  return {err, projection};
};

// Finally, export the object.
module.exports = new Projections();
