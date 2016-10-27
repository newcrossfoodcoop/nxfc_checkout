'use strict';

/**
 * Module dependencies.
 */
 
var chalk = require('chalk');
var	path = require('path');
var	_ = require('lodash');
var	mongoose = require('mongoose');
var config = require('./config');
var glob = require('glob');

// Load the mongoose models
exports.loadModels = function() {
	// Globbing model files
	glob.sync(config.depends.mongoose.models)
	    .forEach(function(file) {
		    require(path.resolve(file));
		});
};

// Initialize Mongoose
exports.connect = function(cb) {
	var _this = this;
    var url = config.depends.mongoose.href;
	mongoose.connect(url, function (err, db) {
		// Log Error
		if (err) {
			console.error(chalk.red('Could not connect to MongoDB!'));
			console.log('tried: "%s"\n  got: "%s"', url, err);
			cb(err);
		} else {
			// Load modules
			_this.loadModels();
			
            console.log(chalk.bold('Mongoose connected to: ', url));
			// Call callback FN
			cb(null, db);
		}
	});
};

exports.disconnect = function(cb) {
    mongoose.disconnect(function(err) {
        console.info(chalk.yellow('Disconnected from MongoDB.'));
        cb(err);
    });
};

