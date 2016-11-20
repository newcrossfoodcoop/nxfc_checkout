'use strict';

var _ = require('lodash');

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var debug = require('debug')('depends:mongoose:orders');
	
var path = require('path');
var productsApi = require(path.resolve('./depends/catalogue')).api.resources.products;

var OrderItemSchema = new Schema({
    _product: { type: Schema.Types.ObjectId, required: true },
    supplierId: { type: Schema.Types.ObjectId, required: true },
    price: Number,
    total: Number,
    name: String,
    quantity: {
        type: Number,
        min: 1,
        default: 1,
        required: true
    },
    validated: Boolean,
    updated: {
		type: Date,
		default: Date.now
	},
	created: {
		type: Date,
		default: Date.now
	},
});

OrderItemSchema.pre('save', function(next) {
    var item = this;
    item.total = item.price * item.quantity;
    next();
});

/**
 * Order Schema
 */
var OrderSchema = new Schema({
	state: {
		type: String,
		enum: ['new', 'submitted', 'redirected', 'gotdetails','confirmed', 'cancelled', 'deleted'],
		required: true
	},
	items: [ OrderItemSchema ],
	total: {
	    type: Number,
	    min: 0
	},
	updated: {
		type: Date,
		default: Date.now
	},
	created: {
		type: Date,
		default: Date.now
	},
	payments: [{
	    type: Schema.ObjectId,
	    ref: 'Payment'
	}],
	user: {
		type: Schema.ObjectId,
		ref: 'User',
		required: true
	},
	stockCheckoutId: {
	    type: Schema.ObjectId
	},
	pickupId: {
	    type: Schema.ObjectId
	}
});

OrderSchema.methods.getPayment = function getPayment() {
    return this.payments[0];
};

var Order = mongoose.model('Order', OrderSchema);
var OrderItem = mongoose.model('OrderItem', OrderItemSchema);

// Order total is always validated
OrderSchema.pre('validate', function(next) {
    var order = this;

    // Only validate items that haven't been checked yet
    var ids = _(order.items)
        .reject('validated')
        .map('_product')
        .valueOf();

    debug('validating order items: ' + ids);
    if (ids.length === 0) { return next(); }

    // Essentially we are populating from the catalogue api
    productsApi.put(ids).then(function(res) {
        debug(res.body);

        var products = _.keyBy(res.body,'_id');
        order.total = _(order.items)
            .map(function(item) {
                var product = products[item._product];
                if (product) {
                    item.cost = product.supplierPrice;
                    item.price = product.price;
                    item.name = product.name;
                    item.price = (item.price ? item.price : 0);
                    item.total = item.price * item.quantity;
                    item.validated = true;
                    item.supplierId = product.supplier;
                }
                if (!item.validated) {
                    throw new Error('unable to validate item: ', item._product);
                }
                return item.total;
            })
            .reduce(function(total,subtot) { return total + subtot; },0);
        
        next();
    }).catch(function(err) {
        next(err);
    });

});
