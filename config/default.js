'use strict';

var path = require('path');
var defer = require('config/defer').deferConfig;
var chalk = require('chalk');

var pkgjson = require(path.resolve('./package.json'));

module.exports = {
    nodeEnvShort: defer(function() {
        throw new Error(chalk.red('NODE_ENV value not recognised!'));
    }),
	repo: {
		title: 'NXFC Checkout',
		description: 'NXFC Checkout and Orders service',
		pkgjson: pkgjson
	},
    depends: {
        mongoose: {
            name: 'nxfc-checkout',
            models: 'depends/mongoose/models/*.js'
        },
        catalogue: {},
        'psp-paypal-rest': {
            externalHost: defer(function() {
                var cfg = this;
                return cfg.provides.express.externalUrl.host;
            }) 
        },
        'psp-local': {
            externalHost: defer(function() {
                var cfg = this;
                return cfg.provides.express.externalUrl.host;
            }) 
        }, 
    },
    provides: {
        express: {
            port: 3030,
            externalUrl: {
                host: 'localhost:3030'
            }
        }
    }
};
