const TelegramBot = require("node-telegram-bot-api");

// Initialize Telegram bot
let bot;
try {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
} catch (error) {
  console.error("Error initializing Telegram bot:", error.message);
}

/**
 * Format order items for Telegram message
 * @param {Array} items - Array of order items
 * @returns {string} Formatted items list
 */
const formatItemsForTelegram = (items) => {
  return items
    .map((item, index) => {
      return `${index + 1}. ${item.name}\nQuantity: ${
        item.quantity
      } x GHS ${item.price.toFixed(2)} \n= GHS ${(
        item.quantity * item.price
      ).toFixed(2)}`;
    })
    .join("\n\n");
};

/**
 * Send new order notification to owner via Telegram
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Telegram send result
 */
const sendNewOrderNotification = async (orderData) => {
  try {
    if (!bot) {
      throw new Error(
        "Telegram bot not initialized. Check TELEGRAM_BOT_TOKEN."
      );
    }

    const orderDate = new Date(orderData.createdAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsList = formatItemsForTelegram(orderData.items);

    const message = `
    *NEW ORDER RECEIVED!*
    
*Order Details:*
Order ID: \`${orderData.orderNumber}\`
Date: ${orderDate}
Status: Paid ✅

*Customer Info:*
Name: ${orderData.customer.name}
Email: ${orderData.customer.email}
Phone: ${orderData.customer.phone}
Delivery Method: ${
      orderData.metadata && orderData.metadata.deliveryMethod
        ? orderData.metadata.deliveryMethod
        : "N/A"
    }
Delivery Address: ${
      orderData.metadata && orderData.metadata.deliveryAddress
        ? orderData.metadata.deliveryAddress
        : "N/A"
    }


*Items Ordered:*
${itemsList}

*Total Amount:* *${orderData.currency} ${orderData.totalAmount.toFixed(2)}*

*Payment Reference:*
\`${orderData.paystackReference}\`
`.trim();

    const result = await bot.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      message,
      {
        parse_mode: "Markdown",
      }
    );

    console.log("Telegram notification sent successfully:", result.message_id);
    return {
      success: true,
      messageId: result.message_id,
    };
  } catch (error) {
    console.error("Error sending Telegram notification:", error.message);
    throw new Error("Failed to send Telegram notification");
  }
};

/**
 * Send a test message to verify Telegram bot setup
 * @returns {Promise<Object>} Test message result
 */
const sendTestMessage = async () => {
  try {
    if (!bot) {
      throw new Error(
        "Telegram bot not initialized. Check TELEGRAM_BOT_TOKEN."
      );
    }

    const message =
      " Telegram bot is working! Lucy's Perfumery notification system is ready.";

    const result = await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);

    console.log("Test message sent successfully:", result.message_id);
    return {
      success: true,
      messageId: result.message_id,
    };
  } catch (error) {
    console.error("Error sending test message:", error.message);
    throw error;
  }
};

module.exports = {
  sendNewOrderNotification,
  sendTestMessage,
};
