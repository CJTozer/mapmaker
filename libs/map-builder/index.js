#!/usr/bin/env node

const async = require( 'async' );
const css = require( 'node-css' );
const d3 = require( 'd3' );
const download = require( 'download' );
const fs = require( 'fs-extra' );
const jsdom = require( 'jsdom' );
const ogr2ogr = require( 'ogr2ogr' );
const config = require( '../config' );
const projections = require( '../projections' );
const utils = require( '../utils' );

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
    const self = this;
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
   * @param {function(data: string)} ok_cb - the success callback, passed the
   *                                         generated SVG as a string.
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
    const self = this;
    async.series( {
      build_config: ( callback ) => {
        utils.log.progress( 'Building config...' );
        self.config = config.build_config( self.spec_file, self.spec_obj );
        callback( null );
      },
      check_for_existing_output: ( callback ) => {
        fs.readFile( self.config.derived.output_svg, ( err, data ) => {
          if ( !err && !self.force ) {
            utils.log.info( 'Output already generated', self.config.derived.output_svg );
            self.output_exists = true;
            self.svg_text = data;
          }
          return callback( null );
        } );
      },
      get_data_files: ( callback ) => {
        if ( !self.output_exists ) {
          utils.log.progress( 'Checking data sources...' );
          self.get_data_files( callback );
        } else {
          callback( null );
        }
      },
      filter_data: ( callback ) => {
        if ( !self.output_exists ) {
          utils.log.progress( 'Filtering data...' );
          self.filter_data( callback );
        } else {
          callback( null );
        }
      },
      build_css: ( callback ) => {
        if ( !self.output_exists ) {
          utils.log.progress( 'Generating CSS...' );
          self.build_css( callback );
        } else {
          callback( null );
        }
      },
      create_svg: ( callback ) => {
        if ( !self.output_exists ) {
          utils.log.progress( 'Creating SVG...' );
          self.create_svg( callback );
        } else {
          callback( null );
        }
      },
    }, ( err ) => {
      if ( err ) {
        utils.log.error( 'Failed!' );
        utils.log.error( err );
        if ( self.err_cb ) {
          self.err_cb( err );
        }
      } else {
        utils.log.success( 'Map Building Complete!' );
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
    const self = this;
    async.series( {
      build_config: ( callback ) => {
        utils.log.progress( 'Building config...' );
        self.config = config.build_config( self.spec_file, self.spec_obj );
        callback( null );
      },
      get_data_files: ( callback ) => {
        utils.log.progress( 'Checking data sources...' );
        self.get_data_files( callback );
      },
      get_shape_info: ( callback ) => {
        utils.log.progress( 'Getting shape info...' );
        // @@@ Option to apply filter first.
        // @@@ Get format from repo config?
        ogr2ogr( self.config.derived.shape_file )
          .format( 'GeoJSON' )
          .exec( ( err, geo_data ) => {
            if ( err ) {
              return callback( err );
            }
            self.data = geo_data;
            return callback( null );
          } );
      },
    }, ( err ) => {
      if ( err ) {
        utils.log.error( 'Failed!' );
        utils.log.error( err );
        if ( self.err_cb ) {
          self.err_cb( err );
        }
      } else {
        utils.log.success( 'Parsed shape info!' );
        if ( self.ok_cb ) {
          self.ok_cb( self.data );
        }
      }
    } );
  }

  /**
   * Ensure raw data is available.
   * @access private
   */
  get_data_files( callback ) {
    const self = this;

    // Get the destination and check for existing data.
    fs.access( self.config.derived.shape_dir, ( err ) => {
      if ( !err ) {
        utils.log.info( 'Data already available', self.config.derived.shape_dir );
        callback( null );
      } else {
        // Directory doesn't exist, proceed with download.
        utils.log.progress( 'Downloading data', self.config.derived.download_url );
        // @@@ Get extract value from spec file...
        download( self.config.derived.download_url, self.config.derived.shape_dir, {
          extract: true,
        } ).then( () => callback( null ), dl_err => callback( dl_err ) );
      }
    } );
  }

  /**
   * Filter data using ogr2ogr.
   * @access private
   */
  filter_data( callback ) {
    const self = this;
    let options = [];
    let values;
    utils.log.debug( 'Countries config', self.config.parameters.countries );
    utils.log.debug( 'Filter', self.config.parameters.filter );
    const filter = self.config.parameters.filter;
    if ( filter ) {
      switch ( filter.type ) {
      case 'countries':
        if ( !self.config.parameters.countries ) {
          return callback( 'Cannot filter on countries with no countries specified - use "type: all"' );
        }
        values = Object.keys( self.config.parameters.countries ).join( '\', \'' );
        options = options.concat( [ '-where', `${filter.key} IN ('${values}')` ] );
        break;
      case 'array':
        if ( !filter.array ) {
          return callback( 'Cannot filter on array with no elements specified' );
        }
        values = filter.array.join( '\', \'' );
        options = options.concat( [ '-where', `${filter.key} IN ('${values}')` ] );
        break;
      case 'all':
          // Include all countries - no filter
        break;
      default:
        return callback( `Unknown value for "filter": ${filter.type}` );
      }
    }
    // @@@ Get format from repo config?
    utils.log.debug( 'ogr2ogr options', options );
    ogr2ogr( self.config.derived.shape_file )
      .format( 'GeoJSON' )
      .options( options )
      .exec( ( err, geo_data ) => {
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
    const self = this;
    const base_style = self.config.style;
    Object.keys( base_style ).forEach( ( key ) => {
      const data = base_style[ key ];
      if ( data ) {
        self.css_string += css( key, data );
      }
    } );

    // Per-country CSS.
    const countries = self.config.parameters.countries;
    if ( countries ) {
      Object.keys( countries ).forEach( ( key ) => {
        const data = countries[ key ];
        if ( data ) {
          self.css_string += css( `.ADM0_A3-${key}`, data );
        }
      } );
    }
    utils.log.debug( 'Generated CSS', self.css_string );
    return callback( null );
  }

  /**
   * Create the SVG file.
   * @access private
   */
  create_svg( callback ) {
    const self = this;
    // Use jsdom to create a fake DOM to work in.
    jsdom.env( '<body />',
      ( err, window ) => {
        if ( err ) {
          return callback( err );
        }

        // Create an SVG element for the map.
        const body = d3.select( window.document ).select( 'body' );
        const svg = body.append( 'svg' )
          .attr( 'width', self.config.parameters.projection.width )
          .attr( 'height', self.config.parameters.projection.height );

        const {
          proj_err,
          projection,
        } = projections.get_projection( self.config );
        if ( proj_err ) {
          return callback( proj_err );
        }
        const path = d3.geoPath()
          .projection( projection );

        // Add an appropriate class to each country.
        svg.selectAll( '.country' )
          .data( self.data.features )
          .enter().append( 'path' )
          .attr( 'class', d => [
            `ADM0_A3-${d.properties.ADM0_A3}`,
            `SU_A3-${d.properties.SU_A3}`,
            `GU_A3-${d.properties.GU_A3}`,
          ].join( ' ' ) )
          .attr( 'd', path );

        // Add in the CSS style.
        svg.append( 'style' ).text( self.css_string );

        // Write SVG to the output directory.
        // Write body.html() to the SVG file as this is effectively svg.outerHTML.
        if ( !fs.existsSync( 'output' ) ) {
          fs.mkdirSync( 'output' );
        }
        self.svg_text = body.html();
        fs.writeFile( self.config.derived.output_svg, self.svg_text, ( write_err ) => {
          if ( write_err ) {
            utils.log.error( write_err );
            return callback( write_err );
          }

          utils.log.info( `Saved to ${self.config.derived.output_svg}` );
          return callback( null );
        } );
      }
    );
  }
}

// Export the MapBuilder class.
module.exports = MapBuilder;
