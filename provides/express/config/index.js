'use strict';

var config = require('config');
var path = require('path');
var lib = require(path.resolve('./lib/config'));

var myDefaultConfigs = {
    logging: 'dev',
    port: 8080,
    routes: path.resolve(__dirname, '../routes/**/*.js'),
    _externalUrl: lib.deferredSetUrl('externalUrl'),
    externalUrl: {
        protocol: 'http',
        slashes: true,
        hostname: 'localhost',
        port: 8080
    },
    env: {
        port: 'EXPRESS_PORT',
        externalUrlHref: 'EXPRESS_EXTERNAL_HREF'
    }
};

lib.processConfig({
    moduleGroup: 'provides',
    module: 'express',
    defaultConfig: myDefaultConfigs
});

module.exports = config;
