#!/usr/bin/env node
'use strict';

const
  chalk = require( 'chalk' ),
  LOG_LEVEL = {
    NONE: 0,
    INFO: 1,
    DEBUG: 3,
  };

// Export Log levels
module.exports.LOG_LEVEL = LOG_LEVEL;

// Static Logger class
class Logger {

  // Always displayed
  static error( str ) {
    console.log( chalk.bold.red( str ) );
  }
  static output( str ) {
    console.log( chalk.bold( str ) );
  }

  // INFO level logs.
  static success( str ) {
    if ( process.env.LOG_LEVEL >= LOG_LEVEL.INFO ) {
      console.log( chalk.bold.green( str ) );
    }
  }
  static progress( tag, str ) {
    if ( process.env.LOG_LEVEL >= LOG_LEVEL.INFO ) {
      if ( !str ) {
        str = tag;
        console.log( chalk.bold.cyan( str ) );
      } else {
        console.log( chalk.bold.cyan( tag ) + ' : ' + str );
      }
    }
  }
  static info( tag, str ) {
    if ( process.env.LOG_LEVEL >= LOG_LEVEL.INFO ) {
      if ( !str ) {
        str = tag;
        console.log( chalk.bold.yellow( str ) );
      } else {
        console.log( chalk.bold.yellow( tag ) + ' ' + str );
      }
    }
  }
  static content( str ) {
    if ( process.env.LOG_LEVEL >= LOG_LEVEL.INFO ) {
      console.log( str );
    }
  }

  // Debug log
  static debug( tag, obj ) {
    var
      str;
    if ( process.env.LOG_LEVEL >= LOG_LEVEL.DEBUG ) {
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
}

// Export logger
module.exports.log = Logger;

// Split a comma-separated list
module.exports.listSplit = function listSplit( val ) {
  return val.split( ',' );
};
