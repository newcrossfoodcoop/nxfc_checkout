'use strict';

module.exports = {
    nodeEnvShort: 'prod',
    depends: {
        'psp-paypal-rest': {
            active: true,
            mode: 'live'
        },
        'psp-local': {
            active: false
        } 
    }
};
