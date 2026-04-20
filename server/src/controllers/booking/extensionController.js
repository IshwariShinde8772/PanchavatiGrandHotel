const {
  sequelize,
  Booking,
  BookingExtensionRequest,
  Customer,
  HotelSetting,
  Notification,
  Room,
  PaymentTransaction,
} = require("../../../models");
const { Op } = require("sequelize");
const { calculateGST } = require("../../utils/gst");
const { diffNights, parseDateInput, startOfTodayUTC } = require("../../utils/dateHelpers");
const { calculateEffectivePrice, countOverlappingBookings } = require("../../services/roomService");
const { sendEmail } = require("../../services/emailService");
const { createQrTransaction, serializeTransaction } = require("../../services/transactionService");

function buildExtensionTotals(booking, requestedFrom, requestedTo, room) {
  const requestedNights = diffNights(requestedFrom, requestedTo);
  const extraNights = Math.max(requestedNights - booking.nights, 0);
  const price = calculateEffectivePrice(room, requestedFrom);
  const extraFare = Number((price.pricePerNight * extraNights).toFixed(2));
  const gst = calculateGST(extraFare, booking.gst_percent);
  const extraAmount = Number((extraFare + gst.gstAmount).toFixed(2));

  return {
    nights: requestedNights,
    extra_fare: extraFare,
    extra_gst: gst.gstAmount,
    extra_amount: extraAmount,
  };
}

function formatBookingRange(booking) {
  return `${booking.check_in} → ${booking.check_out}`;
}

async function notifyCustomer(subject, customer, html, text) {
  if (!customer?.email) {
    return;
  }

  await sendEmail({ to: customer.email, subject, html, text });
}

async function applyExtensionToBooking(booking, request) {
  const newTotalFare = Number((booking.fare_per_night * request.nights).toFixed(2));
  const gst = calculateGST(newTotalFare, booking.gst_percent);
  const newTotalAmount = Number((newTotalFare + gst.gstAmount).toFixed(2));

  await booking.update({
    check_in: request.requested_from,
    check_out: request.requested_to,
    nights: request.nights,
    total_fare: newTotalFare,
    gst_amount: gst.gstAmount,
    total_amount: newTotalAmount,
  });
}

async function createBookingExtensionRequest(req, res) {
  const booking = await Booking.findByPk(req.params.id, {
    include: [{ model: Room, as: "room" }],
  });

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  if (booking.customer_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You cannot request an extension for this booking" });
  }

  if (booking.status === "cancelled" || booking.status === "checked_out") {
    return res.status(400).json({ success: false, error: "This booking cannot be extended" });
  }

  const { requested_from, requested_to, reason } = req.body;
  const fromDate = parseDateInput(requested_from);
  const toDate = parseDateInput(requested_to);
  const bookingStart = parseDateInput(booking.check_in);
  const bookingEnd = parseDateInput(booking.check_out);

  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, error: "Invalid requested dates" });
  }

  if (fromDate < bookingStart) {
    return res.status(400).json({ success: false, error: "Requested start date cannot be before the original booking start" });
  }

  if (toDate <= fromDate) {
    return res.status(400).json({ success: false, error: "Requested end date must be after the requested start date" });
  }

  if (booking.status === "checked_in" && fromDate.getTime() !== bookingEnd.getTime()) {
    return res.status(400).json({ success: false, error: "Extensions must start from the current checkout date once the guest is checked in" });
  }

  const existingPending = await BookingExtensionRequest.findOne({
    where: {
      booking_id: booking.id,
      status: {
        [Op.in]: ["pending", "approved"],
      },
    },
  });

  if (existingPending) {
    return res.status(409).json({ success: false, error: "There is already an active extension request for this booking" });
  }

  const overlapCount = await countOverlappingBookings({
    roomId: booking.room_id,
    checkIn: requested_from,
    checkOut: requested_to,
    excludeBookingId: booking.id,
    transaction: null,
  });

  if (overlapCount > 0) {
    return res.status(409).json({ success: false, error: "The requested date range is not available for this room" });
  }

  const totals = buildExtensionTotals(booking, requested_from, requested_to, booking.room);

  const request = await BookingExtensionRequest.create({
    booking_id: booking.id,
    customer_id: req.user.id,
    requested_from,
    requested_to,
    nights: totals.nights,
    reason,
    status: "pending",
    extra_fare: totals.extra_fare,
    extra_gst: totals.extra_gst,
    extra_amount: totals.extra_amount,
  });

  await Notification.create({
    target_role: "receptionist",
    title: "Room extension request",
    message: `Extension requested for ${booking.booking_ref}: ${requested_from} to ${requested_to}`,
    type: "booking",
  });

  const customer = await Customer.findByPk(req.user.id);
  await notifyCustomer(
    `Extension request submitted for ${booking.booking_ref}`,
    customer,
    `<p>Your extension request from <strong>${requested_from}</strong> to <strong>${requested_to}</strong> has been submitted to reception.</p>`,
    `Your extension request for ${booking.booking_ref} has been submitted.`
  );

  return res.status(201).json({ success: true, data: request, message: "Extension request sent to receptionist" });
}

async function listBookingExtensionRequests(req, res) {
  const requests = await BookingExtensionRequest.findAll({
    include: [
      {
        model: Booking,
        as: "booking",
        include: [{ model: Room, as: "room" }],
      },
      { model: Customer, as: "customer" },
    ],
    order: [["requested_at", "DESC"]],
  });

  return res.json({ success: true, data: requests, total: requests.length, page: 1, limit: requests.length || 10 });
}

async function processBookingExtensionRequest(req, res) {
  const request = await BookingExtensionRequest.findByPk(req.params.id, {
    include: [
      {
        model: Booking,
        as: "booking",
        include: [{ model: Room, as: "room" }],
      },
      { model: Customer, as: "customer" },
    ],
  });

  if (!request) {
    return res.status(404).json({ success: false, error: "Request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ success: false, error: "This request has already been processed" });
  }

  const { action, payment_method, response_text } = req.body;
  let qrTransaction = null;

  if (action === "reject") {
    await request.update({
      status: "rejected",
      response_text: response_text || "Request rejected.",
      processed_by_staff_id: req.user.id,
      responded_at: new Date(),
    });

    await Notification.create({
      target_role: "customer",
      target_id: request.customer_id,
      title: "Extension request rejected",
      message: `Your extension request for ${request.booking.booking_ref} was rejected by reception.`,
      type: "booking",
    });

    await notifyCustomer(
      `Extension request rejected for ${request.booking.booking_ref}`,
      request.customer,
      `<p>Your extension request for ${request.booking.booking_ref} has been rejected by reception.</p><p>Reason: ${response_text || "Not specified"}</p>`,
      `Your extension request for ${request.booking.booking_ref} was rejected.`
    );

    return res.json({ success: true, data: request, message: "Request rejected" });
  }

  if (action === "approve") {
    if (!payment_method) {
      return res.status(400).json({ success: false, error: "Payment method is required to approve the extension" });
    }

    const updates = {
      status: payment_method === "cash" ? "completed" : "approved",
      payment_method,
      payment_status: payment_method === "cash" ? "paid" : "pending",
      response_text: response_text || "Approved by reception",
      processed_by_staff_id: req.user.id,
      responded_at: new Date(),
    };

    if (payment_method === "cash") {
      await applyExtensionToBooking(request.booking, request);
      updates.completed_at = new Date();
    }

    if (payment_method === "qr") {
      const hotelSettings = await HotelSetting.findByPk(1);
      qrTransaction = await createQrTransaction({
        PaymentTransaction,
        booking: request.booking,
        customer: request.customer,
        hotelSettings,
        amount: request.extra_amount,
        description: `Extension request #${request.id}`,
      });
    }

    await request.update(updates);

    await Notification.create({
      target_role: "customer",
      target_id: request.customer_id,
      title: payment_method === "cash" ? "Extension approved" : "Extension approved, payment pending",
      message: payment_method === "cash"
        ? `Your extension request for ${request.booking.booking_ref} is approved and will be charged in cash.`
        : `Your extension request for ${request.booking.booking_ref} is approved. Please complete the payment on your portal.`,
      type: "booking",
    });

    await notifyCustomer(
      `Extension ${payment_method === "cash" ? "approved" : "approved, payment pending"} for ${request.booking.booking_ref}`,
      request.customer,
      `<p>Your extension request for ${request.booking.booking_ref} has been approved.</p>
       <p>New range: <strong>${request.requested_from}</strong> to <strong>${request.requested_to}</strong></p>
       <p>Charges: INR ${request.extra_amount}</p>
       <p>Payment: ${payment_method}</p>`,
      `Your extension request for ${request.booking.booking_ref} has been approved.`
    );

    const responseData = { request };
    if (qrTransaction) {
      responseData.payment_transaction = serializeTransaction(qrTransaction);
    }

    return res.json({ success: true, data: responseData, message: "Request approved" });
  }

  return res.status(400).json({ success: false, error: "Invalid action" });
}

async function payExtensionRequest(req, res) {
  const request = await BookingExtensionRequest.findOne({
    where: { id: req.params.id, customer_id: req.user.id },
    include: [
      {
        model: Booking,
        as: "booking",
        include: [{ model: Room, as: "room" }],
      },
      { model: Customer, as: "customer" },
    ],
  });

  if (!request) {
    return res.status(404).json({ success: false, error: "Extension request not found" });
  }

  if (request.status !== "approved" || request.payment_status !== "pending") {
    return res.status(400).json({ success: false, error: "This extension request is not waiting for payment" });
  }

  await request.update({
    payment_status: "paid",
    status: "completed",
    completed_at: new Date(),
  });

  await applyExtensionToBooking(request.booking, request);

  await Notification.create({
    target_role: "customer",
    target_id: request.customer_id,
    title: "Extension payment received",
    message: `Your extension payment for ${request.booking.booking_ref} is complete and your stay has been updated.`,
    type: "booking",
  });

  await notifyCustomer(
    `Extension payment received for ${request.booking.booking_ref}`,
    request.customer,
    `<p>Your payment for the extension request on ${request.booking.booking_ref} was received.</p>
     <p>Your booking is now updated to ${request.requested_from} – ${request.requested_to}.</p>`,
    `Your extension payment for ${request.booking.booking_ref} was received.`
  );

  return res.json({ success: true, data: request, message: "Extension payment confirmed" });
}

async function getBookingExtensionRequests(req, res) {
  const requests = await BookingExtensionRequest.findAll({
    where: { booking_id: req.params.id, customer_id: req.user.id },
    order: [["requested_at", "DESC"]],
  });

  return res.json({ success: true, data: requests, total: requests.length, page: 1, limit: requests.length || 10 });
}

module.exports = {
  createBookingExtensionRequest,
  listBookingExtensionRequests,
  processBookingExtensionRequest,
  payExtensionRequest,
  getBookingExtensionRequests,
};
