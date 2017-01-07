#!/usr/bin/env node
'use strict';

const chalk = require( 'chalk' );

// Debug log
module.exports.debug = function debug( tag, obj ) {
  var
    str;
  if ( process.env.DEBUG ) {
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
};

// Split a comma-separated list
module.exports.listSplit = function listSplit( val ) {
  return val.split( ',' );
};
