'use strict';

var config = require('config');
var path = require('path');
var lib = require(path.resolve('./lib/config'));

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

module.exports = config;
