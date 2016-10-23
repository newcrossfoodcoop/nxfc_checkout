'use strict';

var path = require('path');
var config = require('config');

var express = require('./lib');
var mongoose = require(path.resolve('./depends/mongoose'));

var lib = require(path.resolve('./lib/config'));

var myDefaultConfigs = {
    port: 8080,
    routes: path.resolve(__dirname,'./routes'),
    _externalUrl: lib.deferredSetUrl('externalUrl'),
    externalUrl: {
        protocol: 'http',
        slashes: true,
        hostname: 'localhost',
        port: 8080
    },
    env: {
        port: 'EXPRESS_PORT'
    }
};

lib.processConfig({
    moduleGroup: 'provides',
    module: 'express',
    defaultConfig: myDefaultConfigs
});

mongoose.connect(function (db) {
    var app = express.init();

	// Start the app by listening on <port>
	var port = config.provides.express.port;
	app.listen(port);

	// Logging initialization
	console.log('Express started on port ' + port);
});
