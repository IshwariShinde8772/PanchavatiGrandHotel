const nodemailer = require("nodemailer");
const env = require("./env");

const hasSmtpCredentials = Boolean(
  env.smtp.user &&
  env.smtp.pass
);

/**
 * Gmail SMTP Configuration:
 * 1. Enable 2-Step Verification in Google Account
 * 2. Generate App Password: https://myaccount.google.com/apppasswords
 * 3. Use the 16-character App Password in EMAIL_PASS (or SMTP_PASS)
 * 3. Use the 16-character App Password in SMTP_PASS
 * 
 * For other providers, use regular SMTP credentials
 */
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // Use TLS for 587, SSL for 465
  auth: hasSmtpCredentials ? {
    user: env.smtp.user,
    pass: env.smtp.pass,
  } : undefined,
});

// Verify connection on startup
if (hasSmtpCredentials) {
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ Email configuration error:", error.message);
      console.error("For Gmail: Use App Password (not your regular password)");
      console.error("Get it here: https://myaccount.google.com/apppasswords");
    } else {
      console.log("✅ Email service is ready");
    }
  });
}

module.exports = transporter;
