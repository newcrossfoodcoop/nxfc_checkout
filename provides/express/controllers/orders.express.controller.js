'use strict';

/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var assert = require('assert');
var _ = require('lodash');

var	Order = mongoose.model('Order'),
	Payment = mongoose.model('Payment');

/**
 * Get the error message from error object
 */
var getErrorMessage = function(err) {
	var message = '';

	if (err.code) {
		switch (err.code) {
			case 11000:
			case 11001:
				message = 'Order already exists';
				break;
			default:
				message = 'Something went wrong';
		}
	} 
	else if (err.errors) {
		for (var errName in err.errors) {
			if (err.errors[errName].message) { message = err.errors[errName].message; }
		}
	}
	else {
	    console.error(err.message);
	    message = 'Internal Error';
	}

	return message;
};

/**
 * Create a Order
 */
//exports.create = function(req, res) {
//	var order = new Order(req.body);
//	order.user = req.user;
//	
//	// orders can only be created in the new state and modifications are
//	// managed through contoller methods (no bare updates)
//    order.state = 'new'; 

//	order.save(function(err) {
//		if (err) {
//			return res.send(400, {
//				message: getErrorMessage(err)
//			});
//		} else {
//			res.jsonp(order);
//		}
//	});
//};

/**
 * Show the current Order
 */
exports.read = function(req, res) {
	res.jsonp(req.order);
};

/**
 * Delete an Order (don't actually delete it though)
 */
exports.delete = function(req, res) {
	var order = req.order ;

    order.state = 'deleted';
	order.save(function(err) {
		if (err) {
			return res.send(400, {
				message: getErrorMessage(err)
			});
		} else {
			res.jsonp(order);
		}
	});
};

/**
 * List of Orders (not deleted ones)
 */
exports.list = function(req, res) {
    Order.find({state: { $ne: 'deleted' }}).sort('-created')
        //.populate('user', 'displayName')
        .exec(function(err, orders) {
		    if (err) {
			    return res.send(400, {
				    message: getErrorMessage(err)
			    });
		    } else {
			    res.jsonp(orders);
		    }
	    });
};

exports.history = function(req, res, next) {
    var orders = req.orders;
    res.jsonp(_.map(orders,(order) => { return _.omit(order.toObject(),'payments'); }));
};

exports.recalculate = function(req, res) {
    var order = req.order;
    
    order.calculateWithoutLookup();
    order
        .save()
        .then(() => { res.jsonp(order); })
        .catch((err) => { res.status(400).send({message: getErrorMessage(err) }); });
};

exports.recalculateWithLookup = function(req, res) {
    var order = req.order;
    
    order
        .calculate()
        .then(() => { return order.save(); })
        .then(() => { res.jsonp(order); })
        .catch((err) => { res.status(400).send({message: getErrorMessage(err) }); });
};

exports.finalise = function(req, res) {
    var order = req.order;
    
    Promise.resolve()
        .then(() => { 
            assert.equal(order.state, 'confirmed', 'Can only finalised confirmed orders'); 
        })
        .then(() => {
            var items = req.body;
        
            // Process each action
            _.forEach(items, (item) => {
                var orderItem = _.find(order.items, (oi) => { return oi._product.toString() === item.productId; } );
                assert.ok(orderItem, 'order item not found: ' + item.productId);
                assert.equal(orderItem.quantity, item.quantity, item.productId + 'quantity mismatch');
                switch(item.action) {
                    case 'cancel':
                        orderItem.state = 'cancelled';
                        break;
                    case 'finalise':
                        orderItem.state = 'finalised';
                        break;
                    default:
                        throw new Error('unrecognised action: ' + item.action);
                }
            });
            
        })
        .then(() => { order.calculateWithoutLookup(); })
        .then(() => {
            
            // Check order state
            var remaining = _.reject(order.items, (item) => { 
                switch(item.state) {
                    case 'finalised':
                    case 'cancelled':
                    case 'refunded':
                        return true;
                    default:
                        return false;
                } 
            });
            
            if (remaining.length === 0 ) {
                if (order.due === 0) {
                    order.state = 'closed';
                }
                else {
                    order.state = 'finalised';
                }
            }
            else {
                console.error('Order not finalised: ' + order._id);
            }
        })
        .then(() => { return order.save(); })
        .then(() => { res.jsonp(order); })
        .catch((err) => { res.status(400).send({ message: err.message }); });
};

/**
 * Order middleware
 */
exports.orderByID = function(req, res, next, id) { 
    Order.findById(id)
        .where({state: { $ne: 'deleted' }})
            //.populate('user', 'displayName')
            .populate('payments')
            .exec(function(err, order) {
		        if (err) return next(err);
		        if (! order) return next(new Error('Failed to load Order ' + id));
		        req.order = order ;
		        next();
	        });
};

exports.ordersByUserID = function(req, res, next, id) {
    Order.find({state: { $ne: 'deleted' }, user: id })
//        .select('payments')
        .sort('-created')
        .populate('payments')
        //.populate('user', 'displayName')
        .exec(function(err, orders) {
            if (err) return next(err);
            req.orders = orders;
            next();
	    });
};
