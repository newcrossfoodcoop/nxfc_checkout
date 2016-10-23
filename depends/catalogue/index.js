'use strict';

/**
 * Module dependencies.
 */
var config = require('config');
var ramlParser = require('raml-parser');
var path = require('path');

var lib = require(path.resolve('./lib/config'));
var Api = require('./build/nxfcCatalogueClient');

var myDefaultConfigs = {
    _url: lib.deferredSetUrl(),
    url: {
        protocol: 'http',
        slashes: true,
        hostname: 'localhost',
        pathname: 'api',
        port: 3010
    },
    env: {
        url: {
            hostname: 'CATALOGUE_HOSTNAME',
            href: 'CATALOGUE_HREF'
        }
    }
};

lib.processConfig({
    module: 'catalogue',
    defaultConfig: myDefaultConfigs
});

module.exports = {
    api: new Api({baseUri: config.depends.catalogue.href}),
    raml: ramlParser.loadFile(path.resolve(__dirname, 'raml/api.raml'))
};
