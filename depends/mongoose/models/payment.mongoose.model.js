'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	_ = require('lodash');


var schemaVersion = 1;
var transactionStates = ['initial', 'info', 'details', 'confirmation', 'cancelled'];
var transactionParams = {
    log: { 
        type: [{ 
            name: { type: String, enum: transactionStates }, 
            date: { type: Date, default: Date.now },
            content: { type: Object }
        }],
        default: []
    }
};

_.forEach(transactionStates, function(state) {
    transactionParams[state] = { 
        type: Object, default: {} 
    };
});

var PaymentSchema = new Schema({
    orderId: { 
        type: Schema.Types.ObjectId,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    state: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactions: transactionParams,
    updated: {
		type: Date,
		default: Date.now
	},
	created: {
		type: Date,
		default: Date.now
	},
	schemaVersion: {
	    type: Number,
	    default: schemaVersion
	}
});

// set amount on payments with no amount set (old payments);
PaymentSchema.pre('init', function(next) {
    var payment = this;
    if (payment.schemaVersion === schemaVersion) { return next(); }
    
    try {
        // version 1 - amount field added
        if (!payment.schemaVersion) {
            payment.amount = payment.transactions.initial.transactions[0].amount.total;
            payment.schemaVersion = 1;
        }
    } catch (err) {
        return next(err);
    }
    
    payment.schemaVersion = schemaVersion;
    next();
});


// That's all wrong!
//PaymentSchema.virtual('amount').get(function() {
//    var payment = this;
//    return _.reduce(payment.transactions, (sum, transaction) => { return sum + transaction.amount.total; });
//});

PaymentSchema.virtual('paid').get(function() {
    var payment = this;
    if (payment.state === 'confirmation') {
        return payment.amount;
    }
    else {
        return 0;
    }
});

PaymentSchema.virtual('pending').get(function() {
    var payment = this;
    if (_.includes(['confirmation', 'cancelled'],payment.state)) {
        return 0;   
    }
    else {
        return payment.amount;
    }
});

PaymentSchema.set('toJSON', { getters: true });
PaymentSchema.set('toObject', { getters: true });

PaymentSchema.methods.recordTransaction = function(name, content, callback) {
    this.transactions[name] = content;
    this.transactions.log.push({ 'name': name });
    this.state = name;
    this.markModified('transactions');
    this.markModified('transactions.' + name);
    this.markModified('transactions.log');
    this.save(callback);
};

var Payment = mongoose.model('Payment', PaymentSchema);
//var PaymentTransactions = mongoose.model('PaymentTransactions', PaymentTransactionSchema);
