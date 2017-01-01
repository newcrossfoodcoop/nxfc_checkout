'use strict';

var path = require('path'), 
    _config = require('config'),
    util = require('util'),
    paypal = require('paypal-rest-sdk'),
    url = require('url'),
    _ = require('lodash');

var defer = require('config/defer').deferConfig;

var lib = require(path.resolve('./lib/config'));

var myDefaultConfigs = {
    active: false,
    name: 'paypal-rest-sandbox',
    plugin: 'paypal-rest',
    mode: 'sandbox',
    clientID: 'PAYPAL_REST_CLIENTID',
    clientSecret: 'PAYPAL_REST_CLIENTSECRET',
    returnUrl : defer(function() {
        return url.resolve(this.externalHref, '/checkout/' + this.name + '/%s/redirected');
    }),
    cancelUrl : defer(function() {
        return url.resolve(this.externalHref, '/checkout/' + this.name + '/%s/cancelled');
    }),
    buttonImageUrl: 'https://www.paypal.com/en_GB/GB/i/btn/btn_xpressCheckout.gif',
    env: {
        clientID: 'PAYPAL_REST_CLIENTID',
        clientSecret: 'PAYPAL_REST_CLIENTSECRET'
    }
};

lib.processConfig({
    module: 'psp-paypal-rest',
    defaultConfig: myDefaultConfigs
});

module.exports = function() {
    var config = _config.depends['psp-paypal-rest'];

    paypal.configure({
      'mode': config.mode,
      'client_id': config.clientID,
      'client_secret': config.clientSecret
    });

    exports.cfg = config;

    exports.initiatePayment = function initiatePayment(order, callback) {

        var params = {
            'intent': 'sale',
            'payer': {
                'payment_method': 'paypal',
            },
            'transactions': [{
                'amount': {
                    'total': order.due,
                    'currency': 'GBP',
                },
                'description': 'Payment for goods from website' }
            ],
            'redirect_urls': {
                return_url: util.format(config.returnUrl, order._id),
                cancel_url: util.format(config.cancelUrl, order._id),
            }
        };
        
        paypal.payment.create(params, callback);
    };

    exports.approvalRedirectUrl = function approvalRedirectUrl(order) {
        var link = _.find(order.getPayment().transactions.initial.links, { rel: 'approval_url' });
        return link.href;
    };

    exports.rejectToken = function rejectToken(order,req,token) {
        var link = _.find(order.getPayment().transactions.initial.links, { rel: 'approval_url' });
        var urlObj = url.parse(link.href, true);
        return urlObj.query.token !== token;
    };

    exports.getPaymentDetails = function getPaymentDetails(order,callback) {
        var paypalPaymentId = order.getPayment().transactions.initial.id;
        paypal.payment.get(paypalPaymentId,callback);
    };

    exports.capturePayment = function capturePayment(order,callback) {
        var payment = order.getPayment();
        var paypalPaymentId = payment.transactions.initial.id;
        paypal.payment.execute(paypalPaymentId, {payer_id: payment.transactions.info.PayerID}, callback);
    };

    //TODO 
    exports.populatePaymentsArgs = function poplulatePaymentsArgs(req,token) {
        return 'payments';
    };

    return exports;
};

