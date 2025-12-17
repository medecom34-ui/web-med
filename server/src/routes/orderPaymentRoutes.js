const express = require('express');
const router = express.Router();
const orderPaymentController = require('../controllers/orderPaymentController');

// create payment for order
router.post('/:orderId/payments', orderPaymentController.createPayment);

// list payments for order or get single payment by id (use query or param)
router.get('/:orderId/payments', orderPaymentController.getPayment);

// update payment by payment id
router.patch('/payments/:id', orderPaymentController.updatePayment);

module.exports = router;
