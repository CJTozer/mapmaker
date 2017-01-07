#!/usr/bin/env node
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
      files: [
        'index.js',
        'Gruntfile.js',
        'libs/**/*.js',
        'bin/**/*.js',
        'test/**/*.js',
      ],
      options: {
        reporter: require( 'jshint-stylish' ),
        jshintrc: '.jshintrc',
      },
    },
    jsonlint: {
      examples: {
        src: [
          'package.json',
          '.jshintrc',
          '.esdoc.json',
          'examples/*.json',
        ],
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
          src: [ 'docs/' ],
        },
      },
    },
    watch: {
      files: [ '<%= jshint.files %>' ],
      tasks: [ 'eslint' ],
      options: {
        spawn: false,
      },
    },
  } );

  grunt.loadNpmTasks( 'gruntify-eslint' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-jsonlint' );
  grunt.loadNpmTasks( 'grunt-esdoc' );
  grunt.loadNpmTasks( 'grunt-mocha-test' );
  grunt.loadNpmTasks( 'grunt-git' );
  grunt.loadNpmTasks( 'grunt-contrib-watch' );

  grunt.registerTask( 'default', [ 'lint' ] );

  grunt.registerTask( 'lint', [ 'eslint', 'jshint', 'jsonlint:examples' ] );
  grunt.registerTask( 'doc', 'esdoc' );
  grunt.registerTask( 'docs-add', [ 'doc', 'gitadd:docs' ] );
  grunt.registerTask( 'test', 'mochaTest' );
};
