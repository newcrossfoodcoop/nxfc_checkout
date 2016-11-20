'use strict';

var hooks = require('hooks');
var assert = require('assert');
var _ = require('lodash');

var request = require('request');
var randomstring = require('randomstring');

var checkout, pickup;

// seed an extra location for pickup
hooks.after('POST /pickups -> 200', function (test, done) {
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            pickup = bod;
            done();
        }
    );
});

hooks.before('GET /checkouts/{checkoutId} -> 200', function (test, done) {
    test.request.params.checkoutId = checkout._id;
    done();
});

hooks.after('POST /checkouts -> 200', function (test, done) {
    checkout = test.response.body;
    done();
});

hooks.before('POST /checkouts -> 200', function (test, done) {
    test.request.body.orderId = randomstring.generate({
        length: 24,
        charset: 'hex'
    });
    test.request.body.pickup = pickup._id;
    done();
});

var confirm_checkout;
// seed an extra checkout for confirm
hooks.after('POST /checkouts -> 200', function (test, done) {
    test.request.body.orderId = randomstring.generate({
        length: 24,
        charset: 'hex'
    });
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            confirm_checkout = bod;
            done();
        }
    );
});

hooks.before('GET /checkouts/{checkoutId}/confirm -> 200', function (test, done) {
    test.request.params.checkoutId = confirm_checkout._id;
    done();
});

hooks.after('GET /checkouts/{checkoutId}/confirm -> 200', function (test, done) {
    _.each(test.response.body.items, function(item) {
        assert.equal(item.state,'reserved');
    });
    done();
});

var cancel_checkout;
// seed an extra checkout for cancel
hooks.after('POST /checkouts -> 200', function (test, done) {
    test.request.body.orderId = randomstring.generate({
        length: 24,
        charset: 'hex'
    });
    request.post(
        test.request.server + test.request.path,
        {form: test.request.body, json: true},
        function(err,res,bod) {
            cancel_checkout = bod;
            done();
        }
    );
});

hooks.before('GET /checkouts/{checkoutId}/cancel -> 200', function (test, done) {
    test.request.params.checkoutId = cancel_checkout._id;
    done();
});

hooks.after('GET /checkouts/{checkoutId}/cancel -> 200', function (test, done) {
    _.each(test.response.body.items, function(item) {
        assert.equal(item.state,'cancelled');
    });
    done();
});
