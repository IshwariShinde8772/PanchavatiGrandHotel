const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const env = require("../config/env");

async function createOrder({ amount, currency = "INR", receipt }) {
  if (!razorpay) {
    return {
      id: `mock_order_${Date.now()}`,
      amount,
      currency,
      receipt,
      mocked: true,
    };
  }

  return razorpay.orders.create({ amount, currency, receipt });
}

function verifySignature({ orderId, paymentId, signature }) {
  if (!env.razorpay.keySecret) {
    return true;
  }

  const generated = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generated === signature;
}

async function refundPayment(paymentId, amount) {
  if (!razorpay) {
    return { id: `mock_refund_${Date.now()}`, paymentId, amount, mocked: true };
  }

  return razorpay.payments.refund(paymentId, { amount });
}

module.exports = {
  createOrder,
  verifySignature,
  refundPayment,
};

