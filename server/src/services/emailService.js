const transporter = require("../config/mailer");
const env = require("../config/env");

function hasUsableSmtpConfig() {
  return Boolean(env.smtp.user && env.smtp.pass);
}

async function sendViaSmtp({ to, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
      text,
    });

    return { success: true, provider: "smtp" };
  } catch (error) {
    console.error(`Email send failed for ${to}:`, error.message);
    return {
      success: false,
      provider: "smtp",
      error: error.message,
    };
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (hasUsableSmtpConfig()) {
    return sendViaSmtp({ to, subject, html, text });
  }

  return {
    success: true,
    mocked: true,
    message: `Email to ${to}: ${subject}`,
  };
}

async function sendBookingConfirmation(booking, customer, hotelSettings) {
  if (!customer.email) {
    return { success: true, skipped: true };
  }

  return sendEmail({
    to: customer.email,
    subject: `Booking Confirmed - ${booking.booking_ref}`,
    html: `
      <h2>${hotelSettings.hotel_name}</h2>
      <p>Your booking <strong>${booking.booking_ref}</strong> is confirmed.</p>
      <p>Check-in: ${booking.check_in} | Check-out: ${booking.check_out}</p>
      <p>Total: INR ${booking.total_amount}</p>
    `,
    text: `Booking ${booking.booking_ref} confirmed at ${hotelSettings.hotel_name}`,
  });
}

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  hasUsableSmtpConfig,
};
