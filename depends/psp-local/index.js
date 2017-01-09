'use strict';

var path = require('path'), 
    util = require('util'),
    url = require('url'),
    _ = require('lodash');
var assert = require('assert');
    
var defer = require('config/defer').deferConfig;
var _config = require('config');

var lib = require(path.resolve('./lib/config'));

var myDefaultConfigs = {
    active: true,
    name: 'local-psp',
    plugin: 'localPSP',
    returnUrl : defer(function() {
        return url.resolve(this.externalHref, '/checkout/local-psp/%s/redirected');
    })
};

lib.processConfig({
    module: 'psp-local',
    defaultConfig: myDefaultConfigs
});

var mongoose = require('mongoose'),
	LocalPSP = mongoose.model('LocalPSP');

module.exports = function() {

    var config = _config.depends['psp-local'];
    
    exports.cfg = config;

    exports.initiatePayment = function initiatePayment(order, callback) {

        var params = {
            'intent': 'sale',
            'payer': {
                'payment_method': 'localPSP',
            },
            'transactions': [{
                'amount': {
                    'total': order.due,
                    'currency': 'GBP',
                },
                'description': 'This is the payment transaction description.' }
            ],
            'redirect_urls': {
                return_url: util.format(config.returnUrl, order._id),
                cancel_url: util.format(config.cancelUrl, order._id),
            }
        };
        
        LocalPSP.create(params, callback);
    };

    exports.approvalRedirectUrl = function approvalRedirectUrl(order) {
        assert.ok(order.getPayment().transactions.initial);
        return util.format(config.returnUrl, order._id) + '?token=TOKEN&PayerID=localpayer';
    };

    exports.rejectToken = function rejectToken(order,req,token) {
        return 'TOKEN' !== token;
    };

    exports.getPaymentDetails = function getPaymentDetails(order,callback) {
        var paymentId = order.getPayment().transactions.initial.id;
        LocalPSP.findById(paymentId).exec(callback);
    };

    exports.capturePayment = function capturePayment(order,callback) {
        var payment = order.getPayment();
        var paymentId = payment.transactions.initial._id;
        
        LocalPSP.findById(paymentId).exec(function(err,pspRecord) {
            if (err) return callback(err);
            if (pspRecord.state !== 'initial') return callback(new Error('not in initial state'));
            pspRecord.state = 'done';
            pspRecord.save(function(_err){
                callback(_err,pspRecord);
            });
        });
    };
    
    exports.refund = function refund(order, amount, callback) {
        var payment = order.getPayment();
        var paymentId = payment.transactions.initial._id;
        
        LocalPSP
            .findById(paymentId)
            .exec()
            .then((pspRecord) => {
                var saleAmount = pspRecord.transactions[0].amount.total;
                if (amount > saleAmount) {
                    throw new Error('Refund too large for this sale');
                }
                
                payment.refund = amount;
                pspRecord.transactions.push({
                    description: 'This is a refund',
                    amount: { total: amount * -1 }}
                );
                pspRecord.state = 'refund';
                return pspRecord.save();
            })
            .then((doc) => { callback(null,doc); })
            .catch((err) => { callback(err); });
    };

    //TODO 
    exports.populatePaymentsArgs = function poplulatePaymentsArgs(req,token) {
        return 'payments';
    };

    return exports;
};

