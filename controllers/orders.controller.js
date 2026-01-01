const Order = require("../models/orders.model");
const Product = require("../models/products.model");
const paystackService = require("../services/paystack.service");
const emailService = require("../services/email.service");
const hubtelService = require("../services/hubtel.service");
const telegramService = require("../services/telegram.service");
const orderNumberService = require("../services/orderNumber.service");

/**
 * Create a new order (pending payment)
 * @route POST /api/orders
 */
const createOrder = async (req, res) => {
  try {
    const {
      customer,
      items,
      totalAmount,
      currency,
      metadata,
      paystackReference,
    } = req.body;

    // Validate required fields
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({
        success: false,
        error: "Customer information (name, email, phone) is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order must contain at least one item",
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Total amount must be greater than 0",
      });
    }

    if (!paystackReference) {
      return res.status(400).json({
        success: false,
        error: "Paystack reference is required",
      });
    }

    // Check if order with this reference already exists
    const existingOrder = await Order.findOne({ paystackReference });
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already exists",
        order: existingOrder,
        paystackReference: existingOrder.paystackReference,
        data: existingOrder,
      });
    }

    // Verify payment with Paystack before creating order
    const paymentResult = await paystackService.verifyPayment(
      paystackReference
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed. Please complete payment first.",
        paymentStatus: paymentResult.status,
      });
    }

    // Verify amount matches (convert to kobo/pesewas for comparison)
    const expectedAmount = totalAmount;
    if (paymentResult.data.amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        error: "Payment amount does not match order total",
        expected: expectedAmount,
        received: paymentResult.data.amount,
      });
    }

    // Generate unique human-readable order number
    const orderNumber = await orderNumberService.generateOrderNumber();

    // Create new order with completed status (payment already verified)
    const order = await Order.create({
      orderNumber,
      customer,
      items,
      totalAmount,
      currency: currency || "GHS",
      paystackReference,
      metadata,
      status: "completed", // Already paid
    });

    // Reduce stock for each ordered item
    for (const item of items) {
      try {
        const product = await Product.findById(item.productId);
        if (product) {
          // Check if sufficient stock is available
          if (product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await product.save();
            console.log(
              `Stock reduced for product ${product.name}: ${item.quantity} units`
            );
          } else {
            console.warn(
              `Insufficient stock for product ${product.name}. Available: ${product.stock}, Ordered: ${item.quantity}`
            );
          }
        } else {
          console.warn(`Product not found: ${item.productId}`);
        }
      } catch (error) {
        console.error(
          `Error reducing stock for product ${item.productId}:`,
          error.message
        );
        // Don't fail the order if stock reduction fails
      }
    }

    // Send notifications in parallel (don't wait for them to complete)
    const notificationPromises = [];

    // Send order confirmation email to customer
    notificationPromises.push(
      emailService.sendOrderConfirmation(order).catch((error) => {
        console.error(
          "Failed to send order confirmation email:",
          error.message
        );
      })
    );

    // Send new order alert email to owner
    notificationPromises.push(
      emailService.sendNewOrderAlert(order).catch((error) => {
        console.error("Failed to send new order alert email:", error.message);
      })
    );

    // Send SMS confirmation to customer
    notificationPromises.push(
      hubtelService
        .sendOrderConfirmationSMS(order.customer.phone, {
          customerName: order.customer.name,
          orderId: order.orderNumber,
          totalAmount: order.totalAmount,
        })
        .catch((error) => {
          console.error("Failed to send SMS confirmation:", error.message);
        })
    );

    // Send Telegram notification to owner
    notificationPromises.push(
      telegramService.sendNewOrderNotification(order).catch((error) => {
        console.error("Failed to send Telegram notification:", error.message);
      })
    );

    // Wait for all notifications to complete (but don't fail if they fail)
    await Promise.allSettled(notificationPromises);

    res.status(201).json({
      success: true,
      message: "Order created and payment verified successfully.",
      order: order,
      paystackReference: paystackReference,
      data: order, // Backward compatibility
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create order",
    });
  }
};

/**
 * Verify payment and complete order
 * @route POST /api/orders/verify
 */
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: "Payment reference is required",
      });
    }

    // Find the order with this reference
    const order = await Order.findOne({ paystackReference: reference });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found with this payment reference",
      });
    }

    // If already completed, return success
    if (order.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Order already verified and completed",
        data: order,
      });
    }

    // Verify payment with Paystack
    const paymentResult = await paystackService.verifyPayment(reference);

    if (!paymentResult.success) {
      // Update order status to failed
      order.status = "failed";
      await order.save();

      return res.status(400).json({
        success: false,
        error: "Payment verification failed",
        paymentStatus: paymentResult.status,
      });
    }

    // Verify amount matches
    if (paymentResult.data.amount !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        error: "Payment amount does not match order total",
        expected: order.totalAmount,
        received: paymentResult.data.amount,
      });
    }

    // Update order status to completed
    order.status = "completed";
    await order.save();

    // Reduce stock for each ordered item
    for (const item of order.items) {
      try {
        const product = await Product.findById(item.productId);
        if (product) {
          // Check if sufficient stock is available
          if (product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await product.save();
            console.log(
              `Stock reduced for product ${product.name}: ${item.quantity} units`
            );
          } else {
            console.warn(
              `Insufficient stock for product ${product.name}. Available: ${product.stock}, Ordered: ${item.quantity}`
            );
          }
        } else {
          console.warn(`Product not found: ${item.productId}`);
        }
      } catch (error) {
        console.error(
          `Error reducing stock for product ${item.productId}:`,
          error.message
        );
        // Don't fail the order if stock reduction fails
      }
    }

    // Send notifications in parallel (don't wait for them to complete)
    const notificationPromises = [];

    // Send order confirmation email to customer
    notificationPromises.push(
      emailService.sendOrderConfirmation(order).catch((error) => {
        console.error(
          "Failed to send order confirmation email:",
          error.message
        );
      })
    );

    // Send new order alert email to owner
    notificationPromises.push(
      emailService.sendNewOrderAlert(order).catch((error) => {
        console.error("Failed to send new order alert email:", error.message);
      })
    );

    // Send SMS confirmation to customer
    notificationPromises.push(
      hubtelService
        .sendOrderConfirmationSMS(order.customer.phone, {
          customerName: order.customer.name,
          orderId: order.orderNumber,
          totalAmount: order.totalAmount,
        })
        .catch((error) => {
          console.error("Failed to send SMS confirmation:", error.message);
        })
    );

    // Send Telegram notification to owner
    notificationPromises.push(
      telegramService.sendNewOrderNotification(order).catch((error) => {
        console.error("Failed to send Telegram notification:", error.message);
      })
    );

    // Wait for all notifications to complete (but don't fail if they fail)
    await Promise.allSettled(notificationPromises);

    res.status(200).json({
      success: true,
      message: "Payment verified and order completed successfully",
      order: order,
      data: order, // Backward compatibility
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify payment",
    });
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch order",
    });
  }
};

/**
 * Get all orders (with pagination)
 * @route GET /api/orders
 */
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch orders",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getOrderById,
  getAllOrders,
};
