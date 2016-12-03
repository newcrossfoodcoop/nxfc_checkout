'use strict';

var hooks = require('hooks'),
    assert = require('assert');

var path = require('path');
var url = require('url');
var querystring = require('querystring');
var request = require('request');

var products = require(path.resolve('./depends/catalogue')).api.resources.products;
var suppliers = require(path.resolve('./depends/catalogue')).api.resources.suppliers;
var pickups = require(path.resolve('./depends/stock')).api.resources.pickups;

var store = {
    user: {
        _id: '57c4b1ba1abb0114001963c5',
        username: 'checkoutdummy',
        displayName: 'Checkout Dummy',
        email: 'checkout@dummy.com'
    }
};

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
        store.pickup = res.body;
        return suppliers.post({
            name: 'foofactory'
        });
    })
    .then((res) => {
        assert.equal(res.status,200,'failed to create supplier: ' + res.body.message);
        //create a product to order
        return products.post({
            name: 'foomania',
            supplierPrice: 13.41,
            supplier: res.body._id
        });
    })
    .then(function(res) {
        assert.equal(res.status,200,'failed to create product: ' + res.body.message);
        store.product = res.body;
        test.request.body.pickupId = store.pickup._id;
        test.request.body.items = [{
            _product: res.body._id, 
            price: res.body.price, 
            total: 9, 
            quantity: 2 
        }];
        test.request.body.user = store.user;
        done();
    })
    .catch((err) => { console.error(err); done(); });
});

//{ redirect: 'http://localhost:3030/checkout/local-psp/580e719f6b3d1e0abb07e640/redirected?token=TOKEN&PayerID=localpayer' }
hooks.after('POST /checkout/{method} -> 200', function(test, done) {
    var redirect = url.parse(test.response.body.redirect);
    var paths = redirect.pathname.split('/');
    store.method = paths[2];
    store.checkoutOrderId = paths[3];
    var query = querystring.parse(redirect.query);
    store.token = query.token;
    store.PayerID = query.PayerID;
    done();
});

hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/redirected -> 200', function(test,done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = store.checkoutOrderId;
    test.request.params.token = store.token;
    test.request.body = { token: store.token };
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
    test.request.params.checkoutOrderId = store.checkoutOrderId;
    test.request.params.token = store.token;
    done();
});

hooks.after('GET /checkout/{method}/{checkoutOrderId}/{token}/confirm -> 200', function(test, done) {
    assert.equal(test.response.body.state,'confirmed');
    done();
});

hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/cancelled -> 400', function(test,done) {
    test.request.params.method = 'local-psp';
    test.request.params.checkoutOrderId = store.checkoutOrderId;
    test.request.params.token = store.token;
    done();
});

hooks.before('PUT /checkout/{method}/{checkoutOrderId}/{token}/cancelled -> 200', function(test,done) {
    // create a new order to cancel
    request.post(
        test.request.server + '/checkout/local-psp', 
        {
            form: {
                state: 'new',
                items: [{ 
                    _product: store.product.id, 
                    price: store.product.price,
                    total: store.product.price, 
                    name: store.product.name,
                    quantity: 1
                }],
                total : store.product.price,
                user: store.user,
                orderType: 'customer',
                method: 'local-psp',
                pickupId: store.pickup._id 
            }, 
            json: true
        },
        function(err,res,bod) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            
            var redirect = url.parse(res.body.redirect);
            var paths = redirect.pathname.split('/');
            test.request.params.checkoutOrderId = paths[3];
            var query = querystring.parse(redirect.query);
            test.request.params.token = query.token;
            test.request.params.method = 'local-psp';
            done();
        }
    );
});

hooks.before('GET /orders/{orderId} -> 200', function(test,done) {
    test.request.params.orderId = store.checkoutOrderId;
    done();
});

hooks.before('DELETE /orders/{orderId} -> 200', function(test,done) {
    test.request.params.orderId = store.checkoutOrderId;
    done();
});
