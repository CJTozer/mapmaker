#!/usr/bin/env node

/* jshint esversion: 6 */
'use strict';

const d3 = require( 'd3' );

// Anonymous object representing the module.
var Projections = function() {};

// Get the projection object from the specified config.
Projections.prototype.get_projection = function( config ) {
  var
    proj_err = null,
    projection = null,
    proj_type = config.parameters.projection.type.toLowerCase();
  switch ( proj_type ) {
  case 'mercator':
    projection = d3.geoMercator();
    break;
  case 'albers':
      // @@@ Get these from config?
    projection = d3.geoAlbers()
        .parallels( [ 50, 60 ] );
    break;
  default:
    proj_err = `Unrecognized projection "${proj_type}""`;
  }
  if ( !proj_err ) {
    projection = projection
      .center( config.parameters.projection.center )
      .scale( config.parameters.projection.scale )
      .translate( [
        config.parameters.projection.width / 2,
        config.parameters.projection.width / 2
      ] )
      .rotate( config.parameters.projection.rotation );
  }
  return {
    proj_err,
    projection
  };
};

// Finally, export the object.
module.exports = new Projections();
