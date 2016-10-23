'use strict';

/**
 * Module dependencies.
 */
 
var chalk = require('chalk');
var	path = require('path');
var	_ = require('lodash');
var	mongoose = require('mongoose');
var config = require('config');
var glob = require('glob');

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

// Load the mongoose models
exports.loadModels = function() {
	// Globbing model files
	glob(config.depends.mongoose.models, function(modelPath) {
		require(path.resolve(modelPath));
	});
};

// Initialize Mongoose
exports.connect = function(cb) {
	var _this = this;
    var url = config.depends.mongoose.href
	mongoose.connect(url, function (err) {
		// Log Error
		if (err) {
			console.error(chalk.red('Could not connect to MongoDB!'));
			console.log('tried: "%s"\n  got: "%s"', url, err);
			cb(err);
		} else {
			// Load modules
			_this.loadModels();

			// Call callback FN
			cb();
		}
	});
};

exports.disconnect = function(cb) {
    mongoose.disconnect(function(err) {
        console.info(chalk.yellow('Disconnected from MongoDB.'));
        cb(err);
    });
};

