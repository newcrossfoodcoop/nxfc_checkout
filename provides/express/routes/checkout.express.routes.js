'use strict';

var checkout = require('../controllers/checkout.express.controller');

module.exports = function(app) {

    app.route('/api/checkout/config')
        .get(checkout.config);

	// Paypal Express Checkout Routes		
	app.route('/api/checkout/:method')
	    .post(checkout.start);

	app.route('/api/checkout/:method/:checkoutOrderId/:token/redirected')
	    .put(checkout.redirected);
	
	app.route('/api/checkout/:method/:checkoutOrderId/:token/confirm')
	    .get(checkout.confirm);
	
	app.route('/api/checkout/:method/:checkoutOrderId/:token/cancelled')
	    .put(checkout.cancelled);

	// Finish by binding the Order middleware
	app.param('checkoutOrderId', checkout.orderByID);
};
