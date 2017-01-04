'use strict';

var hooks = require('hooks'),
    assert = require('assert');

var path = require('path');
var url = require('url');
var querystring = require('querystring');
var request = require('request');
var randomstring = require('randomstring');
var util = require('util');

var products = require(path.resolve('./depends/catalogue')).api.resources.products;
var suppliers = require(path.resolve('./depends/catalogue')).api.resources.suppliers;
var pickups = require(path.resolve('./depends/stock')).api.resources.pickups;

var dummyUser = { 
    _id: randomstring.generate({ length: 24, charset: 'hex' }),
    username: 'checkoutdummy',
    displayName: 'Checkout Dummy',
    email: 'checkout@dummy.com'
};

var pickup, product, supplier, product_to_cancel;

hooks.before('POST /checkout/{method} -> 200', function(test, done) {
    test.request.params.method = 'local-psp';
    
    pickups.post({
        description: 'Pickup description',
        location: '1234567890abcdef123456a1',
        start: '2016-10-28T12:00:00.000Z',
        end: '2016-10-28T16:00:00.000Z',
        state: 'open'
    })
    .then((res) => {
        assert.equal(res.status,200,'failed to create pickup: ' + res.body.message);
        pickup = res.body;
        return suppliers.post({
            name: 'foofactory'
        });
    })
    .then((res) => {
        assert.equal(res.status,200,'failed to create supplier: ' + res.body.message);
        supplier = res.body;
    })
    .then(() => {
        //create a product to order
        return products.post({
            name: 'foomania',
            supplierPrice: 13.41,
            supplier: supplier._id
        });
    })
    .then((res) => {
        assert.equal(res.status,200,'failed to create product: ' + res.body.message);
        product = res.body;
    })
    .then(() => {
        //create a product to order
        return products.post({
            name: 'cancelmania',
            supplierPrice: 16.01,
            supplier: supplier._id
        });
    })
    .then((res) => {
        assert.equal(res.status,200,'failed to create product to cancel: ' + res.body.message);
        product_to_cancel = res.body;
    })
    .then(() => {
        test.request.body.pickupId = pickup._id;
        test.request.body.items = [{
            _product: product._id, 
            price: product.price,
            name: product.descName,
            supplierId: product.supplier,
            total: 9, 
            quantity: 2 
        }];
        test.request.body.user = dummyUser;
        done();
    })
    .catch((err) => { console.error(err); done(); });
});

//{ redirect: 'http://localhost:3030/checkout/local-psp/580e719f6b3d1e0abb07e640/redirected?token=TOKEN&PayerID=localpayer' }
function parseRedirectUrl(redirectUrl) {
    var parsed = {};
    var redirect = url.parse(redirectUrl);
    var paths = redirect.pathname.split('/');
    parsed.method = paths[2];
    parsed.checkoutOrderId = paths[3];
    var query = querystring.parse(redirect.query);
    parsed.token = query.token;
    parsed.PayerID = query.PayerID;
    
    return parsed;
}

var checkout = {};

//{ redirect: 'http://localhost:3030/checkout/local-psp/580e719f6b3d1e0abb07e640/redirected?token=TOKEN&PayerID=localpayer' }
hooks.after('POST /checkout/{method} -> 200', function(test, done) {
    checkout = parseRedirectUrl(test.response.body.redirect);
    done();
});

hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/redirected -> 200', function(test,done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = checkout.checkoutOrderId;
    test.request.params.token = checkout.token;
    test.request.body = { token: checkout.token };
    done();
});

hooks.after('PUT /checkout/{method}/{checkoutOrderId}/{token}/redirected -> 200', function(test, done) {
    assert.equal(test.response.body.total,26.82);
    assert.equal(test.response.body.items[0].total,26.82);
    assert.equal(test.response.body.state,'gotdetails');
    done();
});

hooks.before('GET /checkout/{method}/{checkoutOrderId}/{token}/confirm -> 200', function(test, done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = checkout.checkoutOrderId;
    test.request.params.token = checkout.token;
    done();
});

hooks.after('GET /checkout/{method}/{checkoutOrderId}/{token}/confirm -> 200', function(test, done) {
    assert.equal(test.response.body.state,'confirmed');
    done();
});

hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/cancelled -> 400', function(test,done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = checkout.checkoutOrderId;
    test.request.params.token = checkout.token;
    done();
});

var checkoutOrderId_to_cancel;
hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/cancelled -> 200', function(test,done) {
    // create a new order to cancel
    request.post(
        test.request.server + '/checkout/local-psp', 
        {
            form: {
                state: 'new',
                items: [{ 
                    _product: product.id, 
                    price: product.price,
                    total: product.price, 
                    name: product.name,
                    quantity: 1
                }],
                total : product.price,
                user: dummyUser,
                orderType: 'customer',
                method: 'local-psp',
                pickupId: pickup._id 
            }, 
            json: true
        },
        function(err,res,bod) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            
            var redirect = parseRedirectUrl(res.body.redirect);
            test.request.params.checkoutOrderId = redirect.checkoutOrderId;
            checkoutOrderId_to_cancel = redirect.checkoutOrderId;
            test.request.params.token = redirect.token;
            test.request.params.method = redirect.method;
            
            done();
        }
    );
});

hooks.before('GET /orders/{orderId} -> 200', function(test,done) {
    test.request.params.orderId = checkout.checkoutOrderId;
    done();
});

hooks.before('DELETE /orders/{orderId} -> 200', function(test,done) {
    test.request.params.orderId = checkout.checkoutOrderId;
    done();
});

hooks.before('GET /orders/{orderId}/recalculate -> 200', function(test,done) {
    test.request.params.orderId = checkoutOrderId_to_cancel;
    done();
});

hooks.before('PUT /orders/{orderId}/recalculate -> 200', function(test,done) {
    test.request.params.orderId = checkoutOrderId_to_cancel;
    done();
});

hooks.before('GET /orders/history/{orderUserId} -> 200', function(test,done) {
    test.request.params.orderUserId = dummyUser._id;
    done();
});

hooks.after('GET /orders/history/{orderUserId} -> 200', function(test,done) {
    assert(test.response.body.length > 0);
    done();
});

var checkout_to_finalise;
hooks.after('POST /checkout/{method} -> 200', function(test, done) {
    test.request.body.items.push({
        _product: product_to_cancel.id, 
        price: product_to_cancel.price,
        total: product_to_cancel.price, 
        name: product_to_cancel.name,
        quantity: 1
    });

    request.post(
        test.request.server + '/checkout/local-psp',
        {form: test.request.body, json: true},
        function(err,res,bod) {
            checkout_to_finalise = parseRedirectUrl(bod.redirect);
            done();
        }
    );
});

hooks.after('PUT /checkout/{method}/{checkoutOrderId}/{token}/redirected -> 200', function(test,done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = checkout.checkoutOrderId;
    test.request.params.token = checkout.token;
    test.request.body = { token: checkout.token };
    
    request.put(
        test.request.server + util.format(
            '/checkout/%s/%s/%s/redirected', 
            checkout_to_finalise.method,
            checkout_to_finalise.checkoutOrderId,
            checkout_to_finalise.token
        ),
        {form: { token: checkout_to_finalise.token }, json: true},
        function(err,res,bod) {
            assert.equal(test.response.body.state,'gotdetails');
            done();
        }
    );
});

hooks.after('GET /checkout/{method}/{checkoutOrderId}/{token}/confirm -> 200', function(test, done) {    
    request.get(
        test.request.server + util.format(
            '/checkout/%s/%s/%s/confirm', 
            checkout_to_finalise.method,
            checkout_to_finalise.checkoutOrderId,
            checkout_to_finalise.token
        ),
        function(err,res,bod) {
            assert.equal(test.response.body.state,'confirmed');
            done();
        }
    );
});

hooks.before('PUT /orders/{orderId}/finalise -> 200', function(test,done) {
    test.request.params.orderId = checkout_to_finalise.checkoutOrderId;
    test.request.body = [{
        productId: product._id,
        quantity: 2,
        action: 'finalise'
    }, {
        productId: product_to_cancel._id,
        quantity: 1,
        action: 'cancel'
    }];
    done();
});

hooks.after('PUT /orders/{orderId}/finalise -> 200', function(test,done) {
    assert.equal(test.response.body.state, 'finalised');
    assert.equal(test.response.body.due, -16.01);
    done();
});

hooks.before('PUT /orders/{orderId}/finalise -> 400', function(test,done) {
    test.request.params.orderId = checkoutOrderId_to_cancel;
    done();
});

hooks.before('GET /checkout/{method}/{checkoutOrderId}/close -> 200', function(test,done) {
    test.request.params.checkoutOrderId = checkout_to_finalise.checkoutOrderId;
    test.request.params.method = checkout_to_finalise.method;
    done();
});

hooks.after('GET /checkout/{method}/{checkoutOrderId}/close -> 200', function(test,done) {
    assert.equal(test.response.body.state, 'closed');
    assert.equal(test.response.body.due, 0);
    assert.equal(test.response.body.items[1].state, 'refunded');
    done();
});
