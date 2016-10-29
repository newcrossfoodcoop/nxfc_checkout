'use strict';

// Any services provided should be given different port numbers for test
module.exports = {
    nodeEnvShort: 'test',
    depends: {
        catalogue: {
            url: {
                port: 3011
            }
        },
        'psp-paypal-rest': {
            externalHref: 'http://localhost:3001',
        },
        'psp-local': {
            externalHref: 'http://localhost:3001',
        }, 
    },
	provides: {
	    express: {
	        logging: null,
            port: 3031,
            externalUrl: {
                host: 'localhost:3001'
            },
        }
	}
};
