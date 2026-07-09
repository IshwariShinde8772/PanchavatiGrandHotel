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
    return false;
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const generated = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const generatedBuffer = Buffer.from(generated, "utf8");
  const signatureBuffer = Buffer.from(String(signature), "utf8");
  return generatedBuffer.length === signatureBuffer.length
    && crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
}

async function refundPayment(paymentId, amount) {
  if (!razorpay) {
    return { id: `mock_refund_${Date.now()}`, paymentId, amount, mocked: true };
  }

  return razorpay.payments.refund(paymentId, { amount });
}

async function fetchPayment(paymentId) {
  if (!razorpay) {
    const error = new Error("Razorpay is not configured");
    error.status = 503;
    throw error;
  }
  return razorpay.payments.fetch(paymentId);
}

module.exports = {
  createOrder,
  verifySignature,
  refundPayment,
  fetchPayment,
};

