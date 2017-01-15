#!/usr/bin/env node

const chai = require( 'chai' );
const MapMaker = require( '..' );

const expect = chai.expect;

/* global describe, it */
/* jshint expr: true */
/* eslint no-unused-expressions: off */

// Test that we get error callbacks, not exceptions.
describe( 'ErrorNotException', function() {
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );
  it( 'build_map - supply no spec', ( done ) => {
    new MapMaker()
      .onError( () => {
        done();
      } )
      .onSuccess( () => {
        done( 'Expected error' );
      } )
      .build_map();
  } );

  it( 'build_map - supply invalid spec', ( done ) => {
    new MapMaker()
      .spec( { wont: 'work' } )
      .onError( () => {
        done();
      } )
      .onSuccess( () => {
        done( 'Expected error' );
      } )
      .build_map();
  } );

  it( 'build_map - supply invalid specFile', ( done ) => {
    new MapMaker()
      .specFile( 'notafile.json' )
      .onError( () => {
        done();
      } )
      .onSuccess( () => {
        done( 'Expected error' );
      } )
      .build_map();
  } );

  it( 'get_shape_info - supply invalid specFile', ( done ) => {
    new MapMaker()
      .specFile( 'notafile.json' )
      .onError( () => {
        done();
      } )
      .onSuccess( () => {
        done( 'Expected error' );
      } )
      .get_shape_info();
  } );
} );

// Test that we get exceptions when there is no error callback.
describe( 'ExceptionNoErrorCallback', function() {
  // Increase timeout - when running on a fresh system, downloads are required.
  this.timeout( 180000 );

  it( 'build_map - supply no spec', ( done ) => {
    const mm = new MapMaker()
      .onSuccess( () => {
        done( 'Expected error' );
      } );
    expect( () => {
      mm.build_map();
    } ).to.throw();
    done();
  } );
} );
