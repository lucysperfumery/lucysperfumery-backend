const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Load and populate an HTML email template
 * @param {string} templateName - Name of the template file (without .html)
 * @param {Object} data - Data to populate the template
 * @returns {string} Populated HTML content
 */
const loadTemplate = (templateName, data) => {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholders with actual data
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, data[key]);
  });

  return html;
};

/**
 * Format items list for email
 * @param {Array} items - Array of order items
 * @returns {string} HTML formatted items list
 */
const formatItemsList = (items) => {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">GHS ${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">GHS ${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');
};

/**
 * Send order confirmation email to customer
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Email send result
 */
const sendOrderConfirmation = async (orderData) => {
  try {
    const itemsList = formatItemsList(orderData.items);
    const orderDate = new Date(orderData.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = loadTemplate('order-confirmation', {
      customerName: orderData.customer.name,
      orderId: orderData.orderNumber,
      orderDate: orderDate,
      itemsList: itemsList,
      totalAmount: orderData.totalAmount.toFixed(2),
      currency: orderData.currency,
    });

    const mailOptions = {
      from: `"Lucy's Perfumery" <${process.env.GMAIL_USER}>`,
      to: orderData.customer.email,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw new Error('Failed to send order confirmation email');
  }
};

/**
 * Send new order alert email to owner
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Email send result
 */
const sendNewOrderAlert = async (orderData) => {
  try {
    const itemsList = formatItemsList(orderData.items);
    const orderDate = new Date(orderData.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = loadTemplate('new-order', {
      orderId: orderData.orderNumber,
      orderDate: orderDate,
      customerName: orderData.customer.name,
      customerEmail: orderData.customer.email,
      customerPhone: orderData.customer.phone,
      itemsList: itemsList,
      totalAmount: orderData.totalAmount.toFixed(2),
      currency: orderData.currency,
      paystackReference: orderData.paystackReference,
    });

    const mailOptions = {
      from: `"Lucy's Perfumery System" <${process.env.GMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      subject: `=� New Order Received - ${orderData.orderNumber}`,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('New order alert email sent to owner:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending new order alert email:', error);
    throw new Error('Failed to send new order alert email');
  }
};

module.exports = {
  sendOrderConfirmation,
  sendNewOrderAlert,
};
