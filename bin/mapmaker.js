#!/usr/bin/env node

const chalk = require( 'chalk' );
const fs = require( 'fs-extra' );
const program = require( 'commander' );
const tabula = require( 'tabula' );
const MapBuilder = require( '../libs/map-builder' );
const utils = require( '../libs/utils' );

// Main map building function.
function build_map( spec_file ) {
  /* jshint validthis:true */
  const cmd = this;

  // Set log level
  if ( program.quiet ) {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.NONE;
  } else if ( program.debug ) {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.DEBUG;
  } else {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.INFO;
  }

  const mapbuilder = new MapBuilder()
  .specFile( spec_file )
  .force( cmd.force )
  .onError( ( err ) => {
    throw new Error( err );
  } )
  .onSuccess( ( data ) => {
    if ( cmd.test ) {
      utils.log.progress( 'Writing to test-site...' );
      fs.writeFile( 'test-site/map_data.svg', data, ( err ) => {
        if ( err ) {
          utils.log.error( err );
        }
      } );
    }
  } );
  mapbuilder.build_map();
}

// Handy function for listing shape file data.
function list_shape_info( spec_file ) {
  /* jshint validthis:true */
  const cmd = this;
  let
    shape_elements,
    columns;

  // Set log level
  if ( program.quiet ) {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.NONE;
  } else if ( program.debug ) {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.DEBUG;
  } else {
    process.env.LOG_LEVEL = utils.LOG_LEVEL.INFO;
  }

  const mapbuilder = new MapBuilder()
  .specFile( spec_file )
  .onError( ( err ) => {
    throw new Error( err );
  } )
  .onSuccess( ( data ) => {
    if ( cmd.list_columns ) {
      // Just list all properties in first data element.
      utils.log.info( 'All data properties:' );
      Object.keys( data.features[ 0 ].properties ).forEach( ( p ) => {
        utils.log.output( p );
      } );
    } else {
      // Tabulate the data.
      // Use default columns if not given as an option.
      if ( !cmd.columns ) {
        cmd.columns = [ 'ADM0_A3', 'SU_A3', 'CONTINENT' ];
      }
      columns = cmd.columns.map( x => ( {
        lookup: x,
        name: chalk.bold.magenta( x ),
      } ) );
      shape_elements = data.features.map( x => x.properties );
      tabula( shape_elements, {
        columns: [ {
          lookup: 'NAME_LONG',
          name: chalk.bold.magenta( 'Name' ),
        } ].concat( columns ),
      } );
    }
  } );
  mapbuilder.get_shape_info();
}

// Global options.
program
  .option( '-d, --debug', 'Extra debug information while building the map' )
  .option( '-q, --quiet', 'Don\'t print any output while building the map.  Overrides --debug.' );

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
  .option( '-c, --columns <fields>', 'The fields to display.  Default: ADM0_A3,SU_A3', utils.listSplit )
  .option( '-l, --list_columns', 'Show all columns in this data.' )
  .arguments( '<spec_file>', 'Config file containing the shape file info.  E.g. examples/france.yaml' )
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
