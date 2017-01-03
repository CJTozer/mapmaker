#!/usr/bin/env node

/* jshint esversion: 6 */
'use strict';

const chai = require( 'chai' );
const assert = chai.assert;
const fs = require( 'fs' );
const path = require( 'path' );

const MapMaker = require( '../index.js' );

describe( 'ExampleGeneration', function() {
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  var files = fs.readdirSync( './examples' );
  files.forEach( function( file ) {
    it( `Generate example map from ${file}`, function( done ) {
      var spec_file = path.join( './examples', file );
      new MapMaker()
        .specFile( spec_file )
        .onError( ( err ) => {
          done( err );
        } )
        .onSuccess( ( data ) => {
          // assert.equal("+++", "---");
          done();
        } )
        .build_map();
    } );
  } );
} );
