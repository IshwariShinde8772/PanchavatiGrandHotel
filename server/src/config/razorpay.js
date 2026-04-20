const Razorpay = require("razorpay");
const env = require("./env");

const razorpay = env.razorpay.keyId && env.razorpay.keySecret
  ? new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    })
  : null;

module.exports = razorpay;

