const axios = require('axios');

/**
 * Verify a Paystack payment using the transaction reference
 * @param {string} reference - The Paystack transaction reference
 * @returns {Promise<Object>} Payment verification result
 */
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === true && response.data.data.status === 'success') {
      return {
        success: true,
        data: {
          reference: response.data.data.reference,
          amount: response.data.data.amount / 100, // Convert from kobo to naira/cedi
          currency: response.data.data.currency,
          status: response.data.data.status,
          paidAt: response.data.data.paid_at,
          customer: {
            email: response.data.data.customer.email,
            phone: response.data.data.customer.phone,
          },
          metadata: response.data.data.metadata,
        },
      };
    } else {
      return {
        success: false,
        message: 'Payment verification failed',
        status: response.data.data.status,
      };
    }
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Failed to verify payment with Paystack'
    );
  }
};

module.exports = {
  verifyPayment,
};
