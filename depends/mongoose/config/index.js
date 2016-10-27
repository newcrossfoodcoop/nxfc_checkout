'use strict';

var config = require('config');
var path = require('path');
var lib = require(path.resolve('./lib/config'));

var myDefaultConfigs = {
    name: 'depends-mongoose',
    pathnameFmt: '%s-%s',
    _url: lib.deferredSetUrl(),
    url: {
        protocol: 'mongodb',
        slashes: true,
        hostname: 'localhost',
        port: 27017
    },
    env: {
        url: {
            hostname: 'MONGO_HOSTNAME',
            href: 'MONGO_HREF'
        }
    },
    models: 'you need to set a model glob pattern :)'
};

lib.processConfig({
    module: 'mongoose',
    defaultConfig: myDefaultConfigs
});

module.exports = config;
