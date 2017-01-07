#!/usr/bin/env node
'use strict';

const
  chai = require( 'chai' ),
  assert = chai.assert,
  expect = chai.expect,
  fs = require( 'fs' ),
  parseXML = require( 'xml2js' ).parseString,
  path = require( 'path' ),
  MapMaker = require( '..' );

/* global describe, it */
/* jshint expr: true */

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
          // Check we got some data
          assert.isAbove( data.length, 0 );
          expect( data ).to.not.be.empty;
          parseXML( data, function( err, xml_obj ) {
            expect( err ).to.be.null;
            expect( xml_obj ).to.not.be.empty;
            expect( xml_obj ).to.have.property( 'svg' );
            expect( xml_obj ).to.have.deep.property( 'svg.path' );
            expect( xml_obj ).to.have.deep.property( 'svg.path[0]' );
            expect( xml_obj ).to.have.deep.property( 'svg.style' );
            done();
          } );
        } )
        .build_map();
    } );
  } );
} );

describe( 'ShapeInfo', function() {
  var
    spec_file = 'examples/europe.yaml',
    feature;
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  it( `Get shape info from ${spec_file}`, function( done ) {
    new MapMaker()
      .specFile( spec_file )
      .onError( ( err ) => {
        done( err );
      } )
      .onSuccess( ( data ) => {
        // Check the returned data
        expect( data ).to.have.property( 'features' );
        expect( data.features ).to.not.be.empty;
        feature = data.features[ 0 ];
        expect( feature ).to.have.property( 'properties' );
        expect( feature.properties ).to.have.property( 'ADM0_A3' );
        done();
      } )
      .get_shape_info();
  } );
} );
