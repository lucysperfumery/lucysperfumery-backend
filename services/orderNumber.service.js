const OrderCounter = require("../models/orderCounter.model");

/**
 * Generate a unique human-readable order number
 * Format: LP-YYYY-XXXXXX (e.g., LP-2024-001234)
 * - LP = Lucy's Perfumery
 * - YYYY = Current year (Ghana timezone: UTC+0)
 * - XXXXXX = Sequential 6-digit number (resets yearly)
 *
 * @returns {Promise<string>} Generated order number
 */
const generateOrderNumber = async () => {
  try {
    // Get current year in Ghana timezone (UTC+0)
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();

    // Get next sequence number for this year (atomic increment)
    const sequenceNumber = await OrderCounter.getNextSequence(year);

    // Format as LP-YYYY-XXXXXX with zero-padding
    const paddedSequence = String(sequenceNumber).padStart(6, "0");
    const orderNumber = `LP-${year}-${paddedSequence}`;

    console.log(`Generated order number: ${orderNumber}`);
    return orderNumber;
  } catch (error) {
    console.error("Error generating order number:", error);
    throw new Error("Failed to generate order number");
  }
};

/**
 * Validate order number format
 * @param {string} orderNumber - Order number to validate
 * @returns {boolean} True if valid format
 */
const validateOrderNumber = (orderNumber) => {
  const orderNumberRegex = /^LP-\d{4}-\d{6}$/;
  return orderNumberRegex.test(orderNumber);
};

module.exports = {
  generateOrderNumber,
  validateOrderNumber,
};
