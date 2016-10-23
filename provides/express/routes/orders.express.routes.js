'use strict';

var orders = require('../controllers/orders.express.controller');

module.exports = function(app) {

	// Orders Routes
	app.route('/api/orders')
		.get(orders.list);
		//.post(orders.create);

    app.route('/api/orders/history')
        .get(orders.history);

	app.route('/api/orders/:orderId')
		.get(orders.read)
		.delete(orders.delete);

	// Finish by binding the Order middleware
	app.param('orderId', orders.orderByID);
};
