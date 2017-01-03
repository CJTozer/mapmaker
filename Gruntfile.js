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
    jshint: {
      allFiles: [
        'index.js',
        'Gruntfile.js',
        'libs/**/*.js',
        'test/**/*.js',
      ],
      options: {
        reporter: require( 'jshint-stylish' ),
        jshintrc: '.jshintrc',
      },
    },
    esdoc: {
      dist: {
        options: {
          config: '.esdoc.json',
        },
      },
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
        },
        src: [ 'test/**/*.js' ],
      },
    },
    gitadd: {
      docs: {
        files: {
          src: [ 'docs' ],
        },
      },
    },
  } );

  grunt.loadNpmTasks( 'gruntify-eslint' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-esdoc' );
  grunt.loadNpmTasks( 'grunt-mocha-test' );
  grunt.loadNpmTasks( 'grunt-git' );

  grunt.registerTask( 'default', [ 'lint' ] );

  grunt.registerTask( 'lint', [ 'eslint', 'jshint' ] );
  grunt.registerTask( 'doc', 'esdoc' );
  grunt.registerTask( 'docs-add', [ 'doc', 'gitadd:docs' ] );
  grunt.registerTask( 'test', 'mochaTest' );
};
