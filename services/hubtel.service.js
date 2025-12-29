const axios = require("axios");

/**
 * Send SMS via Hubtel API
 * @param {string} phone - Recipient phone number (format: 233XXXXXXXXX)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} SMS send result
 */

const client_id = process.env.HUBTEL_CLIENT_ID;
const client_secret = process.env.HUBTEL_CLIENT_SECRET;

const sendSMS = async (phone, message) => {
  try {
    const accessToken = Buffer.from(`${client_id}:${client_secret}`).toString(
      "base64"
    );

    const response = await axios.post(
      "https://smsc.hubtel.com/v1/messages/send",
      {
        from: process.env.HUBTEL_SENDER_ID,
        to: phone,
        content: message,
      },
      {
        headers: {
          Authorization: `Basic ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("SMS sent successfully:", response.data);
    return {
      success: true,
      messageId: response.data.MessageId || response.data.messageId,
      data: response.data,
    };
  } catch (error) {
    console.error("Hubtel SMS error:", error.response?.data || error.message);
    throw new Error("Failed to send SMS via Hubtel");
  }
};

/**
 * Send order confirmation SMS to customer
 * @param {string} phone - Customer phone number
 * @param {Object} orderDetails - Order information
 * @returns {Promise<Object>} SMS send result
 */
const sendOrderConfirmationSMS = async (phone, orderDetails) => {
  try {
    // Normalize to E.164 (uses DEFAULT_COUNTRY_CODE env or falls back to Ghana '233')
    const defaultCountryCode = "233";
    let cleaned = String(phone || "")
      .trim()
      .replace(/[\s\-().]/g, "");

    let formattedPhone;
    if (/^\+\d+$/.test(cleaned)) {
      // already E.164
      formattedPhone = cleaned;
    } else if (/^00\d+$/.test(cleaned)) {
      // international with 00 prefix -> convert to +
      formattedPhone = "+" + cleaned.slice(2);
    } else if (/^0\d+$/.test(cleaned)) {
      // national format starting with 0 -> replace 0 with country code
      formattedPhone = "+" + defaultCountryCode + cleaned.slice(1);
    } else if (new RegExp("^" + defaultCountryCode + "\\d+$").test(cleaned)) {
      // starts with country code without +
      formattedPhone = "+" + cleaned;
    } else if (/^\d+$/.test(cleaned)) {
      // bare digits -> assume missing country code
      formattedPhone = "+" + defaultCountryCode + cleaned;
    } else {
      throw new Error("Invalid phone number format");
    }

    // Validate E.164 length (max 15 digits total, min reasonable length 8)
    const digitCount = formattedPhone.replace(/\D/g, "").length;
    if (digitCount < 8 || digitCount > 15) {
      throw new Error("Phone number is not a valid E.164 number");
    }

    console.log("Formatted phone number for SMS:", formattedPhone);

    const message = `Hello ${orderDetails.customerName}! \n\nYour order #${orderDetails.orderId} at Lucy's Perfumery has been confirmed. \n\nTotal: GHS ${orderDetails.totalAmount}. \n\nWe will contact you shortly with further details. Thank you!`;

    const result = await sendSMS(formattedPhone, message);
    console.log("Order confirmation SMS sent:", result);
    return result;
  } catch (error) {
    console.error("Error sending order confirmation SMS:", error);
    throw error;
  }
};

module.exports = {
  sendSMS,
  sendOrderConfirmationSMS,
};
