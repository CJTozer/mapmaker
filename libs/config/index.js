#!/usr/bin/env node
'use strict';

const
  Config = require( 'merge-config' ),
  hash = require( 'object-hash' ),
  path = require( 'path' ),
  urljoin = require( 'url-join' ),
  utils = require( '../utils' );

// Build up a configuration object from a spec file and/or spec object.
module.exports.build_config = function( spec_file, spec_obj ) {
  var
    built_config,
    config,
    shape_data,
    file_base,
    shape_dir,
    repo_info,
    sha;

  // Get the global defaults then override with the specified specification.
  built_config = new Config();
  built_config.file( path.join( __dirname, '..', '..', 'defaults.yaml' ) );
  if ( spec_file ) {
    built_config.file( spec_file );
  }
  if ( spec_obj ) {
    built_config.merge( spec_obj );
  }

  // Set up derived config values:
  // - Download dirs and shapefile name
  shape_data = built_config.get( 'shape_data' );
  file_base = shape_data.filename.substr( 0, shape_data.filename.lastIndexOf( '.' ) ) || shape_data.filename;
  shape_dir = path.join( 'data', shape_data.repo, shape_data.base, file_base );
  built_config.set( 'derived:shape_dir', shape_dir );
  built_config.set( 'derived:shape_file', path.join( shape_dir, file_base + '.shp' ) );

  // - Info for the current repo
  repo_info = built_config.get( 'repos' )[ shape_data.repo ];
  built_config.set( 'derived:repo_info', repo_info );

  // - Download target
  built_config.set( 'derived:download_url', urljoin( repo_info.base_url, shape_data.base, shape_data.filename ) );

  // - SHA of the spec file, and output file.
  sha = hash( built_config.get() );
  built_config.set( 'derived:spec_sha1', sha );
  built_config.set( 'derived:output_svg', path.join( 'output', sha + '.svg' ) );

  // Store off the config as a 'normal' object.
  config = built_config.get();
  utils.log.debug( 'Full Config', config );
  return config;
};

// Validate that the supplied filter makes sense for the given data.
module.exports.validate_filter = function validate_filter( config, data ) {
  // @@@ TODO
  return config !== data;
};
