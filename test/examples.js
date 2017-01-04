#!/usr/bin/env node
'use strict';

const
  chai = require( 'chai' ),
  assert = chai.assert,
  fs = require( 'fs' ),
  path = require( 'path' ),
  MapMaker = require( '..' );

/* global describe, it */
describe( 'ExampleGeneration', function() {
  var
    files,
    spec_file;
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  files = fs.readdirSync( './examples' );
  files.forEach( function( file ) {
    it( `Generate example map from ${file}`, function( done ) {
      spec_file = path.join( './examples', file );
      new MapMaker()
        .specFile( spec_file )
        .onError( ( err ) => {
          done( err );
        } )
        .onSuccess( ( data ) => {
          assert.isAbove( data.length, 0 );
          done();
        } )
        .build_map();
    } );
  } );
} );
