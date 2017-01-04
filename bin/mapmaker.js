#!/usr/bin/env node
'use strict';

const
  chalk = require( 'chalk' ),
  fs = require( 'fs-extra' ),
  program = require( 'commander' ),
  tabula = require( 'tabula' ),
  MapBuilder = require( '../libs/map-builder' );

// Global options.
program
  .option( '-d, --debug', 'Extra debug information while building the mapbuilder' );

// Main map building script - calls build_map.
program
  .command( 'make' )
  .description( 'Build a map from the given spec file' )
  .option( '-t, --test', 'Copy resulting map to test server' )
  .option( '-f, --force', 'Force map to be re-created even if nothing has changed' )
  .arguments( '<spec_file>', 'Config file defining the mapbuilder to build.  E.g. examples/france.yaml' )
  .action( build_map );

// List contents of a shape file - handy for working out e.g. counry codes.
program
  .command( 'list' )
  .description( 'List the keys in the shape file used by the given spec file' )
  .arguments( '<spec_file>', 'Config file containing the shape file info.  E.g. examples/france.yaml' )
  // @@@ Option to list specific keys only (or to get a list of valid keys - no values?).
  .action( list_shape_info );

// Catch-all for unrecognized sub-command (so show help).
program
  .command( '*', null, {
    noHelp: true,
  } )
  .action( () => {
    program.outputHelp();
  } );

// Kick off the program.
program.parse( process.argv );

// Main map building function.
function build_map( spec_file ) {
  /* jshint validthis:true */
  var
    cmd = this,
    mapbuilder;

  if ( program.debug ) {
    process.env.debug = true;
  }
  mapbuilder = new MapBuilder()
    .specFile( spec_file )
    .force( cmd.force )
    .onError( ( err ) => {
      throw new Error( err );
    } )
    .onSuccess( ( data ) => {
      if ( cmd.test ) {
        console.log( chalk.bold.cyan( 'Writing to test-site...' ) );
        fs.writeFile( 'test-site/map_data.svg', data, function( err ) {
          if ( err ) {
            console.log( chalk.bold.red( err ) );
          }
        } );
      }
    } );
  mapbuilder.build_map();
}

// Handy function for listing shape file data.
function list_shape_info( spec_file ) {
  // var cmd = this;
  var mapbuilder;
  if ( program.debug ) {
    process.env.debug = true;
  }
  mapbuilder = new MapBuilder()
    .specFile( spec_file )
    .onError( ( err ) => {
      throw new Error( err );
    } )
    .onSuccess( ( data ) => {
      // Tabulate the data.
      var shape_elements = data.features.map( ( x ) => {
        return x.properties;
      } );
      tabula( shape_elements, {
        // @@@ Get columns from a command option.
        columns: [ {
          lookup: 'NAME_LONG',
          name: chalk.bold.magenta( 'Name' ),
        }, {
          lookup: 'ADM0_A3',
          name: chalk.bold.magenta( 'ADM0_A3' ),
        } ],
      } );
      // @@@ Option to just list keys.
      // console.log(data.features[0]);
    } );
  mapbuilder.get_shape_info();
}