#!/usr/bin/env node

const chai = require( 'chai' );
const fs = require( 'fs' );
const parseXML = require( 'xml2js' ).parseString;
const path = require( 'path' );
const MapMaker = require( '..' );

const assert = chai.assert;
const expect = chai.expect;

/* global describe, it */
/* jshint expr: true */
/* eslint no-unused-expressions: off */

// Test we get some output generated for each example.
describe( 'ExampleGeneration', function() {
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  const files = fs.readdirSync( './examples' );
  files.forEach( ( file ) => {
    it( `Generate example map from ${file}`, ( done ) => {
      const spec_file = path.join( './examples', file );
      new MapMaker()
        .specFile( spec_file )
        .onError( ( err ) => {
          done( err );
        } )
        .onSuccess( ( data ) => {
          // Check we got some data
          assert.isAbove( data.length, 0 );
          expect( data ).to.not.be.empty;
          parseXML( data, ( err, xml_obj ) => {
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

// Test the get_shape_info method.
describe( 'ShapeInfo', function() {
  const spec_file = 'examples/europe.yaml';
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  it( `Get shape info from ${spec_file}`, ( done ) => {
    new MapMaker()
      .specFile( spec_file )
      .onError( ( err ) => {
        done( err );
      } )
      .onSuccess( ( data ) => {
        // Check the returned data
        expect( data ).to.have.property( 'features' );
        expect( data.features ).to.not.be.empty;
        const feature = data.features[ 0 ];
        expect( feature ).to.have.property( 'properties' );
        expect( feature.properties ).to.have.property( 'ADM0_A3' );
        done();
      } )
      .get_shape_info();
  } );
} );
