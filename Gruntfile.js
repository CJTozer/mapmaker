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
  } );

  grunt.loadNpmTasks( 'gruntify-eslint' );
  grunt.registerTask( 'default', [ 'lint' ] );
  grunt.registerTask( 'lint', [ 'eslint' ] );
};
