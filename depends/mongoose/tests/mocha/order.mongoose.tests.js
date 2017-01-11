'use strict';

var randomstring = require('randomstring');
var should = require('should');
var mongoose = require('mongoose');
var rewire = require('rewire');
var _ = require('lodash');

/**
 * Module dependencies.
 */
 
var orderModel = rewire('../../models/order.mongoose.model');

orderModel.__set__({ 
    productsApi: {
        put: (ids) => {
            var counter = 0;
            var items = _.map(ids,(id) => {
                counter++;
                return { 
                    _id: id,
                    supplier: randomstring.generate({ length: 24, charset: 'hex' }),
                    supplierPrice: counter + 10,
                    margin: counter * 0.1,
                    price: counter + 10 + 3,
                    descName: 'Product Name'
                }; 
            });
            return Promise.resolve({ status: 200, body: items });
        }
    }
});

var	Order = mongoose.model('Order');

/**
 * Globals
 */
var order;

/**
 * Unit tests
 */
describe('Order Model Unit Tests:', () => {
	beforeEach((done) => {
		order = new Order({
		    user: randomstring.generate({ length: 24, charset: 'hex' }),
		    state: 'new',
		    items: [
		        { _product: randomstring.generate({ length: 24, charset: 'hex' }), price: 1 },
		        { _product: randomstring.generate({ length: 24, charset: 'hex' }), price: 2 },
		        { _product: randomstring.generate({ length: 24, charset: 'hex' }), price: 3 }
		    ]
		});

		done();
	});

	describe('Validate', () => {
		it('should be able to validate', (done) => {
			order.validate((err) => {
			    should.not.exist(err);
			    done();
			});
		});

		it('should return an error', (done) => {
		    order.state = '';
			order.validate((err) => {
			    should.exist(err);
			    done();
			});
		});
	});

    describe('Calculate', () => {
        it('should be able to calculate totals', () => {
            return order.calculate().then((totals) => {
                totals.should.be.deepEqual({
                    price: 45, vat: 0, cost: 36, margin: 0.6
                });
            });
        });
        
        it('should be able to cancel a product', () => {
            order.items[0].state = 'cancelled';
            return order.calculate().then((totals) => {
                totals.should.be.deepEqual({
                    price: 31, vat: 0, cost: 25, margin: 0.5
                });
            });
        });
    });
    
    describe('Init', () => {
        it('should be able to set schemaVersion', () => {
            return order.init(order.toObject())
                .then(() => {
                    order.totals.should.be.type('object');
                })
                .then(() => {
                    // Expect to update the value on schemaVersion change                
                    order.schemaVersion.should.equal(1);
                });
        });
    });

	afterEach((done) => { 
	    Order.remove().exec();

		done();
	});
});
