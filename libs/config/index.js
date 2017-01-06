#!/usr/bin/env node
'use strict';

// Validate that the supplied filter makes sense for the given data.
module.exports.validate_filter = function validate_filter( config, data ) {
  // @@@ TODO
  return config !== data;
};
