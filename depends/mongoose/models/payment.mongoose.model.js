'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	_ = require('lodash');

var transactionStates = ['initial', 'info', 'details', 'confirmation', 'cancelled', 'refund'];
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
    refund: {
        type: Number,
        default: 0
    },
    transactionFee: {
        type: Number,
        default: 0
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
	    type: Number
	}
},{ 
    timestamps: { updatedAt: 'updated', createdAt: 'created' }
});

// TODO: Really need to have a sub(class/models) of the payment object per psp to extra
// useful data from the psp responses

var schemaVersion = 3;
PaymentSchema.post('init', function() {
    var payment = this;
    
    if (payment.schemaVersion === schemaVersion) { return; }
    
    var version = payment.schemaVersion || 0;
    try {
        switch(version) {
            case 0:
                // set amount on payments with no amount set (old payments);
                payment.amount = payment.transactions.initial.transactions[0].amount.total;
                /* falls through */
            case 2:
                try {
                    payment.transactionFee = payment.transactions.confirmation.transactions[0].related_resources[0].sale.transaction_fee.value;
                }
                catch(err) {
                    console.error('PaymentSchema update skipped error: ' + err.message);
                }
                /* falls through */
            default:
                if (payment.schemaVersion !== schemaVersion) {
                    payment.schemaVersion = schemaVersion;
                }
        }
    } catch (err) {
        console.error(err);
        throw new Error('PaymentSchema Update Error: ' + err.message);
    }
    
});

PaymentSchema.pre('save', function(next) {
    var payment = this;
    
    // Set the schemaVersion for new documents only, init takes care of the rest
    if (payment.isNew) {
        payment.schemaVersion = schemaVersion;
    }
    
    next();
});

PaymentSchema.virtual('paid').get(function() {
    var payment = this;
    switch(payment.state) {
        case 'confirmation':
            return payment.amount;
        case 'refund':
            return Number((payment.amount - payment.refund).toFixed(2));
        default:
            return 0;
    }
});

PaymentSchema.virtual('pending').get(function() {
    var payment = this;
    if (_.includes(['confirmation', 'cancelled', 'refund'],payment.state)) {
        return 0;   
    }
    else {
        return payment.amount;
    }
});

PaymentSchema.set('toJSON', { getters: true });
PaymentSchema.set('toObject', { getters: true });

PaymentSchema.methods.recordTransaction = function(name, content, callback) {
    var payment = this;

    payment.transactions[name] = content;
    payment.transactions.log.push({ 'name': name });
    payment.state = name;
    
    payment.markModified('transactions');
    payment.markModified('transactions.' + name);
    payment.markModified('transactions.log');
    
    payment.save(callback);
};

var Payment = mongoose.model('Payment', PaymentSchema);
//var PaymentTransactions = mongoose.model('PaymentTransactions', PaymentTransactionSchema);
