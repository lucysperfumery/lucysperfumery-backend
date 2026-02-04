const express = require("express");
const router = express.Router();

// PAYMENT SYSTEM DISABLED - NOW USING WHATSAPP ORDERING
// All order creation routes have been removed
// Orders are managed through WhatsApp conversations

// NOTE: The archived orders.controller.js has been deleted
// If you need order viewing functionality for admin purposes,
// create a new read-only orders controller without payment logic

// DISABLED ROUTES (payment-based ordering):
// router.post('/', ordersController.createOrder);
// router.post('/verify', ordersController.verifyPayment);
// router.get("/:id", ordersController.getOrderById);
// router.get("/", ordersController.getAllOrders);

module.exports = router;
