const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');

// Create a new order (pending payment)
router.post('/', ordersController.createOrder);

// Verify payment and complete order
router.post('/verify', ordersController.verifyPayment);

// Get order by ID
router.get('/:id', ordersController.getOrderById);

// Get all orders (with pagination)
router.get('/', ordersController.getAllOrders);

module.exports = router;
