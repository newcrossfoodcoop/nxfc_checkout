'use strict';

var path = require('path');
var express = require('express');

module.exports = function(app) {
    app.use('/', express.static(path.resolve(__dirname, '../raml'), {index: 'build/api.html'}));
};
