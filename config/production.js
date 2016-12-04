'use strict';

module.exports = {
    nodeEnvShort: 'prod',
    depends: {
        'psp-paypal-rest': {
            active: true,
            mode: 'live',
            name: 'paypal-rest'
        },
        'psp-local': {
            active: false
        } 
    }
};
