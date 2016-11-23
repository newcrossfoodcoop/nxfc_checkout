'use strict';

var util = require('util'),
    mongoose = require('mongoose'),
    Payment = mongoose.model('Payment'),
    Order = mongoose.model('Order'),
    async = require('async'),
    _ = require('lodash');

var thenify = require('thenify');    
var path = require('path');
var config = require('config');
var assert = require('assert');

var debug = require('debug')('provides:express:checkout');

var plugins = {
    'local-psp': require(path.resolve('./depends/psp-local'))(),
    'paypal-rest': require(path.resolve('./depends/psp-paypal-rest'))()
};

var stockCheckoutsApi = require(path.resolve('./depends/stock')).api.resources.checkouts;

function getSubController(method) {
    if (plugins[method]) return plugins[method];
    throw new Error('unrecognised method: ' + method);
}

function getActive() {
    return _(plugins)
        .values()
        .map(function(psp) {
            return {
                name: psp.cfg.name,
                buttonImageUrl: psp.cfg.buttonImageUrl,
                active: psp.cfg.active
            };
        })
        .filter('active')
        .valueOf();
}

exports.start = function(req, res) {
    
    var order = new Order(req.body);
    order.user = req.user = req.body.user;
    
    debug(order);

    // orders can only be created in the new state and modifications are
    // managed through contoller methods (no bare updates)
    order.state = 'new'; 

    var subController = getSubController(req.params.method);
    
    order
        .save()
        .then(() => {
            debug('Reserving stock');
            
            var items = _.map(order.items, (item) => {
                return {
                    price: item.price,
                    cost: item.cost,
                    quantity: item.quantity,
                    productId: item._product,
                    supplierId: item.supplierId,
                    name: item.name
                };
            });
            
            return stockCheckoutsApi.post({
                orderId: order._id,
                pickup: order.pickupId,
                items: items
            });
        })
        .then((res) => {
            assert.equal(res.status,200,res.body);
            order.stockCheckoutId = res.body._id;
            return order.save();
        })
        .then(() => {
            debug('Initiating payment');
            return thenify(subController.initiatePayment)(order);
        })
        .then((data) => {
            debug('Recording transaction');
            var payment = new Payment({ 
                user: req.user,
                method: req.body.method
            });
            order.payments.push(payment);
            payment.orderId = order._id;
            
            return new Promise((resolve,reject) => { 
                payment.recordTransaction('initial', data, (err) => {
                    if (err) { reject(err); }
                    else { resolve(); }
                }); 
            });
        })
        .then((payment) => {
            order.state = 'submitted';
            return order.save();
        })
        .then((doc) => {
            return doc.populate('payments');
        })
        .then((doc) => {
            res.jsonp({ redirect: subController.approvalRedirectUrl(order) });
        })
        .catch((err) => {
            console.error(err);
            return res.status(400).send('A checkout error has occured');
        });
    
//    async.waterfall([
//        function saveOrder(callback) {
//            order.save(callback);
//        },
//        function initiatePayment(_order,n,callback) {
//            order = _order;
//        },
//        function reserveStock(callback) {
//            debug('Reserving stock');
//            stockCheckoutsApi
//                .post({
//                    orderId: order._id;
//                })
//                .then((res) => {
//                    debug(res.body);
//                });
//        },
//        function saveOrder(callback) {
//            order.save(callback);
//        },
//        function initiatePayment(_order,n,callback) {
//            order = _order;
//            subController.initiatePayment(order, callback);
//        },
//        function recordPayment(data, callback){
//            var payment = new Payment({ 
//                user: req.user,
//                method: req.body.method
//            });
//            order.payments.push(payment);
//            payment.orderId = order._id;
//            payment.recordTransaction('initial', data, callback);
//        },
//        function setOrderState(payment,n,callback) {
//            order.state = 'submitted';
//            order.save(callback);
//        },
//        function populatePayments(order,n,callback) {
//            order.populate('payments',callback);
//        }
//    ],
//    function(err,order) {
//        if (err) {
//            console.error(err);
//            return res.status(400).send(err);
//        }
//        res.jsonp({ redirect: subController.approvalRedirectUrl(order) });
//    });
};

function checkState(order, thisState, prevState, callback) {
    var prevStates = typeof prevState === 'object' ? prevState : [prevState];
    
    if (order.state === thisState) {
        callback(new Error('no state change'),order);
    }
    else if (!_.intersection([order.state], prevStates).length) {
        callback(new Error(util.format(
            'invalid state transition %s -> %s', order.state, thisState
        )));
    }
    else {
        callback();
    }
}

exports.redirected = function(req, res) {
    var order = req.order ;
    
    var subController = getSubController(req.params.method);
    
    async.waterfall([
        function(callback) {
            checkState(order,'gotdetails',['submitted','redirected'],callback);
        },
        function(callback) {
            var payment = order.getPayment();
            payment.recordTransaction('info', req.body);
            payment.save(callback);
        },
        function(_payment,n,callback) {
            order.state = 'redirected';
            order.save(callback);
        },
        function(_order,n,callback) {
            order = _order;
            subController.getPaymentDetails(order,callback);
        },
        function(data, callback) {
            order.getPayment().recordTransaction('details', data, callback);
        },
        function(_payment,n,callback) {
            order.state = 'gotdetails';
            order.save(callback);
        }
    ],
    function(err,result) {
        if (err) { console.error(err); }
        if (result) { return res.jsonp(result); }
        return res.send(400, err);
    });
};

exports.confirm = function(req, res) {
    var order = req.order;

    var subController = getSubController(req.params.method);

    async.waterfall([
        function(callback) {
            checkState(order,'confirmed','gotdetails',callback);
        },
        function(callback) {
            subController.capturePayment(order,callback);
            console.log('capturePayment started');
        },
        function(data,callback) {
            order.getPayment().recordTransaction('confirmation',data,callback);
            console.log('record transaction started');
        },
        function(_payment,n,callback) {
            stockCheckoutsApi.checkoutId(order.stockCheckoutId).get()
                .then((stockCheckout) => { callback(null, stockCheckout); })
                .catch((err) => { callback(err); });
        },
        function(stockCheckout,callback) {
            order.state = 'confirmed';
            order.save(callback);
            console.log('order save started');
        }
    ],
    function(err,result) {
        if (err) { console.error(err); }
        if (result) { return res.jsonp(result); }
        return res.send(400, err);
    });
};

exports.cancelled = function(req, res) {
    var order = req.order ;
    
    async.waterfall([
        function(callback) {
            checkState(order,'cancelled','submitted',callback);
        },
        function(callback) {
            order.getPayment().recordTransaction(
                'cancelled',
                { date: Date.now, token: req.body.token },
                callback
            );
        },
        function(_payment,n,callback) {
            order.state = 'cancelled';
            order.save(callback);
        }
    ],
    function(err,result) {
        if (err) { console.error(err); }
        if (result) { return res.jsonp(result); }
        return res.status(400).jsonp(err);
    });
};

exports.orderByID = function(req, res, next, id) {
    var subController = getSubController(req.params.method);
    var populateArgs = subController.populatePaymentsArgs(req, req.params.token);
    if (! populateArgs) return next(new Error('populateArgs not set'));
    Order
        .findById(id)
        .where({state: { $ne: 'deleted' }})
        //.populate('user', 'displayName')
        .populate(populateArgs)
        .exec(function(err, order) {
	        if (err) return next(err);
	        if (! order) return next(new Error('Failed to load Order ' + id));
	        if (subController.rejectToken(order,req,req.params.token)) return next(new Error('token mismatch'));
	        req.order = order;
	        next();
        });
};

exports.config = function(req, res, next) {
    res.jsonp({
        active: getActive()
    });
};   

