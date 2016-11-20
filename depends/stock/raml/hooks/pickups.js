'use strict';

var hooks = require('hooks'),
    assert = require('assert');

var request = require('request');
var randomstring = require('randomstring');

var pickup, location;

// seed an extra location for pickup
hooks.after('POST /locations -> 200', function (test, done) {
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            location = bod;
            done(err);
        }
    );
});

hooks.before('GET /pickups/{pickupId} -> 200', function (test, done) {
    test.request.params.pickupId = pickup._id;
    done();
});

hooks.before('POST /pickups -> 200', function (test, done) {
    test.request.body.location = location._id;
    done();
});

hooks.after('POST /pickups -> 200', function (test, done) {
    pickup = test.response.body;
    done();
});

var close_pickup;
// seed an extra pickup for close
hooks.after('POST /pickups -> 200', function (test, done) {
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            close_pickup = bod;
            done(err);
        }
    );
});

hooks.before('GET /pickups/{pickupId}/close -> 200', function (test, done) {
    test.request.params.pickupId = close_pickup._id;
    done();
});

var order_pickup;
// seed an extra pickup for order
hooks.after('POST /pickups -> 200', function (test, done) {
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            order_pickup = bod;
            done(err);
        }
    );
});

var order_checkout;
// seed an extra checkout for order
hooks.after('POST /checkouts -> 200', function (test, done) {
    test.request.body.orderId = randomstring.generate({
        length: 24,
        charset: 'hex'
    });
    test.request.body.pickup = order_pickup._id;
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            order_checkout = bod;
            done(err);
        }
    );
});

// close order pickup
hooks.after('POST /checkouts -> 200', function (test, done) {
    request.get(
        test.request.server + '/pickups/'+ order_pickup._id +'/close',
        done
    );
});

hooks.before('GET /pickups/{pickupId}/order -> 200', function (test, done) {
    test.request.params.pickupId = order_pickup._id;
    done();
});


hooks.before('GET /pickups/{pickupId}/checkouts -> 200', function (test, done) {
    test.request.params.pickupId = order_pickup._id;
    done();
});
