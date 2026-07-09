const { Op } = require("sequelize");
const {
  sequelize,
  Booking,
  BookingExtensionRequest,
  Customer,
  Notification,
  PaymentTransaction,
  Room,
} = require("../../../models");
const { parseDateInput } = require("../../utils/dateHelpers");
const { countOverlappingBookings } = require("../../services/roomService");
const { sendEmail } = require("../../services/emailService");
const { writeAudit } = require("../../services/auditService");
const {
  applyExtensionToBooking,
  buildExtensionRequestValues,
  calculateExtensionAmounts,
  extensionRemaining,
  roundMoney,
  toExtensionPayload,
} = require("../../services/extensionService");

async function notifyCustomer(subject, customer, html, text) {
  if (customer?.email) {
    await sendEmail({ to: customer.email, subject, html, text });
  }
}

function extensionAuditMetadata(request, extra = {}) {
  const data = toExtensionPayload(request);
  return {
    bookingId: data.booking_id,
    extensionRequestId: data.id,
    oldCheckoutDate: data.originalCheckoutDate,
    newCheckoutDate: data.extendedCheckoutDate,
    extensionNights: data.extensionNights,
    extensionPayableAmount: data.extensionPayableAmount,
    ...extra,
  };
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
  if (["cancelled", "checked_out"].includes(booking.status)) {
    return res.status(400).json({ success: false, error: "This booking cannot be extended" });
  }

  const { requested_from, requested_to, reason } = req.body;
  const fromDate = parseDateInput(requested_from);
  const toDate = parseDateInput(requested_to);
  const currentCheckout = parseDateInput(booking.check_out);
  if (!fromDate || !toDate || !currentCheckout) {
    return res.status(400).json({ success: false, error: "Invalid requested dates" });
  }
  if (fromDate.getTime() !== currentCheckout.getTime()) {
    return res.status(400).json({
      success: false,
      error: "Extension must start from the current checkout date",
    });
  }
  if (toDate <= currentCheckout) {
    return res.status(400).json({
      success: false,
      error: "New check-out date must be after the current check-out date",
    });
  }

  const existingActive = await BookingExtensionRequest.findOne({
    where: {
      booking_id: booking.id,
      status: { [Op.in]: ["pending", "approved"] },
    },
  });
  if (existingActive) {
    return res.status(409).json({
      success: false,
      error: "There is already an active extension request for this booking",
    });
  }

  const overlapCount = await countOverlappingBookings({
    roomId: booking.room_id,
    checkIn: booking.check_out,
    checkOut: requested_to,
    excludeBookingId: booking.id,
    transaction: null,
  });
  if (overlapCount > 0) {
    return res.status(409).json({
      success: false,
      error: "The requested extension dates are not available for this room",
    });
  }

  const totals = await calculateExtensionAmounts({
    booking,
    room: booking.room,
    extendedCheckoutDate: requested_to,
  });
  const request = await BookingExtensionRequest.create(buildExtensionRequestValues({
    booking,
    totals,
    reason,
    status: "pending",
  }));

  await writeAudit({
    action: "EXTENSION_CREATED",
    entityType: "booking",
    entityId: booking.id,
    actor: req.user,
    metadata: extensionAuditMetadata(request, { extensionPaymentStatus: "pending" }),
  });
  await Notification.create({
    target_role: "receptionist",
    title: "Room extension request",
    message: `Extension requested for ${booking.booking_ref}: ${booking.check_out} to ${requested_to}`,
    type: "booking",
  });

  const customer = await Customer.findByPk(req.user.id);
  await notifyCustomer(
    `Extension request submitted for ${booking.booking_ref}`,
    customer,
    `<p>Your extension request to <strong>${requested_to}</strong> has been submitted to reception.</p>
     <p>Extension payable: INR ${totals.extensionPayableAmount.toFixed(2)}</p>`,
    `Your extension request for ${booking.booking_ref} has been submitted.`
  );

  return res.status(201).json({
    success: true,
    data: toExtensionPayload(request),
    message: "Extension request sent to receptionist",
  });
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
      { model: PaymentTransaction, as: "paymentTransactions", required: false },
    ],
    order: [["requested_at", "DESC"]],
  });
  const data = requests.map(toExtensionPayload);
  return res.json({ success: true, data, total: data.length, page: 1, limit: data.length || 10 });
}

async function processBookingExtensionRequest(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const request = await BookingExtensionRequest.findByPk(req.params.id, {
      include: [
        { model: Booking, as: "booking", include: [{ model: Room, as: "room" }] },
        { model: Customer, as: "customer" },
      ],
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Request not found" });
    }
    if (request.status !== "pending") {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "This request has already been processed" });
    }

    const { action, response_text } = req.body;
    if (action === "reject") {
      await request.update({
        status: "rejected",
        response_text: response_text || "Request rejected.",
        processed_by_staff_id: req.user.id,
        responded_at: new Date(),
      }, { transaction });
      await writeAudit({
        action: "EXTENSION_REJECTED",
        entityType: "booking",
        entityId: request.booking_id,
        actor: req.user,
        metadata: extensionAuditMetadata(request, { note: response_text || null }),
        transaction,
      });
      await Notification.create({
        target_role: "customer",
        target_id: request.customer_id,
        title: "Extension request rejected",
        message: `Your extension request for ${request.booking.booking_ref} was rejected by reception.`,
        type: "booking",
      }, { transaction });
      await transaction.commit();

      await notifyCustomer(
        `Extension request rejected for ${request.booking.booking_ref}`,
        request.customer,
        `<p>Your extension request was rejected by reception.</p><p>Reason: ${response_text || "Not specified"}</p>`,
        `Your extension request for ${request.booking.booking_ref} was rejected.`
      );
      return res.json({ success: true, data: toExtensionPayload(request), message: "Request rejected" });
    }

    if (action !== "approve") {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Invalid action" });
    }

    if (String(request.booking.check_out) !== String(request.original_checkout_date || request.requested_from)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "Booking dates changed after this request was created. Please create a new extension request.",
      });
    }
    const overlapCount = await countOverlappingBookings({
      roomId: request.booking.room_id,
      checkIn: request.booking.check_out,
      checkOut: request.extended_checkout_date || request.requested_to,
      excludeBookingId: request.booking.id,
      transaction,
      lockRows: true,
    });
    if (overlapCount > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "The room is no longer available for the requested extension period",
      });
    }

    const totals = await calculateExtensionAmounts({
      booking: request.booking,
      room: request.booking.room,
      extendedCheckoutDate: request.extended_checkout_date || request.requested_to,
    });
    await applyExtensionToBooking(request.booking, totals, transaction);
    await request.update({
      ...buildExtensionRequestValues({
        booking: request.booking,
        totals,
        reason: request.reason,
        status: "approved",
        processedBy: req.user.id,
      }),
      response_text: response_text || "Approved by reception. Manual extension payment pending.",
    }, { transaction });

    await writeAudit({
      action: "EXTENSION_PAYMENT_PENDING",
      entityType: "booking",
      entityId: request.booking_id,
      actor: req.user,
      metadata: extensionAuditMetadata(request),
      transaction,
    });
    await Notification.create({
      target_role: "customer",
      target_id: request.customer_id,
      title: "Extension approved - payment pending",
      message: `Your extension for ${request.booking.booking_ref} is approved. Pay INR ${totals.extensionPayableAmount.toFixed(2)} at reception.`,
      type: "booking",
    }, { transaction });
    await transaction.commit();

    await notifyCustomer(
      `Extension approved for ${request.booking.booking_ref}`,
      request.customer,
      `<p>Your stay is extended to <strong>${totals.extendedCheckoutDate}</strong>.</p>
       <p>Please pay INR ${totals.extensionPayableAmount.toFixed(2)} at reception. Online payment is not used for extensions.</p>`,
      `Your extension for ${request.booking.booking_ref} is approved and manual payment is pending.`
    );
    return res.json({
      success: true,
      data: { request: toExtensionPayload(request), booking: request.booking },
      message: "Extension approved; manual payment confirmation is required",
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function confirmExtensionPayment(req, res) {
  if (!["receptionist", "admin"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      error: "Only a receptionist or admin can confirm extension payment",
    });
  }
  const transaction = await sequelize.transaction();
  try {
    const request = await BookingExtensionRequest.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Extension request not found" });
    }
    if (request.payment_status === "paid" || extensionRemaining(request) === 0) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "Extension payment has already been confirmed" });
    }
    if (request.status !== "approved") {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Extension must be approved before payment confirmation" });
    }

    const booking = await Booking.findByPk(request.booking_id, {
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    const amount = roundMoney(req.body.amount);
    const requiredAmount = extensionRemaining(request);
    if (Math.round(amount * 100) !== Math.round(requiredAmount * 100)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Exact remaining extension payment of INR ${requiredAmount.toFixed(2)} is required`,
      });
    }

    const paymentMode = req.body.payment_mode;
    const reference = String(req.body.transaction_reference || "").trim() || null;
    if (paymentMode !== "cash" && !reference) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Transaction/reference number is required for this payment mode",
      });
    }
    if (reference) {
      const duplicate = await PaymentTransaction.findOne({
        where: { payment_reference: reference },
        transaction,
      });
      if (duplicate) {
        await transaction.rollback();
        return res.status(409).json({ success: false, error: "Transaction reference has already been used" });
      }
    }

    const now = new Date();
    const priorPaid = roundMoney(booking.amount_paid || 0);
    const totalPaid = roundMoney(priorPaid + amount);
    const bookingTotal = roundMoney(booking.total_amount);
    if (totalPaid > bookingTotal) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Confirmed amount exceeds booking total" });
    }
    const bookingRemaining = roundMoney(Math.max(bookingTotal - totalPaid, 0));

    await request.update({
      payment_method: paymentMode,
      payment_status: "paid",
      status: "completed",
      extension_paid_amount: roundMoney(Number(request.extension_paid_amount || 0) + amount),
      extension_remaining_amount: 0,
      payment_reference: reference,
      payment_note: req.body.note || null,
      payment_confirmed_by: req.user.id,
      payment_confirmed_by_role: req.user.role,
      payment_confirmed_at: now,
      completed_at: now,
    }, { transaction });
    await booking.update({
      amount_paid: totalPaid,
      remaining_amount: bookingRemaining,
      payment_status: bookingRemaining === 0 ? "paid" : "partially_paid",
      payment_method: paymentMode,
      payment_mode: paymentMode,
      payment_confirmed_by: req.user.id,
      payment_confirmed_at: now,
      paid_at: bookingRemaining === 0 ? now : booking.paid_at,
    }, { transaction });
    const payment = await PaymentTransaction.create({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      extension_request_id: request.id,
      amount,
      payment_method: paymentMode,
      payment_type: "extension_payment",
      status: "paid",
      payment_reference: reference,
      paid_at: now,
      remarks: req.body.note || `Extension payment confirmed by ${req.user.role} ${req.user.id}`,
      confirmed_by_user_id: req.user.id,
      confirmed_by_role: req.user.role,
      updated_at: now,
    }, { transaction });

    await writeAudit({
      action: "EXTENSION_PAYMENT_CONFIRMED",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: extensionAuditMetadata(request, {
        amount,
        paymentMode,
        reference,
        confirmedBy: req.user.id,
        confirmedByRole: req.user.role,
        note: req.body.note || null,
        ip: req.ip || null,
        userAgent: req.get?.("user-agent") || null,
        paymentTransactionId: payment.id,
      }),
      transaction,
    });
    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Extension payment confirmed",
      message: `INR ${amount.toFixed(2)} extension payment for ${booking.booking_ref} was confirmed by reception.`,
      type: "booking",
    }, { transaction });
    await transaction.commit();

    const refreshed = await BookingExtensionRequest.findByPk(request.id, {
      include: [{ model: PaymentTransaction, as: "paymentTransactions", required: false }],
    });
    return res.json({
      success: true,
      data: {
        extension: toExtensionPayload(refreshed),
        booking,
        payment,
      },
      message: "Extension payment confirmed. Final bill generation is now enabled.",
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function payExtensionRequest(req, res) {
  return res.status(403).json({
    success: false,
    error: "Extension payment must be confirmed manually by hotel reception.",
  });
}

async function getBookingExtensionRequests(req, res) {
  const requests = await BookingExtensionRequest.findAll({
    where: { booking_id: req.params.id, customer_id: req.user.id },
    include: [{ model: PaymentTransaction, as: "paymentTransactions", required: false }],
    order: [["requested_at", "DESC"]],
  });
  const data = requests.map(toExtensionPayload);
  return res.json({ success: true, data, total: data.length, page: 1, limit: data.length || 10 });
}

module.exports = {
  confirmExtensionPayment,
  createBookingExtensionRequest,
  getBookingExtensionRequests,
  listBookingExtensionRequests,
  payExtensionRequest,
  processBookingExtensionRequest,
};
