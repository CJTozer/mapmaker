#!/usr/bin/env node

/* jshint esversion: 6 */
'use strict';

const chalk = require( 'chalk' );

// Debug log
function debug( tag, obj ) {
  var
    str;
  if ( process.env.debug ) {
    if ( !obj ) {
      obj = tag;
      tag = 'Debug:';
    }
    str = chalk.bold.magenta( tag );
    str += ': ';
    if ( typeof obj === 'string' ) {
      str += chalk.dim.gray( obj );
    } else {
      str += chalk.dim.gray( JSON.stringify( obj, undefined, 2 ) );
    }
    console.log( str );
  }
}

module.exports.debug = debug;
