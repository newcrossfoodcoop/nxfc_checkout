'use strict';

var hooks = require('hooks'),
    assert = require('assert');

var pickup;
hooks.after('GET /pickups/{pickupId}/order -> 200', function (test, done) {
    pickup = test.response.body;
    done();
});

hooks.before('PUT /orders/{orderId}/delivered -> 200', (test, done) => {
    test.request.params.orderId = pickup.orders[0]._id;
    done();
});
