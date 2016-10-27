'use strict';

// Any services provided should be given different port numbers for test
module.exports = {
    nodeEnvShort: 'test',
    depends: {
        catalogue: {
            url: {
                port: 3011
            }
        }
    },
	provides: {
	    express: {
	        logging: null,
            port: 3031
        }
	}
};
