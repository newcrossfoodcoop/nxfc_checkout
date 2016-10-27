'use strict';

/**
 * Module dependencies.
 */
var config = require('./config');
var ramlParser = require('raml-parser');
var path = require('path');

var Api = require('./build/0.1.0/nxfcCatalogueClient');

module.exports = {
    api: new Api({baseUri: config.depends.catalogue.href}),
    raml: ramlParser.loadFile(path.resolve(__dirname, 'raml/api.raml'))
};
