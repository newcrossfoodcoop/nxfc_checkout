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
            externalHref: 'http://localhost:3000',
            env: {
                externalHref: 'EXTERNAL_HREF'
            }
        },
        'psp-local': {
            externalHref: 'http://localhost:3000',
            env: {
                externalHref: 'EXTERNAL_HREF'
            }
        }, 
    },
    provides: {
        express: {
            port: 3030,
            externalUrl: {
                href: 'http://localhost:3000'
            },
            env: {
                externalUrl: {
                    href: 'EXTERNAL_HREF'
                }
            }
        }
    }
};
