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
        port: 3040
    },
    env: {
        url: {
            hostname: 'STOCK_HOSTNAME',
            href: 'STOCK_HREF'
        }
    }
};

lib.processConfig({
    module: 'stock',
    defaultConfig: myDefaultConfigs
});

module.exports = config;
