#!/usr/bin/env node
'use strict';

const d3 = require( 'd3' );

// Get the projection object from the specified config.
function get_projection( config ) {
  var
    proj_err = null,
    projection = null,
    proj_type = config.parameters.projection.type.toLowerCase();
  switch ( proj_type ) {
  case 'mercator':
    projection = d3.geoMercator();
    break;
  case 'albers':
    // @@@ Get parallels from config?
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
        config.parameters.projection.width / 2,
      ] )
      .rotate( config.parameters.projection.rotation );
  }
  return {
    proj_err,
    projection,
  };
}

module.exports.get_projection = get_projection;
