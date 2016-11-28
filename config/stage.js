'use strict';

module.exports = {
    nodeEnvShort: 'stage',
    depends: {
        'psp-paypal-rest': {
            active: true,
            mode: 'sandbox'
        },
        'psp-local': {
            active: false
        } 
    }
};
