'use strict';

var _ = require('lodash');
var assert = require('assert');
var path = require('path');
var debug = require('debug')('depends:mongoose:orders');

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var productsApi = require(path.resolve('./depends/catalogue')).api.resources.products;

var OrderItemSchema = new Schema({
    _product: { type: Schema.Types.ObjectId, required: true },
    supplierId: { type: Schema.Types.ObjectId, required: true },
    price: { type: Number, required: true },
    cost: Number,
    vat: Number,
    margin: Number,
    totals: {
        price: { type: Number, required: true },
        cost: Number,
        vat: Number,
        margin: Number
    },
    name: { type: String, required: true },
    state: {
        type: String,
        enum: [
            'new', 'transmitted', 'reserved', 'finalised', 'refunded', 
            'cancelled'
        ],
        default: 'new'
    },
    code: String,
    quantity: {
        type: Number,
        min: 1,
        default: 1,
        required: true
    },
    lookedUp: {
        type: Date
    },
    updated: {
		type: Date,
		default: Date.now
	},
	created: {
		type: Date,
		default: Date.now
	},
});

OrderItemSchema.virtual('total').get(function () { return this.totals.price; });

OrderItemSchema.set('toJSON', { getters: true });
OrderItemSchema.set('toObject', { getters: true });
OrderItemSchema.set('timestamps', { updatedAt: 'updated', createdAt: 'created'});

/**
 * Order Schema
 */
var OrderSchema = new Schema({
	state: {
		type: String,
		enum: [
		    'new', 'submitted', 'redirected', 'gotdetails', 'paid', 
		    'confirmed', 'cancelled', 'deleted', 'finalised', 'closed'
		],
		required: true
	},
	items: [ OrderItemSchema ],
	totals: {
        price: { type: Number, required: true },
        cost: Number,
        vat: Number,
        margin: Number
    },
	calculated: {
	    type: Date,
	    default: Date.now
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
		required: true
	},
	stockCheckoutId: {
	    type: Schema.ObjectId
	},
	pickupId: {
	    type: Schema.ObjectId
	},
	schemaVersion: {
	    type: Number
	}
});

OrderSchema.set('toJSON', { getters: true });
OrderSchema.set('toObject', { getters: true });
OrderSchema.set('timestamps', { updatedAt: 'updated', createdAt: 'created'});

OrderSchema.methods.getPayment = function getPayment() {
    return this.payments[this.payments.length - 1];
};

OrderSchema.virtual('total').get(function () { return this.totals.price; });

OrderSchema.virtual('due').get(function () { return Number((this.total - this.paid).toFixed(2)); });

OrderSchema.virtual('paid').get(function () { 
    var order = this;
    
    if (!order.payments || order.payments.length === 0) { return 0; }
    
    return _.reduce(order.payments, (sum, payment) => { 
        if (typeof(payment) === 'object') {
            return sum + payment.paid;
        }
        else {
            throw new Error('cannot calculate paid on unpopulated payments');
        }
    },0);
});

OrderSchema.virtual('refund').get(function () {
    var order = this;

    if (!order.payments || order.payments.length === 0) { return 0; }
    
    return _.reduce(order.payments, (sum, payment) => { 
        if (typeof(payment) === 'object') {
            return sum + payment.refund;
        }
        else {
            throw new Error('cannot calculate paid on unpopulated payments');
        }
    },0);
});

OrderSchema.virtual('transactionFee').get(function () {
    var order = this;

    if (!order.payments || order.payments.length === 0) { return 0; }
    
    return _.reduce(order.payments, (sum, payment) => { 
        if (typeof(payment) === 'object') {
            return sum + payment.transactionFee;
        }
        else {
            throw new Error('cannot calculate paid on unpopulated payments');
        }
    },0);
});

function _calculate(order, products, lookedUp) {
    assert(typeof(order) === 'object', 'order should be an object');
    assert(typeof(products) === 'object', 'products lookup should be an object');
    
    var orderTotals = _(order.items)
        .map(function(item) {
            var product = products[item._product];
            if (product) {
                if (lookedUp) {
                    item.cost = product.supplierPrice;
                    item.price = product.price;
                    item.vat = product.vat;
                    item.margin = product.margin;
                    item.name = product.descName;
                    item.code = product.supplierCode;
                    item.supplierId = product.supplier;
                }
                
                item.vat = item.vat || 0;
                item.price = item.price || 0;
                item.margin = item.margin || 0;
                item.cost = item.cost || 0;
                
                if (_.includes(['cancelled', 'refunded'],item.state)) {
                    item.totals = { price: 0, vat: 0, cost: 0, margin: 0 };
                }
                else {
                    item.totals = {
                        price: item.price * item.quantity,
                        vat: item.vat * item.quantity,
                        cost: item.cost * item.quantity,
                        margin: item.margin * item.quantity,
                    };
                }
            }
            else {
                throw new Error('unable to validate item: ', item._product);
            }
            
            if (lookedUp) {
                item.lookedUp = lookedUp;
            }
            
            return item.totals;
        })
        .reduce(function(totals,subtots) {
            return _.transform(totals, (result, value, key) => {
                result[key] = value + subtots[key];
            }, {});
        }, { price: 0, vat: 0, cost: 0, margin: 0 });
    
    // Make sure we get a number to at most 2dp
    var finalTotals = _.transform(orderTotals, (result, value, key) => {
        result[key] = Number(value.toFixed(2));    
    }, {});
    
    order.totals = finalTotals;
    order.calculated = Date.now();

    return finalTotals;
}

OrderSchema.methods.calculateWithoutLookup = function () {
    var order = this;
    var products = _.keyBy(order.items,'_product');
    
    return _calculate(order, products);
};

OrderSchema.methods.calculate = function calculate() {
    var order = this;

    var ids = _(order.items)
        .map('_product')
        .valueOf();

    debug('Calculating order items: ' + ids);
    if (ids.length === 0) { throw new Error('No order items Found'); }

    // Essentially we are populating from the catalogue api
    return productsApi.put(ids).then(function(res) {
        assert.equal(res.status,200,'Catalogue look up failed: ' + res.body.message);
        
        debug(res.body);

        var products = _.keyBy(res.body,'_id');
        
        return _calculate(order, products, Date.now());
    });
};

// Order total is always validated
OrderSchema.pre('validate', function(next) {
    var order = this;

    if (order.isNew) {
        order
            .calculate()
            .then(() => { next(); })
            .catch((err) => { next(err); });
    }
    else if (order.isModified('items')) {
        try {
            order.calculateWithoutLookup();
            next();
        }
        catch (err) {
            console.error('Item calculation: ',err);
            next(err); 
        }
    }
    else {
        next();
    }

});

var schemaVersion = 1;
OrderSchema.post('init', function() {
    var order = this;
    
    if (order.schemaVersion === schemaVersion) { return; }
    
    var version = order.schemaVersion || 0;
    try {
        switch(version) {
            case 0:
                if (!order.totals) {
                    // calculate totals for older orders
                    var products = _.keyBy(order.items,'_product');
                    _calculate(order, products);
                }
                if (!order.user) {
                    order.user = '1a1a1a1a1a1a1a1a1a1a0000';
                }
                /* falls through */
            default:
                if (order.schemaVersion !== schemaVersion) {
                    order.schemaVersion = schemaVersion;
                }
        }
    } catch (err) {
        console.error(err);
        throw new Error('OrderSchema Update Error: ' + err.message);
    }

});

OrderSchema.pre('save', function(next) {
    var doc = this;
    
    // Set the schemaVersion for new documents only, init takes care of the rest
    if (doc.isNew) {
        doc.schemaVersion = schemaVersion;
    }
    
    next();
});

var Order = mongoose.model('Order', OrderSchema);
var OrderItem = mongoose.model('OrderItem', OrderItemSchema);
