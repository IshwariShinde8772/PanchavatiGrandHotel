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
      <p>Check-in: ${booking.check_in} at ${booking.checkInTime || hotelSettings.check_in_time} | Check-out: ${booking.check_out}</p>
      <p>Total: INR ${booking.total_amount}</p>
    `,
    text: `Booking ${booking.booking_ref} confirmed at ${hotelSettings.hotel_name}`,
  });
}

function formatHotelDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: env.hotelTimeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function sendNoShowCancellationEmail({
  booking,
  customer,
  settings = {},
  summary = {},
  refundStatus = "not_applicable",
}) {
  if (!customer?.email) return { success: true, skipped: true };

  const room = booking.room?.room_number
    ? `Room ${booking.room.room_number}${booking.room.name ? ` - ${booking.room.name}` : ""}`
    : booking.room?.name || "Hotel room";
  const graceMinutes = Number(booking.noShowGraceMinutes || 60);
  const reason = booking.cancellation_reason
    || booking.autoCancellationReason
    || "Auto-cancelled due to no-show after 1 hour grace period";

  return sendEmail({
    to: customer.email,
    subject: "Booking cancelled due to missed check-in",
    html: `
      <h2>${settings.hotel_name || "Panchavati Grand"}</h2>
      <p>Your booking <strong>${booking.booking_ref}</strong> has been cancelled because check-in was not completed within the selected check-in grace period.</p>
      <p>Room: ${room}</p>
      <p>Check-in date: ${booking.check_in}</p>
      <p>Selected check-in time: ${booking.checkInTime}</p>
      <p>Grace period: ${graceMinutes} minutes</p>
      <p>Auto-cancelled at: ${formatHotelDateTime(booking.autoCancelledAt || new Date())}</p>
      <p>Cancellation reason: ${reason}</p>
      <p>Cancellation charge: ${money(summary.cancellationCharge)}</p>
      <p>Refund amount: ${money(summary.refundAmount)}</p>
      <p>Refund status: ${String(refundStatus).replaceAll("_", " ")}</p>
      <p>Refund will be processed as per hotel refund policy and Razorpay/bank timelines.</p>
    `,
    text: `Booking ${booking.booking_ref} was cancelled due to missed check-in. Check-in: ${booking.check_in} ${booking.checkInTime}. Grace period: ${graceMinutes} minutes. Cancellation charge: ${money(summary.cancellationCharge)}. Refund amount: ${money(summary.refundAmount)}. Refund status: ${refundStatus}. Refund will be processed as per hotel refund policy and Razorpay/bank timelines.`,
  });
}

function money(value) {
  return `INR ${Number(value || 0).toFixed(2)}`;
}

async function sendRefundEmail(kind, refund, booking, customer, hotelSettings = {}) {
  if (!customer?.email) return { success: true, skipped: true };

  const subjects = {
    requested: "Booking Cancellation & Refund Request Generated",
    processing: "Your Razorpay Refund Has Been Initiated",
    approved: "Your Razorpay Refund Has Been Initiated",
    completed: "Your Refund Has Been Completed",
    failed: "Refund Processing Update",
    rejected: "Refund Request Update",
    no_refund: "Booking Cancellation Confirmation",
  };
  const statusLine = kind === "requested"
    ? "Pending Admin Approval"
    : kind === "no_refund"
      ? "No Refund Applicable"
      : kind === "processing" || kind === "approved"
        ? "Processing"
        : kind === "completed"
          ? "Completed"
          : kind === "failed"
            ? "Failed - hotel/admin review required"
            : String(refund?.status || kind);
  const reference = refund?.razorpay_refund_id || refund?.refund_transaction_id || "Pending";

  return sendEmail({
    to: customer.email,
    subject: `${subjects[kind] || "Refund Update"} - ${booking.booking_ref}`,
    html: `
      <h2>${hotelSettings.hotel_name || "Panchavati Grand"}</h2>
      <p>Booking: <strong>${booking.booking_ref}</strong></p>
      ${["requested", "no_refund"].includes(kind) ? "<p>Your booking has been cancelled.</p>" : ""}
      <p>Room: ${booking.room?.name || booking.room?.room_number || "Hotel room"}</p>
      <p>Stay: ${booking.check_in} to ${booking.check_out}</p>
      <p>Total booking amount: ${money(booking.total_amount)}</p>
      <p>Amount paid: ${money(refund?.amount_paid)}</p>
      <p>Cancellation charge: ${money(refund?.cancellation_charge)}</p>
      <p>Refund amount: ${money(refund?.refund_amount)}</p>
      <p>Refund status: <strong>${statusLine}</strong></p>
      ${refund?.rejection_reason ? `<p>Reason: ${refund.rejection_reason}</p>` : ""}
      ${["processing", "approved", "completed"].includes(kind) ? `<p>Razorpay refund reference: ${reference}</p>` : ""}
      ${kind === "completed" ? `<p>Completed: ${refund.refunded_at || refund.completed_at || new Date().toISOString()}</p>` : ""}
      ${["processing", "approved"].includes(kind) ? "<p>Refund has been initiated through Razorpay. Bank/UPI credit time depends on Razorpay and bank processing timelines.</p>" : ""}
      ${kind === "failed" ? "<p>Refund processing failed. The hotel/admin will review it.</p>" : ""}
      <p>Policy: ${refund?.cancellation_policy_applied || booking.cancellation_policy_applied || "24-hour cancellation policy"}</p>
      <p>Need help? Contact ${hotelSettings.phone || hotelSettings.email || "the hotel reception"}.</p>
    `,
    text: `Booking ${booking.booking_ref}. Refund status: ${statusLine}. Refund amount: ${money(refund?.refund_amount)}. Razorpay reference: ${reference}.${["processing", "approved"].includes(kind) ? " Bank/UPI credit time depends on Razorpay and bank processing timelines." : ""}`,
  });
}

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendNoShowCancellationEmail,
  sendRefundEmail,
  hasUsableSmtpConfig,
};
