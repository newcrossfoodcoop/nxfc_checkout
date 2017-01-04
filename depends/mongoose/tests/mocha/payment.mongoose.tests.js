'use strict';

var randomstring = require('randomstring');
var should = require('should');
var mongoose = require('mongoose');
var _ = require('lodash');

/**
 * Module dependencies.
 */
 
var paymentModel = require('../../models/payment.mongoose.model');

var	Payment = mongoose.model('Payment');

/**
 * Globals
 */
var payment;

/**
 * Unit tests
 */
describe('Payment Model Unit Tests:', () => {
	beforeEach((done) => {
		payment = new Payment({
		    orderId: randomstring.generate({ length: 24, charset: 'hex' }),
		    state: 'confirmation',
		    method: 'test',
		    amount: 1.03,
		    transactions: {
		        initial: {
		            transactions: [{
		                amount: {
		                    total: 1.03
		                }
		            }]
		        }
		    }
        });

		done();
	});

	describe('Validate', () => {
		it('should be able to validate', (done) => {
			payment.validate((err) => {
			    should.not.exist(err);
			    done();
			});
		});

		it('should return an error', (done) => {
		    payment.state = '';
			payment.validate((err) => {
			    should.exist(err);
			    done();
			});
		});
	});

    describe('virtuals', () => {
        it('payment.paid should be equal to amount when confirmed', () => {
            payment.paid.should.equal(1.03);
            payment.amount.should.equal(1.03);
            payment.pending.should.equal(0);
        });
        
        it('payment.paid should be equal to 0 when not confirmed', () => {
            payment.state = 'somethingelse';
            payment.paid.should.equal(0);
            payment.amount.should.equal(1.03);
            payment.pending.should.equal(1.03);
        });
        
        it('payment.pending should be equal to 0 when cancelled', () => {
            payment.state = 'cancelled';
            payment.paid.should.equal(0);
            payment.amount.should.equal(1.03);
            payment.pending.should.equal(0);
        });
        
        it('payment.pending should be equal to 0 when refunded', () => {
            payment.state = 'refund';
            payment.refund = 0.50;
            payment.paid.should.equal(0.53);
            payment.amount.should.equal(1.03);
            payment.pending.should.equal(0);
        });
    });

	afterEach((done) => { 
	    Payment.remove().exec();

		done();
	});
});
