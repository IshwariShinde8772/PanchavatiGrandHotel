const dotenv = require("dotenv");

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const port = Number(process.env.PORT || 5000);
const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
const emailPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || "";
const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
const defaultClientUrl = nodeEnv === "development" ? "http://localhost:5173" : "";
const clientUrl = process.env.CLIENT_URL || defaultClientUrl;
const corsOrigins = (process.env.CORS_ORIGINS || defaultClientUrl)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const gstPercent = Number(
  process.env.GST_PERCENT || (nodeEnv === "development" ? 12 : 0)
);

const env = {
  port,
  nodeEnv,
  backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || "panchavati_hotel",
    user: process.env.DB_USER || "root",
    pass: process.env.DB_PASS || "",
    syncAlter: process.env.DB_SYNC_ALTER
      ? process.env.DB_SYNC_ALTER === "true"
      : nodeEnv !== "production",
    forceSync: process.env.DB_FORCE_SYNC === "true",
  },
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@panchavatgrand.in",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin@123",
    fullName: process.env.DEFAULT_ADMIN_NAME || "Panchavati Admin",
    phone: process.env.DEFAULT_ADMIN_PHONE || "+91-2530000000",
  },
  jwtSecret: process.env.JWT_SECRET || "panchavati_nashik_secret_key_change_this_in_prod",
  jwtExpiry: process.env.JWT_EXPIRY || "7d",
  twofactor: {
    apiKey: process.env.TWOFACTOR_API_KEY || "",
    template: process.env.TWOFACTOR_TEMPLATE || "",
  },
  fast2smsKey: process.env.FAST2SMS_API_KEY || "",
  fast2smsSenderId: process.env.FAST2SMS_SENDER_ID || "PVHTEL",
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || "",
    token: process.env.TWILIO_AUTH_TOKEN || "",
    phone: process.env.TWILIO_PHONE_NUMBER || "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },
  smtp: {
    host: emailHost,
    port: emailPort,
    user: emailUser,
    pass: emailPass,
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@panchavatgrand.in",
  },
  clientUrl,
  corsOrigins,
  gstPercent: Number.isFinite(gstPercent) ? gstPercent : 0,
  staticAssetsPath: process.env.STATIC_ASSETS_PATH || "",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  payments: {
    qrExpiryMinutes: Number(process.env.QR_PAYMENT_EXPIRY_MINUTES || 10),
  },
};

module.exports = env;
