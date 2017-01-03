#!/usr/bin/env node

/* jshint esversion: 6 */
'use strict';

const
  async = require( 'async' ),
  chalk = require( 'chalk' ),
  Config = require( 'merge-config' ),
  css = require( 'node-css' ),
  d3 = require( 'd3' ),
  download = require( 'download' ),
  fs = require( 'fs-extra' ),
  hash = require( 'object-hash' ),
  jsdom = require( 'jsdom' ),
  ogr2ogr = require( 'ogr2ogr' ),
  path = require( 'path' ),
  projections = require( '../projections' ),
  urljoin = require( 'url-join' ),
  utils = require( '../utils' );

/**
 * Class for encapsulating a map building operation.
 * @example
 * new MapBuilder()
 *   .specFile('examples/france.yaml')
 *   .onError((err) => {
 *     console.log(err);
 *   })
 *   .onSuccess((data) => {
 *     console.log("Success");
 *     do_something_with_svg_data(data);
 *   })
 *   .build_map();
 */
class MapBuilder {
  constructor() {
    var self = this;
    self.config = {};
    self.data = {};
    self.spec_obj = {};
    self.spec_file = '';
    self.output_exists = false;
    self.css_string = '';
    self.svg_text = 'Failed to build SVG';
  }

  /**
   * Specify an error callback for this {@link MapBuilder}.
   *
   * @param {function(err: string)} err_cb - the error callback.
   */
  onError( err_cb ) {
    this.err_cb = err_cb;
    return this;
  }

  /**
   * Specify a success callback for this {@link MapBuilder}.
   *
   * @param {function(data: string)} ok_cb - the success callback, passed the generated SVG as a string.
   */
  onSuccess( ok_cb ) {
    this.ok_cb = ok_cb;
    return this;
  }

  /**
   * Specify the configuration to use.
   *
   * May be used in conjunction with {@link specFile}.  They will be merged with the
   * spec_obj taking precedence in case of clashes.
   *
   * @param {!Object} spec_obj - object describing the configuration to use.
   * @example
   * var spec_obj = {
   *   "parameters": {
   *     "projection": {
   *       "type": "mercator",
   *       "width": 960,
   *       "height": 1120,
   *       "scale": 1600,
   *       "center": [2, 50]
   *     }
   *   }
   * }
   * new MapBuilder()
   *   .spec(spec_obj)
   *   // (Register .onError and .onSuccess callbacks.)
   *   .build_map();
   */
  spec( spec_obj ) {
    this.spec_obj = spec_obj;
    return this;
  }

  /**
   * Specify the configuration to use.
   *
   * May be used in conjunction with {@link spec}.  They will be merged with the
   * spec_obj taking precedence in case of clashes.
   *
   * @param {string} spec_file - configuration file to use.
   */
  specFile( spec_file ) {
    this.spec_file = spec_file;
    return this;
  }

  /**
   * Specify whether to force a rebuild.
   *
   * Normally maps are cached based on the specification, but if you update
   * this module you may want to use this option to force the map to be
   * re-created.
   *
   * @param {boolean} force - whether to force map re-creation.
   */
  force( force ) {
    this.force = force;
    return this;
  }

  /**
   * Asynchronously build the map.
   *
   * Requires {@link onError} and {@link onSuccess} specified to handle the
   * results.
   */
  build_map() {
    var self = this;
    async.series( {
      build_config: ( callback ) => {
        console.log( chalk.bold.cyan( 'Building config...' ) );
        self.build_config( callback, self.spec_file );
      },
      check_for_existing_output: ( callback ) => {
        fs.readFile( self.config.derived.output_svg, function( err, data ) {
          if ( !err && !self.force ) {
            console.log( chalk.bold.yellow( 'Output already generated: ' ) + self.config.derived.output_svg );
            self.output_exists = true;
            self.svg_text = data;
          }
          return callback( null );
        } );
      },
      get_data_files: ( callback ) => {
        if ( !self.output_exists ) {
          console.log( chalk.bold.cyan( 'Checking data sources...' ) );
          self.get_data_files( callback );
        } else {
          return callback( null );
        }
      },
      filter_data: ( callback ) => {
        if ( !self.output_exists ) {
          console.log( chalk.bold.cyan( 'Filtering data...' ) );
          self.filter_data( callback );
        } else {
          return callback( null );
        }
      },
      build_css: ( callback ) => {
        if ( !self.output_exists ) {
          console.log( chalk.bold.cyan( 'Generating CSS...' ) );
          self.build_css( callback );
        } else {
          return callback( null );
        }
      },
      create_svg: ( callback ) => {
        if ( !self.output_exists ) {
          console.log( chalk.bold.cyan( 'Creating SVG...' ) );
          self.create_svg( callback );
        } else {
          return callback( null );
        }
      },
    }, function( err ) {
      if ( err ) {
        console.log( chalk.bold.red( 'Failed!  ' ) + err );
        if ( self.err_cb ) {
          self.err_cb( err );
        }
      } else {
        console.log( chalk.bold.green( 'Map Building Complete!' ) );
        if ( self.ok_cb ) {
          self.ok_cb( self.svg_text );
        }
      }
    } );
  }

  /**
   * Print information from the shape file specified in the config.
   *
   * Requires {@link onError} and {@link onSuccess} specified to handle the
   * results.
   */
  get_shape_info() {
    var self = this;
    async.series( {
      build_config: ( callback ) => {
        console.log( chalk.bold.cyan( 'Building config...' ) );
        self.build_config( callback, self.spec_file );
      },
      get_data_files: ( callback ) => {
        console.log( chalk.bold.cyan( 'Checking data sources...' ) );
        self.get_data_files( callback );
      },
      get_shape_info: ( callback ) => {
        console.log( chalk.bold.cyan( 'Getting shape info...' ) );
        // @@@ Option to apply filter first.
        // @@@ Get format from repo config?
        ogr2ogr( self.config.derived.shape_file )
          .format( 'GeoJSON' )
          .exec( function( err, geo_data ) {
            if ( err ) {
              return callback( err );
            }
            self.data = geo_data;
            return callback( null );
          } );
      },
    }, function( err ) {
      if ( err ) {
        console.log( chalk.bold.red( 'Failed!  ' ) + err );
        if ( self.err_cb ) {
          self.err_cb( err );
        }
      } else {
        console.log( chalk.bold.green( 'Parsed shape info!' ) );
        if ( self.ok_cb ) {
          self.ok_cb( self.data );
        }
      }
    } );
  }

  /**
   * Build up the configuration.
   * @access private
   */
  build_config( callback ) {
    var
      self = this,
      built_config,
      shape_data,
      file_base,
      shape_dir,
      repo_info,
      sha;

    // Get the global defaults then override with the specified specification.
    built_config = new Config();
    built_config.file( path.join( __dirname, '..', '..', 'defaults.yaml' ) );
    if ( self.spec_file ) {
      built_config.file( self.spec_file );
    }
    if ( self.spec_obj ) {
      built_config.merge( self.spec_obj );
    }
    utils.debug( 'Pure Config', self.config );

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
    self.config = built_config.get();
    utils.debug( 'Full Config', self.config );
    return callback( null );
  }

  /**
   * Ensure raw data is available.
   * @access private
   */
  get_data_files( callback ) {
    var self = this;

    // Get the destination and check for existing data.
    fs.access( self.config.derived.shape_dir, ( err ) => {
      if ( !err ) {
        console.log( chalk.bold.yellow( 'Data already available: ' ) + self.config.derived.shape_dir );
        return callback( null );
      } else {
        // Directory doesn't exist, proceed with download.
        console.log( chalk.bold.cyan( 'Downloading data: ' ) + self.config.derived.download_url );
        // @@@ Get extract value from spec file...
        download( self.config.derived.download_url, self.config.derived.shape_dir, {
          extract: true
        } ).then( () => {
          return callback( null );
        }, ( err ) => {
          return callback( err );
        } );
      }
    } );
  }

  /**
   * Filter data using ogr2ogr.
   * @access private
   */
  filter_data( callback ) {
    var
      self = this,
      values,
      options = [],
      filter;
    utils.debug( 'Countries config', self.config.parameters.countries );
    utils.debug( 'Filter', self.config.parameters.filter );
    filter = self.config.parameters.filter;
    if ( filter ) {
      switch ( filter.type ) {
      case 'countries':
        if ( !self.config.parameters.countries ) {
          return callback( 'Cannot filter on countries with no countries specified - use "type: all"' );
        }
        values = Object.keys( self.config.parameters.countries ).join( '\', \'' );
        options = options.concat( [ '-where', `${filter.key} IN (\'${values}\')` ] );
        break;
      case 'all':
          // Include all countries - no filter
        break;
      default:
        return callback( `Unknown value for "filter": ${filter.type}` );
      }
    }
    // @@@ Get format from repo config?
    ogr2ogr( self.config.derived.shape_file )
      .format( 'GeoJSON' )
      .options( options )
      .exec( function( err, geo_data ) {
        if ( err ) {
          return callback( err );
        }
        self.data = geo_data;
        return callback( null );
      } );
  }

  /**
   * Generate the CSS.
   * @access private
   */
  build_css( callback ) {
    var
      self = this,
      base_style = self.config.style,
      countries;
    Object.keys( base_style ).forEach( ( key ) => {
      var data = base_style[ key ];
      if ( data ) {
        self.css_string += css( key, data );
      }
    } );

    // Per-country CSS.
    countries = self.config.parameters.countries;
    if ( countries ) {
      Object.keys( countries ).forEach( ( key ) => {
        var data = countries[ key ];
        if ( data ) {
          self.css_string += css( `.ADM0_A3-${key}`, data );
        }
      } );
    }
    utils.debug( 'Generated CSS', self.css_string );
    return callback( null );
  }

  /**
   * Create the SVG file.
   * @access private
   */
  create_svg( callback ) {
    var self = this;
    // Use jsdom to create a fake DOM to work in.
    jsdom.env( '<body />',
      function( err, window ) {
        var
          body,
          svg,
          path;
        if ( err ) {
          return callback( err );
        }

        // Create an SVG element for the map.
        body = d3.select( window.document ).select( 'body' );
        svg = body.append( 'svg' )
          .attr( 'width', self.config.parameters.projection.width )
          .attr( 'height', self.config.parameters.projection.height );

        let {
          proj_err,
          projection
        } = projections.get_projection( self.config );
        if ( proj_err ) {
          return callback( proj_err );
        }
        path = d3.geoPath()
          .projection( projection );

        // Add an appropriate class to each country.
        svg.selectAll( '.country' )
          .data( self.data.features )
          .enter().append( 'path' )
          .attr( 'class', function( d ) {
            return [
              'ADM0_A3-' + d.properties.ADM0_A3,
              'SU_A3-' + d.properties.SU_A3,
              'GU_A3-' + d.properties.GU_A3,
            ].join( ' ' );
          } )
          .attr( 'd', path );

        // Add in the CSS style.
        svg.append( 'style' ).text( self.css_string );

        // Write SVG to the output directory.
        // Write body.html() to the SVG file as this is effectively svg.outerHTML.
        if ( !fs.existsSync( 'output' ) ) {
          fs.mkdirSync( 'output' );
        }
        self.svg_text = body.html();
        fs.writeFile( self.config.derived.output_svg, self.svg_text, function( err ) {
          if ( err ) {
            console.log( err );
            return callback( err );
          }

          console.log( 'Saved to ' + self.config.derived.output_svg );
          return callback( null );
        } );
      }
    );
  }
}

// Export the MapBuilder class.
module.exports = MapBuilder;
