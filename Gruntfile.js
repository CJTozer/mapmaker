#!/usr/bin/env node

/* jshint esversion: 6 */
'use strict';

module.exports = function( grunt ) {
  grunt.initConfig( {
    eslint: {
      options: {
        configFile: '.eslintrc.yaml',
        fix: true,
      },
      src: [ '.' ],
    },
    esdoc: {
      dist: {
        options: {
          config: '.esdoc.json',
        },
      },
    },
  } );

  grunt.loadNpmTasks( 'gruntify-eslint' );
  grunt.loadNpmTasks( 'grunt-esdoc' );

  grunt.registerTask( 'default', [ 'lint' ] );

  grunt.registerTask( 'lint', [ 'eslint' ] );
  grunt.registerTask( 'doc', [ 'esdoc' ] );
};
