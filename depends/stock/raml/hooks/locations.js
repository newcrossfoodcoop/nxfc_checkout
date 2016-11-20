'use strict';

var hooks = require('hooks'),
    assert = require('assert');

var location;

hooks.before('GET /locations/{locationId} -> 200', function (test, done) {
    test.request.params.locationId = location._id;
    done();
});

hooks.after('POST /locations -> 200', function (test, done) {
    location = test.response.body;
    done();
});
