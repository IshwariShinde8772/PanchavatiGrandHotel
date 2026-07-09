const { Op } = require("sequelize");
const {
  sequelize,
  AuditLog,
  Booking,
  Customer,
  CustomerHistory,
  Feedback,
  HotelSetting,
  Notification,
  PaymentTransaction,
  BookingExtensionRequest,
  Room,
  Staff,
  Task,
  Bill,
  RefundRequest,
} = require("../../../models");
const { calculateGST } = require("../../utils/gst");
const {
  buildHotelDateTime,
  calculateAutoCancelAt,
  diffNights,
  formatToIST,
  getBusinessDate,
  getDateFilterRange,
  normalizeTimeInput,
  parseDateInput,
} = require("../../utils/dateHelpers");
const {
  calculateStayPricing,
  countOverlappingBookings,
  refreshExpiredNoShows,
} = require("../../services/roomService");
const {
  createOrder,
  fetchPayment,
  verifySignature,
} = require("../../services/paymentService");
const { bookingRefFromId } = require("../../utils/billNumber");
const { generateBill } = require("../../services/billService");
const { sendBookingConfirmation, sendRefundEmail } = require("../../services/emailService");
const { calculateCancellationSummary, roundMoney } = require("../../services/cancellationService");
const {
  ACTIVE_NO_SHOW_STATUSES,
  NO_SHOW_CANCELLATION_TYPE,
  NO_SHOW_GRACE_MINUTES,
  autoCancelOverdueBookings,
  processNoShowBooking,
} = require("../../services/reservationService");
const { getPagination } = require("../../utils/pagination");
const { writeAudit } = require("../../services/auditService");
const {
  applyExtensionToBooking,
  buildExtensionRequestValues,
  calculateExtensionAmounts,
  toExtensionPayload,
} = require("../../services/extensionService");
const {
  buildCouponPriceBreakdown,
  consumeCouponForBooking,
  updateCouponUsageForBooking,
} = require("../../services/couponService");
const env = require("../../config/env");

const EARLY_CHECKOUT_POLICY = "No automatic refund for early checkout. Settlement follows hotel policy.";

function ensureBookingDates(checkIn, checkOut) {
  const inDate = parseDateInput(checkIn);
  const outDate = parseDateInput(checkOut);
  const today = parseDateInput(getBusinessDate(new Date(), env.hotelTimeZone));
  const nights = diffNights(checkIn, checkOut);

  if (!inDate || !outDate) {
    const error = new Error("Invalid check-in or check-out date");
    error.status = 400;
    throw error;
  }

  if (nights < 1 || nights > 30) {
    const error = new Error("Stay must be between 1 and 30 nights");
    error.status = 400;
    throw error;
  }

  if (inDate < today) {
    const error = new Error("Check-in cannot be in the past");
    error.status = 400;
    throw error;
  }

  return { nights };
}

function ensurePositiveAmount(amount, message = "Total booking amount is invalid") {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  return parsed;
}

function buildBookingCheckInSchedule(checkIn, checkInTime, now = new Date()) {
  const normalizedTime = normalizeTimeInput(checkInTime);
  const checkInDateTime = buildHotelDateTime(checkIn, normalizedTime, env.hotelTimeZone);
  const autoCancelAt = calculateAutoCancelAt(
    checkIn,
    normalizedTime,
    NO_SHOW_GRACE_MINUTES,
    env.hotelTimeZone
  );

  if (!normalizedTime || !checkInDateTime || !autoCancelAt) {
    throw Object.assign(new Error("A valid check-in time is required"), { status: 400 });
  }
  if (autoCancelAt.getTime() <= now.getTime()) {
    throw Object.assign(
      new Error("The selected check-in time and 1 hour grace period have already passed"),
      { status: 400 }
    );
  }

  return {
    checkInTime: normalizedTime,
    checkInDateTime,
    autoCancelAt,
    noShowGraceMinutes: NO_SHOW_GRACE_MINUTES,
  };
}

function addNoShowFieldAliases(booking) {
  return {
    ...booking,
    check_in_time: booking.checkInTime ?? null,
    check_in_datetime: booking.checkInDateTime ?? null,
    auto_cancel_at: booking.autoCancelAt ?? null,
    no_show_grace_minutes: booking.noShowGraceMinutes ?? 60,
    auto_cancellation_reason: booking.autoCancellationReason ?? null,
    auto_cancelled_at: booking.autoCancelledAt ?? null,
    cancellation_type: booking.cancellationType ?? null,
    refund_request_created_at: booking.refundRequestCreatedAt ?? null,
  };
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function getBookedDateValidation(action, bookedDate) {
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  const normalizedBookedDate = String(bookedDate || "");
  if (normalizedBookedDate === today) {
    return null;
  }

  const label = action === "check-in" ? "Check-in" : "Check-out";
  if (normalizedBookedDate > today) {
    return `${label} is available on ${normalizedBookedDate}`;
  }

  return `${label} was scheduled for ${normalizedBookedDate} and is not available through the normal flow`;
}

async function resolveSafeCustomerUpdates({ customer, guest, transaction }) {
  const updates = {
    full_name: normalizeOptionalText(guest?.full_name) || customer.full_name,
    nationality: normalizeOptionalText(guest?.nationality) || customer.nationality,
    id_type: guest?.id_type || customer.id_type,
    id_number: normalizeOptionalText(guest?.id_number) || customer.id_number,
    id_expiry: normalizeOptionalText(guest?.id_expiry) || customer.id_expiry,
    id_doc_url: normalizeOptionalText(guest?.id_doc_url) || customer.id_doc_url,
    id_doc_public_id: normalizeOptionalText(guest?.id_doc_public_id) || customer.id_doc_public_id,
    live_photo_url: normalizeOptionalText(guest?.live_photo_url),
    live_photo_public_id: normalizeOptionalText(guest?.live_photo_public_id),
  };

  const requestedEmail = normalizeOptionalText(guest?.email);
  if (requestedEmail && requestedEmail !== customer.email) {
    const emailConflict = await Customer.findOne({
      where: {
        id: { [Op.ne]: customer.id },
        email: requestedEmail,
      },
      transaction,
    });

    if (!emailConflict) {
      updates.email = requestedEmail;
    } else {
      console.warn("Skipped customer email update due to unique conflict", {
        customerId: customer.id,
        email: requestedEmail,
        conflictingCustomerId: emailConflict.id,
      });
    }
  }

  const requestedPhone = normalizeOptionalText(guest?.phone);
  if (requestedPhone && requestedPhone !== customer.phone) {
    const phoneConflict = await Customer.findOne({
      where: {
        id: { [Op.ne]: customer.id },
        phone: requestedPhone,
      },
      transaction,
    });

    if (!phoneConflict) {
      updates.phone = requestedPhone;
    } else {
      console.warn("Skipped customer phone update due to unique conflict", {
        customerId: customer.id,
        phone: requestedPhone,
        conflictingCustomerId: phoneConflict.id,
      });
    }
  }

  return updates;
}

async function prepareBookingData({ roomId, checkIn, checkOut, guests, transaction, lockRows = false }) {
  if (!transaction) {
    await refreshExpiredNoShows();
  }
  const room = await Room.findByPk(roomId, {
    transaction,
    ...(lockRows && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!room || !room.is_active || room.status !== "available") {
    const error = new Error(room ? "Room is not available for booking" : "Room not found");
    error.status = room ? 409 : 404;
    throw error;
  }

  const { nights } = ensureBookingDates(checkIn, checkOut);
  const overlapCount = await countOverlappingBookings({
    roomId,
    checkIn,
    checkOut,
    transaction,
    lockRows,
  });

  if (overlapCount >= Number(room.total_units)) {
    const error = new Error("Room is not available for the selected dates");
    error.status = 409;
    throw error;
  }

  const guestCount = Number(guests);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    const error = new Error("Guest count is required");
    error.status = 400;
    throw error;
  }

  if (guestCount > Number(room.capacity)) {
    const error = new Error("Guest count exceeds room capacity");
    error.status = 400;
    throw error;
  }

  const settings = await HotelSetting.findByPk(1, { transaction });
  const stayPricing = await calculateStayPricing(room, checkIn, checkOut);
  const fare = stayPricing.totalFare;
  const gst = calculateGST(fare, settings?.gst_percent ?? env.gstPercent);

  return {
    room,
    settings,
    nights,
    price: {
      basePrice: Number(room.base_price),
      pricePerNight: stayPricing.averagePricePerNight,
      offer: stayPricing.offer,
      offers: stayPricing.offers,
      nightlyRates: stayPricing.nightlyRates,
    },
    baseAmount: stayPricing.baseAmount,
    discountAmount: stayPricing.discountAmount,
    fare,
    gst,
  };
}

function ensureRazorpayConfigured() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    const error = new Error("Razorpay payment is not configured");
    error.status = 503;
    throw error;
  }
}

function paymentOrderPayload(booking, paymentTransaction) {
  return {
    booking,
    booking_id: booking.id,
    order_id: paymentTransaction.razorpay_order_id,
    razorpayOrderId: paymentTransaction.razorpay_order_id,
    amount: Math.round(Number(paymentTransaction.amount) * 100),
    amount_rupees: Number(paymentTransaction.amount),
    currency: paymentTransaction.currency || "INR",
    key: env.razorpay.keyId,
    payment_type: paymentTransaction.payment_type,
  };
}

async function createPaymentOrderRecord({ booking, amount, paymentType, transaction }) {
  const payable = roundMoney(ensurePositiveAmount(amount, "Payment amount is invalid"));
  const existing = await PaymentTransaction.findOne({
    where: {
      booking_id: booking.id,
      payment_type: paymentType,
      amount: payable,
      status: "pending",
    },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  if (existing?.razorpay_order_id) {
    if (booking.razorpay_order_id !== existing.razorpay_order_id) {
      await booking.update({
        razorpay_order_id: existing.razorpay_order_id,
        payment_status: Number(booking.amount_paid || 0) > 0 ? booking.payment_status : "pending",
      }, { transaction });
    }
    return existing;
  }

  const receipt = `b${booking.id}_${paymentType.replace(/[^a-z]/g, "").slice(0, 8)}_${Date.now()}`.slice(0, 40);
  const order = await createOrder({
    amount: Math.round(payable * 100),
    currency: "INR",
    receipt,
  });

  if (!order || order.mocked || !order.id) {
    const error = new Error("A real Razorpay order could not be created");
    error.status = 503;
    throw error;
  }

  await booking.update({
    razorpay_order_id: order.id,
    payment_status: Number(booking.amount_paid || 0) > 0 ? booking.payment_status : "pending",
  }, { transaction });

  return PaymentTransaction.create({
    booking_id: booking.id,
    customer_id: booking.customer_id,
    amount: payable,
    currency: order.currency || "INR",
    payment_method: "online",
    payment_type: paymentType,
    status: "pending",
    razorpay_order_id: order.id,
    payment_reference: order.id,
    remarks: `Razorpay ${paymentType.replaceAll("_", " ")} order`,
  }, { transaction });
}

async function quoteBooking(req, res) {
  const schedule = buildBookingCheckInSchedule(
    req.body.check_in,
    req.body.check_in_time
  );
  const prepared = await prepareBookingData({
    roomId: req.body.room_id,
    checkIn: req.body.check_in,
    checkOut: req.body.check_out,
    guests: req.body.guests,
  });
  const pricing = await buildCouponPriceBreakdown({
    prepared,
    customerId: req.user.id,
  });
  const totalAmount = ensurePositiveAmount(pricing.finalPayableAmount);
  const advanceRequired = roundMoney(totalAmount * 0.1);

  return res.json({
    success: true,
    data: {
      room: prepared.room,
      check_in: req.body.check_in,
      check_in_time: schedule.checkInTime,
      check_in_datetime: schedule.checkInDateTime,
      auto_cancel_at: schedule.autoCancelAt,
      no_show_grace_minutes: schedule.noShowGraceMinutes,
      check_out: req.body.check_out,
      guests: req.body.guests,
      nights: prepared.nights,
      nightly_rates: prepared.price.nightlyRates,
      fare_per_night: prepared.price.pricePerNight,
      base_amount: pricing.baseAmount,
      discount_amount: pricing.offerDiscountAmount,
      offer_discount_amount: pricing.offerDiscountAmount,
      amount_after_offer: pricing.amountAfterOffer,
      coupon_discount_amount: 0,
      amount_after_coupon: pricing.amountAfterCoupon,
      applied_coupon_code: null,
      total_fare: pricing.amountAfterCoupon,
      gst_percent: pricing.gst.gstPercent,
      gst_amount: pricing.gst.gstAmount,
      final_payable_amount: totalAmount,
      total_amount: totalAmount,
      advance_required: advanceRequired,
      remaining_after_advance: roundMoney(totalAmount - advanceRequired),
      offers: prepared.price.offers,
      available: true,
    },
  });
}

async function createBooking(req, res) {
  ensureRazorpayConfigured();
  await refreshExpiredNoShows();
  const transaction = await sequelize.transaction();

  try {
    const {
      room_id,
      check_in,
      check_in_time,
      check_out,
      guests,
      special_requests,
      payment_method,
      checkout_token,
      coupon_code,
      guest,
    } = req.body;
    const schedule = buildBookingCheckInSchedule(check_in, check_in_time);
    const customer = await Customer.findByPk(req.user.id, { transaction });
    if (!customer) {
      const error = new Error("Customer account not found");
      error.status = 404;
      throw error;
    }

    const customerUpdates = await resolveSafeCustomerUpdates({ customer, guest, transaction });
    if (!customerUpdates.id_type || !customerUpdates.id_number) {
      throw Object.assign(new Error("ID type and ID number are required"), { status: 400 });
    }
    if (!customerUpdates.id_doc_url || !customerUpdates.id_doc_public_id) {
      throw Object.assign(new Error("ID proof photo is required"), { status: 400 });
    }
    if (!customerUpdates.live_photo_url || !customerUpdates.live_photo_public_id) {
      throw Object.assign(new Error("A fresh live customer photo is required"), { status: 400 });
    }
    await customer.update(customerUpdates, { transaction });

    const prepared = await prepareBookingData({
      roomId: room_id,
      checkIn: check_in,
      checkOut: check_out,
      guests,
      transaction,
      lockRows: true,
    });
    const pricing = await buildCouponPriceBreakdown({
      prepared,
      couponCode: coupon_code,
      customerId: customer.id,
      transaction,
    });
    const totalAmount = roundMoney(ensurePositiveAmount(pricing.finalPayableAmount));
    const isReservation = payment_method === "pay_later";
    const advanceAmount = isReservation ? roundMoney(totalAmount * 0.1) : 0;
    const paymentType = isReservation ? "reservation_advance" : "full_booking";
    const payableNow = isReservation ? advanceAmount : totalAmount;

    let booking = await Booking.findOne({
      where: { checkout_token, customer_id: customer.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (booking) {
      const sameSelection = Number(booking.room_id) === Number(room_id)
        && String(booking.check_in) === String(check_in)
        && String(booking.checkInTime) === schedule.checkInTime
        && String(booking.check_out) === String(check_out)
        && Number(booking.guests) === Number(guests)
        && booking.reservation_type === (isReservation ? "reserved_booking" : "confirmed_booking");
      if (!sameSelection) {
        throw Object.assign(new Error("This checkout session belongs to a different stay selection"), { status: 409 });
      }
      if (booking.status !== "pending" || Number(booking.amount_paid || 0) > 0) {
        throw Object.assign(new Error("This checkout session has already been completed"), { status: 409 });
      }

      await booking.update({
        checkInTime: schedule.checkInTime,
        checkInDateTime: schedule.checkInDateTime,
        autoCancelAt: schedule.autoCancelAt,
        noShowGraceMinutes: schedule.noShowGraceMinutes,
        fare_per_night: prepared.price.pricePerNight,
        base_amount: pricing.baseAmount,
        discount_amount: pricing.offerDiscountAmount,
        offer_discount_amount: pricing.offerDiscountAmount,
        amount_after_offer: pricing.amountAfterOffer,
        offer_id: prepared.price.offer?.id || null,
        coupon_id: pricing.coupon?.id || null,
        applied_coupon_code: pricing.coupon?.code || null,
        coupon_discount_amount: pricing.couponDiscountAmount,
        total_fare: pricing.amountAfterCoupon,
        gst_percent: pricing.gst.gstPercent,
        gst_amount: pricing.gst.gstAmount,
        final_payable_amount: totalAmount,
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        remaining_amount: totalAmount,
        special_requests,
        payment_status: "pending",
      }, { transaction });
    } else {
      booking = await Booking.create({
        customer_id: customer.id,
        room_id,
        check_in,
        checkInTime: schedule.checkInTime,
        checkInDateTime: schedule.checkInDateTime,
        autoCancelAt: schedule.autoCancelAt,
        noShowGraceMinutes: schedule.noShowGraceMinutes,
        check_out,
        nights: prepared.nights,
        guests,
        fare_per_night: prepared.price.pricePerNight,
        base_amount: pricing.baseAmount,
        discount_amount: pricing.offerDiscountAmount,
        offer_discount_amount: pricing.offerDiscountAmount,
        amount_after_offer: pricing.amountAfterOffer,
        offer_id: prepared.price.offer?.id || null,
        coupon_id: pricing.coupon?.id || null,
        applied_coupon_code: pricing.coupon?.code || null,
        coupon_discount_amount: pricing.couponDiscountAmount,
        total_fare: pricing.amountAfterCoupon,
        gst_percent: pricing.gst.gstPercent,
        gst_amount: pricing.gst.gstAmount,
        final_payable_amount: totalAmount,
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        advance_paid: 0,
        amount_paid: 0,
        remaining_amount: totalAmount,
        booking_type: "online",
        reservation_type: isReservation ? "reserved_booking" : "confirmed_booking",
        checkout_token,
        special_requests,
        payment_method: "online",
        payment_status: "pending",
        status: "pending",
        booked_by: "customer",
        created_by_user_id: customer.id,
      }, { transaction });
      await booking.update({ booking_ref: bookingRefFromId(booking.id, new Date()) }, { transaction });
    }

    const paymentTransaction = await createPaymentOrderRecord({
      booking,
      amount: payableNow,
      paymentType,
      transaction,
    });
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: paymentOrderPayload(booking, paymentTransaction),
      message: isReservation
        ? "Complete the verified 10% payment to reserve this room"
        : "Complete Razorpay Checkout to confirm this booking",
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function createRefundForAvailabilityConflict({
  booking,
  customer,
  pendingPayment,
  gatewayPayment,
  signature,
  transaction,
  conflictReason = "Room became unavailable while Razorpay Checkout was in progress",
  conflictCode = "availability-conflict",
}) {
  const amount = roundMoney(Number(gatewayPayment.amount) / 100);
  const now = new Date();
  await pendingPayment.update({
    status: "paid",
    razorpay_payment_id: gatewayPayment.id,
    razorpay_signature: signature,
    payment_reference: gatewayPayment.id,
    paid_at: now,
    remarks: `Captured after payment conflict: ${conflictReason}; refund is pending admin approval`,
  }, { transaction });
  await booking.update({
    status: "cancelled",
    payment_status: "paid",
    razorpay_payment_id: gatewayPayment.id,
    razorpay_signature: signature,
    payment_mode: "online",
    paid_at: now,
    amount_paid: amount,
    remaining_amount: booking.total_amount,
    refund_amount: amount,
    refund_status: "pending_admin_approval",
    cancellation_reason: conflictReason,
    cancelled_by: `system:${conflictCode}`,
    cancelled_at: now,
  }, { transaction });

  await RefundRequest.findOrCreate({
    where: { booking_id: booking.id },
    defaults: {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      customer_name: customer?.full_name || "Customer",
      customer_email: customer?.email || null,
      customer_phone: customer?.phone || null,
      total_booking_amount: booking.total_amount,
      amount_paid: amount,
      cancellation_charge: 0,
      refund_amount: amount,
      refund_reason: `Automatic refund: ${conflictReason}`,
      cancellation_policy_applied: `${conflictCode.replace(/-/g, "_")}_full_refund`,
      status: "pending_admin_approval",
      payment_reference_id: gatewayPayment.id,
      razorpay_payment_id: gatewayPayment.id,
    },
    transaction,
  });

  return { status: "pending_admin_approval" };
}

async function verifyOnlineBookingPayment({ req, res, bookingId }) {
  ensureRazorpayConfigured();
  await refreshExpiredNoShows();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findOne({
      where: { id: bookingId, customer_id: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

    const alreadyRecorded = await PaymentTransaction.findOne({
      where: {
        booking_id: booking.id,
        razorpay_payment_id,
        status: "paid",
      },
      transaction,
    });
    if (alreadyRecorded) {
      await transaction.commit();
      return res.json({
        success: true,
        data: { booking, bookingRef: booking.booking_ref },
        message: "Payment already verified",
      });
    }

    const pendingPayment = await PaymentTransaction.findOne({
      where: {
        booking_id: booking.id,
        razorpay_order_id,
        status: "pending",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!pendingPayment || booking.razorpay_order_id !== razorpay_order_id) {
      throw Object.assign(new Error("Payment order does not match this booking"), { status: 400 });
    }
    if (!verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })) {
      throw Object.assign(new Error("Payment verification failed"), { status: 400 });
    }

    const gatewayPayment = await fetchPayment(razorpay_payment_id);
    const expectedPaise = Math.round(Number(pendingPayment.amount) * 100);
    if (
      gatewayPayment.order_id !== razorpay_order_id
      || gatewayPayment.currency !== "INR"
      || Number(gatewayPayment.amount) !== expectedPaise
      || gatewayPayment.status !== "captured"
    ) {
      throw Object.assign(new Error("Captured Razorpay payment does not match the server order"), { status: 400 });
    }

    const room = await Room.findByPk(booking.room_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const overlaps = room
      ? await countOverlappingBookings({
          roomId: booking.room_id,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          excludeBookingId: booking.id,
          transaction,
          lockRows: true,
        })
      : Number.POSITIVE_INFINITY;

    if (!room || !room.is_active || room.status !== "available" || overlaps >= Number(room.total_units)) {
      const customer = await Customer.findByPk(booking.customer_id, { transaction });
      await createRefundForAvailabilityConflict({
        booking,
        customer,
        pendingPayment,
        gatewayPayment,
        signature: razorpay_signature,
        transaction,
      });
      await transaction.commit();
      return res.status(409).json({
        success: false,
        error: "Room became unavailable after payment. A full refund request is pending admin approval.",
      });
    }

    const paidNow = roundMoney(Number(gatewayPayment.amount) / 100);
    const previousPaid = roundMoney(booking.amount_paid || booking.advance_paid || 0);
    const totalAmount = roundMoney(
      Number(booking.final_payable_amount || 0) > 0
        ? booking.final_payable_amount
        : booking.total_amount
    );
    const totalPaid = roundMoney(previousPaid + paidNow);
    if (totalPaid > totalAmount) {
      throw Object.assign(new Error("Payment exceeds the server-calculated booking total"), { status: 400 });
    }

    const advanceRequired = roundMoney(totalAmount * 0.1);
    const fullyPaid = totalPaid >= totalAmount;
    if (pendingPayment.payment_type === "full_booking" && !fullyPaid) {
      throw Object.assign(new Error("Full booking payment amount is incomplete"), { status: 400 });
    }
    if (pendingPayment.payment_type === "reservation_advance" && totalPaid < advanceRequired) {
      throw Object.assign(new Error("Reservation advance is less than the required 10%"), { status: 400 });
    }

    const now = new Date();
    const isReservationPayment = pendingPayment.payment_type !== "full_booking";
    try {
      await consumeCouponForBooking({
        booking,
        room,
        bookingStatus: fullyPaid ? "confirmed" : "reserved",
        transaction,
      });
    } catch (couponValidationError) {
      if (!String(couponValidationError.code || "").startsWith("COUPON_")) {
        throw couponValidationError;
      }
      const customer = await Customer.findByPk(booking.customer_id, { transaction });
      await createRefundForAvailabilityConflict({
        booking,
        customer,
        pendingPayment,
        gatewayPayment,
        signature: razorpay_signature,
        transaction,
        conflictReason: `Coupon could no longer be redeemed: ${couponValidationError.message}`,
        conflictCode: "coupon-redemption-conflict",
      });
      await transaction.commit();
      return res.status(409).json({
        success: false,
        error: "Coupon could no longer be redeemed after payment. A full refund request is pending admin approval.",
      });
    }

    await pendingPayment.update({
      status: "paid",
      razorpay_payment_id,
      razorpay_signature,
      payment_reference: razorpay_payment_id,
      paid_at: now,
      updated_at: now,
      remarks: fullyPaid ? "Razorpay payment verified in full" : "Razorpay reservation advance verified",
    }, { transaction });
    await booking.update({
      status: fullyPaid ? "confirmed" : "reserved",
      reservation_type: fullyPaid ? "confirmed_booking" : booking.reservation_type,
      payment_status: fullyPaid ? "paid" : "partially_paid",
      payment_method: "online",
      payment_mode: "online",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount_paid: totalPaid,
      advance_paid: isReservationPayment || booking.reservation_type === "reserved_booking"
        ? Math.min(totalPaid, advanceRequired)
        : 0,
      remaining_amount: roundMoney(Math.max(totalAmount - totalPaid, 0)),
      paid_at: now,
    }, { transaction });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: fullyPaid ? "Booking Confirmed" : "Reservation Confirmed",
      message: fullyPaid
        ? `Your booking ${booking.booking_ref} is confirmed and fully paid.`
        : `Your 10% advance for ${booking.booking_ref} is verified and the room is reserved.`,
      type: "payment",
    }, { transaction });
    await Notification.create({
      target_role: "receptionist",
      title: fullyPaid ? "New Confirmed Booking" : "New Paid Reservation",
      message: fullyPaid
        ? `${booking.booking_ref} is fully paid and ready for arrival.`
        : `${booking.booking_ref} is reserved with a verified 10% advance.`,
      type: "booking",
    }, { transaction });
    await writeAudit({
      action: fullyPaid ? "online_booking_payment_verified" : "online_reservation_advance_verified",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: {
        amount: paidNow,
        paymentId: razorpay_payment_id,
        paymentType: pendingPayment.payment_type,
      },
      transaction,
    });
    await transaction.commit();

    const deadline = booking.autoCancelAt ? new Date(booking.autoCancelAt) : null;
    if (
      deadline
      && !Number.isNaN(deadline.getTime())
      && now.getTime() >= deadline.getTime()
    ) {
      const noShowResult = await processNoShowBooking(booking.id, { now });
      return res.status(409).json({
        success: false,
        data: {
          booking: noShowResult.booking || booking,
          refund_status: noShowResult.refundStatus,
          refund_amount: noShowResult.summary?.refundAmount || 0,
        },
        error: "Payment was verified, but the booking was cancelled because the no-show deadline had passed.",
      });
    }

    if (fullyPaid) {
      try {
        const [customer, settings] = await Promise.all([
          Customer.findByPk(booking.customer_id),
          HotelSetting.findByPk(1),
        ]);
        await sendBookingConfirmation(booking, customer, settings);
      } catch (emailError) {
        console.warn("Booking confirmation email failed", { bookingId: booking.id, message: emailError.message });
      }
    }

    return res.json({
      success: true,
      data: { booking, bookingRef: booking.booking_ref },
      message: fullyPaid ? "Payment verified and booking confirmed" : "Advance verified and room reserved",
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function verifyBookingPayment(req, res) {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    return res.status(503).json({
      success: false,
      error: "Payment verification is temporarily unavailable",
      message: "Razorpay verification is not configured on the server",
    });
  }
  return verifyOnlineBookingPayment({
    req,
    res,
    bookingId: req.body.booking_id,
  });
}

async function markBookingPaymentFailed(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, customer_id: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

    const payment = await PaymentTransaction.findOne({
      where: {
        booking_id: booking.id,
        razorpay_order_id: req.body.razorpay_order_id,
        status: "pending",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (payment) {
      await payment.update({
        status: "failed",
        remarks: req.body.reason || "Razorpay Checkout failed or was closed",
        updated_at: new Date(),
      }, { transaction });
    }
    if (Number(booking.amount_paid || 0) <= 0 && booking.status === "pending") {
      await booking.update({ payment_status: "failed" }, { transaction });
    }
    await transaction.commit();
    return res.json({ success: true, message: "Payment attempt recorded without blocking the room" });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function listCustomerBookings(req, res) {
  await autoCancelOverdueBookings();
  const bookings = await Booking.findAll({
    where: { customer_id: req.user.id },
    include: [
      { model: Room, as: "room" },
      { model: Bill, as: "bill", required: false },
      { association: "history", required: false },
      { model: PaymentTransaction, as: "transactions", required: false },
      { association: "extensionRequests", required: false, separate: true, order: [["requested_at", "ASC"]] },
      { model: RefundRequest, as: "refundRequest", required: false },
    ],
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: bookings,
    total: bookings.length,
    page: 1,
    limit: bookings.length || 10,
  });
}

async function getCustomerBooking(req, res) {
  const where = { id: req.params.id, customer_id: req.user.id };
  let booking = await Booking.findOne({
    where,
  });
  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  await processNoShowBooking(booking.id);
  booking = await Booking.findOne({
    where,
    include: [
      { model: Room, as: "room" },
      { model: Bill, as: "bill", required: false },
      { association: "history", required: false },
      { model: PaymentTransaction, as: "transactions", required: false },
      { association: "extensionRequests", required: false, separate: true, order: [["requested_at", "ASC"]] },
      { model: RefundRequest, as: "refundRequest", required: false },
    ],
  });

  return res.json({ success: true, data: booking });
}

async function createReservedPaymentOrder(req, res) {
  ensureRazorpayConfigured();
  await refreshExpiredNoShows();
  const noShowResult = await processNoShowBooking(req.params.id);
  if (
    noShowResult.cancelled
    || noShowResult.reason === "already_auto_cancelled"
  ) {
    throw Object.assign(
      new Error("Booking has been cancelled due to no-show."),
      { status: 400 }
    );
  }
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, customer_id: req.user.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });
    if (booking.reservation_type !== "reserved_booking" || !["pending", "reserved"].includes(booking.status)) {
      throw Object.assign(new Error("This booking is not eligible for reserved-room payment"), { status: 400 });
    }

    const room = await Room.findByPk(booking.room_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const overlapCount = await countOverlappingBookings({
      roomId: booking.room_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      excludeBookingId: booking.id,
      transaction,
      lockRows: true,
    });
    if (!room || !room.is_active || room.status !== "available" || overlapCount >= Number(room.total_units)) {
      throw Object.assign(new Error("Room is no longer available for the selected dates"), { status: 409 });
    }

    const total = roundMoney(
      Number(booking.final_payable_amount || 0) > 0
        ? booking.final_payable_amount
        : booking.total_amount
    );
    const paid = roundMoney(booking.amount_paid || booking.advance_paid || 0);
    const requiredAdvance = roundMoney(total * 0.1);
    const paymentType = paid < requiredAdvance ? "reservation_advance" : "reservation_balance";
    const payable = paymentType === "reservation_advance"
      ? roundMoney(requiredAdvance - paid)
      : roundMoney(total - paid);
    if (payable <= 0) throw Object.assign(new Error("Booking is already fully paid"), { status: 409 });

    const paymentTransaction = await createPaymentOrderRecord({
      booking,
      amount: payable,
      paymentType,
      transaction,
    });
    await transaction.commit();
    return res.json({
      success: true,
      data: paymentOrderPayload(booking, paymentTransaction),
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function verifyReservedPayment(req, res) {
  return verifyOnlineBookingPayment({
    req,
    res,
    bookingId: req.params.id,
  });
}

async function previewCancellation(req, res) {
  const where = req.user.role === "customer"
    ? { id: req.params.id, customer_id: req.user.id }
    : { id: req.params.id };
  const booking = await Booking.findOne({ where });
  if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
  if (!["confirmed", "reserved"].includes(String(booking.status))) {
    return res.status(400).json({ success: false, error: `Booking with status "${booking.status}" cannot be cancelled` });
  }
  const summary = calculateCancellationSummary(booking, await HotelSetting.findByPk(1));
  return res.json({ success: true, data: summary });
}

async function cancelBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (req.user.role === "customer" && booking.customer_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: "You cannot cancel this booking" });
    }

    const status = String(booking.status || "").toLowerCase();
    if (!["confirmed", "reserved"].includes(status)) {
      const messageByStatus = {
        pending: "Pending bookings cannot be cancelled. Only confirmed bookings can be cancelled.",
        checked_in: "Checked-in bookings cannot be cancelled.",
        checked_out: "Checked-out bookings cannot be cancelled.",
        cancelled: "This booking has already been cancelled.",
        rejected: "Rejected bookings cannot be cancelled.",
        completed: "Completed bookings cannot be cancelled.",
      };

      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: messageByStatus[status] || `Booking with status "${status}" cannot be cancelled.`,
      });
    }

    const settings = await HotelSetting.findByPk(1, { transaction });
    const cancellationSummary = calculateCancellationSummary(booking, settings);
    const penalty = cancellationSummary.cancellationCharge;
    let refundRequest = null;

    if (cancellationSummary.refundAmount > 0) {
      const duplicateRefund = await RefundRequest.findOne({
        where: { booking_id: booking.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (duplicateRefund) {
        throw Object.assign(new Error("A refund request already exists for this booking"), { status: 409 });
      }
    }

    await booking.update({
      status: "cancelled",
      cancelled_at: new Date(),
      cancellation_reason: req.body.reason,
      cancellation_charge: penalty,
      refund_amount: cancellationSummary.refundAmount,
      refund_status: cancellationSummary.refundAmount > 0 ? "pending_admin_approval" : "not_applicable",
      cancellation_policy_applied: cancellationSummary.policyApplied,
      cancelled_by: `${req.user.role}:${req.user.id}`,
    }, { transaction });
    await updateCouponUsageForBooking(
      booking.id,
      { booking_status: "cancelled" },
      transaction
    );

    if (cancellationSummary.refundAmount > 0) {
      refundRequest = await RefundRequest.create({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        customer_name: booking.customer?.full_name || "Customer",
        customer_email: booking.customer?.email || null,
        customer_phone: booking.customer?.phone || null,
        total_booking_amount: cancellationSummary.totalAmount,
        amount_paid: cancellationSummary.paidAmount,
        cancellation_charge: cancellationSummary.cancellationCharge,
        refund_amount: cancellationSummary.refundAmount,
        refund_reason: req.body.reason,
        cancellation_policy_applied: cancellationSummary.policyApplied,
        status: "pending_admin_approval",
        payment_reference_id: booking.razorpay_payment_id || null,
        razorpay_payment_id: booking.razorpay_payment_id || null,
        hotel_upi_id: settings?.upi_id || null,
      }, { transaction });
      await writeAudit({
        action: "refund_request_created",
        entityType: "refund_request",
        entityId: refundRequest.id,
        actor: req.user,
        metadata: { bookingId: booking.id, refundAmount: cancellationSummary.refundAmount },
        transaction,
      });
    }
    await writeAudit({
      action: booking.reservation_type === "reserved_booking" ? "reservation_cancelled" : "booking_cancelled",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: { policy: cancellationSummary.policyApplied, refundAmount: cancellationSummary.refundAmount },
      transaction,
    });

    await PaymentTransaction.update(
      {
        status: "cancelled",
        updated_at: new Date(),
        remarks: req.body.reason || "Booking cancelled",
      },
      {
        where: {
          booking_id: booking.id,
          status: "pending",
        },
        transaction,
      }
    );

    if (booking.room && booking.room.status === "occupied") {
      const activeCheckedInCount = await Booking.count({
        where: {
          room_id: booking.room_id,
          status: "checked_in",
        },
        transaction,
      });

      if (activeCheckedInCount === 0) {
        await booking.room.update({ status: "available" }, { transaction });
      }
    }

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Booking Cancelled",
      message: cancellationSummary.refundAmount > 0
        ? `${booking.booking_ref} has been cancelled. Refund status: Pending Admin Approval.`
        : `${booking.booking_ref} has been cancelled. No refund is applicable under the cancellation policy.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    try {
      if (typeof sendRefundEmail === "function") await sendRefundEmail(
        refundRequest ? "requested" : "no_refund",
        refundRequest || {
          amount_paid: cancellationSummary.paidAmount,
          cancellation_charge: cancellationSummary.cancellationCharge,
          refund_amount: 0,
          cancellation_policy_applied: cancellationSummary.policyApplied,
        },
        booking,
        booking.customer,
        settings
      );
    } catch (emailError) {
      console.warn("Cancellation email failed", { bookingId: booking.id, message: emailError.message });
    }

    return res.json({
      success: true,
      data: {
        booking,
        penalty,
        refund: cancellationSummary.refundAmount,
        hours_remaining: cancellationSummary.hoursRemaining,
        total_amount: cancellationSummary.totalAmount,
        paid_amount: cancellationSummary.paidAmount,
        cancellation_charge: cancellationSummary.cancellationCharge,
        refund_amount: cancellationSummary.refundAmount,
        base_amount: cancellationSummary.baseAmount,
        offer_discount_amount: cancellationSummary.offerDiscountAmount,
        coupon_discount_amount: cancellationSummary.couponDiscountAmount,
        final_paid_amount: cancellationSummary.paidAmount,
        policy_applied: cancellationSummary.policyApplied,
        refund_status: refundRequest ? "pending_admin_approval" : "not_applicable",
        policy_message: cancellationSummary.message,
      },
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function listAllBookings(req, res) {
  await autoCancelOverdueBookings();

  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  const roomWhere = {};
  const bookingClauses = [];
  const parseList = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  if (req.query.status) {
    const statuses = parseList(req.query.status);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (req.query.payment_status) {
    const paymentStatuses = parseList(req.query.payment_status);
    where.payment_status = paymentStatuses.length > 1 ? { [Op.in]: paymentStatuses } : paymentStatuses[0];
  }

  if (req.query.booked_by) {
    const bookedByValues = parseList(req.query.booked_by);
    where.booked_by = bookedByValues.length > 1 ? { [Op.in]: bookedByValues } : bookedByValues[0];
  }

  if (req.query.reservation_type) {
    where.reservation_type = req.query.reservation_type;
  }

  if (req.query.q) {
    const query = `%${req.query.q}%`;
    bookingClauses.push({ [Op.or]: [
      { booking_ref: { [Op.like]: query } },
      { "$customer.full_name$": { [Op.like]: query } },
      { "$customer.phone$": { [Op.like]: query } },
      { "$room.room_number$": { [Op.like]: query } },
    ] });
  }

  const dateFilter = req.query.date_filter || req.query.dateFilter;
  const dateRange = getDateFilterRange(dateFilter, new Date(), env.hotelTimeZone);
  if (dateRange) {
    const dateCondition = { [Op.between]: [dateRange.start, dateRange.end] };
    const dateScope = req.query.date_scope || req.query.dateScope;
    bookingClauses.push(dateScope === "check_in_out"
      ? { [Op.or]: [
        { check_in: dateCondition },
        { check_out: dateCondition },
        { status: "checked_in" },
      ] }
      : { check_in: dateCondition });
  }

  if (bookingClauses.length) {
    where[Op.and] = bookingClauses;
  }

  if (req.query.category) {
    roomWhere.category = req.query.category;
  }

  const { count, rows } = await Booking.findAndCountAll({
    where,
    include: [
      {
        model: Customer,
        as: "customer",
        required: false,
        attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] },
      },
      {
        model: Room,
        as: "room",
        where: Object.keys(roomWhere).length ? roomWhere : undefined,
        required: Boolean(req.query.category),
      },
      { model: Bill, as: "bill", required: false },
      { model: PaymentTransaction, as: "transactions", required: false },
      { association: "extensionRequests", required: false, separate: true, order: [["requested_at", "ASC"]] },
    ],
    order: [["created_at", "DESC"]],
    offset,
    limit,
    distinct: true,
    subQuery: false,
  });
  const bookingAuditLogs = AuditLog?.findAll && rows.length
    ? await AuditLog.findAll({
      where: {
        entity_type: "booking",
        entity_id: { [Op.in]: rows.map((row) => row.id) },
        action: {
          [Op.in]: [
            "EXTENSION_CREATED",
            "EXTENSION_PAYMENT_PENDING",
            "EXTENSION_PAYMENT_CONFIRMED",
            "BILL_GENERATED_AFTER_EXTENSION",
          ],
        },
      },
      order: [["created_at", "ASC"]],
    })
    : [];
  const auditLogsByBooking = bookingAuditLogs.reduce((grouped, logRecord) => {
    const log = typeof logRecord.get === "function"
      ? logRecord.get({ plain: true })
      : logRecord;
    grouped[log.entity_id] = grouped[log.entity_id] || [];
    grouped[log.entity_id].push(log);
    return grouped;
  }, {});

  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  const data = rows.map((record) => {
    const booking = record.get({ plain: true });
    const transactionPaid = (booking.transactions || [])
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const storedPaid = Number(booking.amount_paid || booking.advance_paid || 0);
    booking.amount_paid = roundMoney(Math.max(
      storedPaid,
      transactionPaid,
      booking.payment_status === "paid" ? Number(booking.total_amount || 0) : 0
    ));
    booking.remaining_amount = roundMoney(Math.max(Number(booking.total_amount || 0) - booking.amount_paid, 0));
    booking.booking_status = booking.status;
    booking.check_in_status = booking.status === "checked_in"
      ? "checked_in"
      : booking.status === "checked_out" ? "checked_out" : "not_checked_in";
    booking.checked_in_at = booking.actual_checkin_time || null;
    booking.checked_out_at = booking.actual_checkout_time || null;
    booking.checked_in_by = booking.checked_in_by_staff_id || null;
    booking.checked_out_by = booking.checked_out_by_staff_id || null;
    booking.extension_history = auditLogsByBooking[booking.id] || [];
    booking.checked_out_by_display = booking.checked_out_by_staff_id
      ? `${booking.checked_out_by_role || "receptionist"} #${booking.checked_out_by_staff_id}`
      : null;
    booking.original_checkout_date = booking.original_checkout_date || booking.check_out;
    booking.early_checkout_eligible = booking.status === "checked_in"
      && Boolean(booking.actual_checkin_time)
      && !booking.is_early_checkout
      && today < booking.check_out;
    booking.isEarlyCheckout = Boolean(booking.is_early_checkout);
    booking.earlyCheckoutAt = booking.early_checkout_at || null;
    booking.earlyCheckoutReason = booking.early_checkout_reason || null;
    booking.originalCheckoutDate = booking.original_checkout_date;
    return addNoShowFieldAliases(booking);
  });

  return res.json({
    success: true,
    data,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function markBookingNoShow(req, res) {
  const result = await processNoShowBooking(req.params.id, {
    actor: {
      id: req.user.id,
      role: req.user.role,
    },
  });

  if (result.cancelled) {
    return res.json({
      success: true,
      data: result.booking,
      refund: result.summary?.refundAmount || 0,
      refund_status: result.refundStatus,
      message: "Booking marked as no-show and cancelled successfully",
    });
  }

  if (result.reason === "not_found") {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }
  if (result.reason === "grace_period_active") {
    return res.status(400).json({
      success: false,
      error: "The booking cannot be marked as no-show before the check-in grace period ends.",
      auto_cancel_at: result.deadline,
    });
  }
  if (result.reason === "already_auto_cancelled") {
    return res.status(409).json({
      success: false,
      error: "Booking has already been cancelled due to no-show.",
    });
  }

  return res.status(400).json({
    success: false,
    error: result.reason === "already_checked_in" || result.reason === "status_checked_in"
      ? "Checked-in bookings cannot be marked as no-show."
      : "This booking is not eligible to be marked as no-show.",
  });
}

async function createWalkInBooking(req, res) {
  await refreshExpiredNoShows();
  const transaction = await sequelize.transaction();

  try {
    const {
      guest,
      room_id,
      check_in,
      check_in_time,
      check_out,
      guests,
      special_requests,
      payment_method,
    } = req.body;
    const schedule = buildBookingCheckInSchedule(check_in, check_in_time);
    const [customer] = await Customer.findOrCreate({
      where: { phone: guest.phone },
      defaults: {
        full_name: guest.full_name,
        phone: guest.phone,
        email: guest.email || null,
        nationality: guest.nationality,
        id_type: guest.id_type,
        id_number: guest.id_number,
        otp_verified: true,
      },
      transaction,
    });

    await customer.update({
      full_name: guest.full_name,
      email: guest.email || customer.email,
      nationality: guest.nationality || customer.nationality,
      id_type: guest.id_type || customer.id_type,
      id_number: guest.id_number || customer.id_number,
      id_doc_url: guest.id_doc_url,
      id_doc_public_id: guest.id_doc_public_id,
      live_photo_url: guest.live_photo_url,
      live_photo_public_id: guest.live_photo_public_id,
    }, { transaction });

    const prepared = await prepareBookingData({
      roomId: room_id,
      checkIn: check_in,
      checkOut: check_out,
      guests,
      transaction,
      lockRows: true,
    });

    const booking = await Booking.create({
      customer_id: customer.id,
      room_id,
      check_in,
      checkInTime: schedule.checkInTime,
      checkInDateTime: schedule.checkInDateTime,
      autoCancelAt: schedule.autoCancelAt,
      noShowGraceMinutes: schedule.noShowGraceMinutes,
      check_out,
      nights: prepared.nights,
      guests,
      fare_per_night: prepared.price.pricePerNight,
      base_amount: prepared.baseAmount,
      discount_amount: prepared.discountAmount,
      offer_discount_amount: prepared.discountAmount,
      amount_after_offer: prepared.fare,
      offer_id: prepared.price.offer?.id || null,
      coupon_id: null,
      applied_coupon_code: null,
      coupon_discount_amount: 0,
      total_fare: prepared.fare,
      gst_percent: prepared.gst.gstPercent,
      gst_amount: prepared.gst.gstAmount,
      final_payable_amount: prepared.gst.totalAmount,
      total_amount: prepared.gst.totalAmount,
      advance_amount: 0,
      advance_paid: 0,
      amount_paid: 0,
      remaining_amount: prepared.gst.totalAmount,
      special_requests,
      payment_method,
      payment_status: "pending",
      payment_mode: payment_method === "upi" ? "hotel_qr" : payment_method,
      status: "pending",
      booked_by: "receptionist",
      booking_type: "manual",
      reservation_type: "confirmed_booking",
      created_by_user_id: req.user.id,
    }, { transaction });

    await booking.update({
      booking_ref: bookingRefFromId(booking.id, new Date()),
    }, { transaction });

    await writeAudit({
      action: "manual_booking_created",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: { totalAmount: booking.total_amount },
      transaction,
    });
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: { booking },
      message: "Manual booking created. Confirm payment before check-in.",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function checkInBooking(req, res) {
  const noShowResult = await processNoShowBooking(req.params.id);
  if (
    noShowResult.cancelled
    || noShowResult.reason === "already_auto_cancelled"
  ) {
    return res.status(400).json({
      success: false,
      error: "Booking has been cancelled due to no-show.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    const autoCancelDeadline = booking.autoCancelAt
      ? new Date(booking.autoCancelAt)
      : null;
    if (
      autoCancelDeadline
      && !Number.isNaN(autoCancelDeadline.getTime())
      && Date.now() >= autoCancelDeadline.getTime()
      && ACTIVE_NO_SHOW_STATUSES.includes(String(booking.status))
      && !booking.actual_checkin_time
    ) {
      await transaction.rollback();
      await processNoShowBooking(booking.id);
      return res.status(400).json({
        success: false,
        error: "Booking has been cancelled due to no-show.",
      });
    }
    if (req.body.booking_ref && req.body.booking_ref !== booking.booking_ref) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking reference does not match the requested booking" });
    }

    if (booking.status === "checked_in") {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "This booking is already checked in" });
    }
    if (booking.status === "checked_out") {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "This booking has already been checked out" });
    }
    if (booking.status === "cancelled") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: booking.cancellationType === NO_SHOW_CANCELLATION_TYPE
          ? "Booking has been cancelled due to no-show."
          : "Cancelled bookings cannot be checked in",
      });
    }
    if (booking.status !== "confirmed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Booking must be confirmed before check-in (current status: ${booking.status})`,
      });
    }
    if (booking.payment_status !== "paid" || Number(booking.remaining_amount || 0) > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Payment pending. Confirm the remaining amount of INR ${Number(booking.remaining_amount || 0).toFixed(2)} before check-in`,
      });
    }

    const dateError = getBookedDateValidation("check-in", booking.check_in);
    if (dateError) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: dateError });
    }

    const room = await Room.findByPk(booking.room_id, { transaction });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booked room not found" });
    }
    if (!room.is_active || room.status !== "available") {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: `Room is currently ${room.status || "unavailable"} and cannot be checked in`,
      });
    }

    const activeCheckedInCount = await Booking.count({
      where: {
        room_id: room.id,
        status: "checked_in",
      },
      transaction,
    });
    if (activeCheckedInCount > 0) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "Room already has an active checked-in booking",
      });
    }

    const idVerified = req.body.id_verified === true;
    await booking.update({
      status: "checked_in",
      actual_checkin_time: new Date(),
      checked_in_by_staff_id: req.user.id,
      id_verified: idVerified,
      id_verification_status: idVerified ? "verified" : "pending",
      id_verified_by_staff_id: idVerified ? req.user.id : booking.id_verified_by_staff_id,
      id_verified_at: idVerified ? new Date() : booking.id_verified_at,
      id_verification_note: req.body.id_verification_note || booking.id_verification_note,
      payment_method: req.body.payment_method || booking.payment_method,
    }, { transaction });
    await updateCouponUsageForBooking(
      booking.id,
      { booking_status: "checked_in" },
      transaction
    );

    await room.update({ status: "occupied" }, { transaction });

    await Task.create({
      staff_id: req.user.id,
      room_id: room.id,
      title: `Prepare room ${room.room_number} for guest`,
      description: `Arrival support and final checks for ${booking.booking_ref}`,
      room_number: room.room_number,
      task_type: "service",
      priority: "normal",
    }, { transaction });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Checked In",
      message: `Welcome to Panchavati Grand. Your check-in for ${booking.booking_ref} is complete.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      data: booking,
      message: "Check-in completed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function completeCheckout(req, res, { early = false } = {}) {
  const transaction = await sequelize.transaction();

  try {
    if (
      early
      && !["receptionist", "manager", "admin"].includes(String(req.user?.role || ""))
    ) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: "Only a receptionist or admin can perform an early check-out",
      });
    }

    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (booking.status === "checked_out") {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: booking.is_early_checkout
          ? "This booking has already been checked out early"
          : "This booking has already been checked out",
      });
    }
    if (early && (booking.is_early_checkout || booking.early_checkout_at)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "This booking has already been checked out early",
      });
    }
    if (booking.status === "cancelled") {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Cancelled bookings cannot be checked out" });
    }
    if (booking.status !== "checked_in") {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Check-out is only allowed after check-in" });
    }
    if (early && !booking.actual_checkin_time) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "The guest must have an actual check-in timestamp before check-out",
      });
    }

    const now = new Date();
    if (early) {
      const today = getBusinessDate(now, env.hotelTimeZone);
      if (!today || today >= String(booking.check_out || "")) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Early check-out is only available before the original booked check-out date",
        });
      }

      const settings = await HotelSetting.findByPk(1, { transaction });
      const originalCheckoutAt = buildHotelDateTime(
        booking.check_out,
        settings?.check_out_time || "11:00",
        env.hotelTimeZone
      );
      if (!originalCheckoutAt || now.getTime() >= originalCheckoutAt.getTime()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "The original booked check-out time has already been reached",
        });
      }
      if (
        booking.payment_status !== "paid"
        || Number(booking.remaining_amount || 0) > 0
      ) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          error: `Settle the remaining amount of INR ${Number(booking.remaining_amount || 0).toFixed(2)} before early check-out`,
        });
      }
    } else {
      const dateError = getBookedDateValidation("check-out", booking.check_out);
      if (dateError) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: dateError });
      }
    }

    const existingFeedback = await Feedback.findOne({
      where: { booking_id: booking.id },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (existingFeedback) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "Feedback has already been saved for this booking" });
    }

    const extras = (req.body.extras || []).map((item) => ({
      ...item,
      title: item.title || item.label || "Extra Charge",
      amount: Number(item.amount || 0),
    }));
    const extraCharges = extras.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const previousRoomStatus = booking.room.status;
    const bookingUpdates = {
      status: "checked_out",
      actual_checkout_time: now,
      checked_out_by_staff_id: req.user.id,
      checked_out_by_role: req.user.role,
      extra_charges: Number(booking.extra_charges) + extraCharges,
      payment_method: req.body.payment_method || booking.payment_method,
      payment_status: req.body.payment_status || booking.payment_status,
      room_status_after_checkout: previousRoomStatus === "maintenance" ? "maintenance" : "cleaning",
    };
    if (early) {
      Object.assign(bookingUpdates, {
        is_early_checkout: true,
        early_checkout_at: now,
        early_checkout_reason: req.body.reason.trim(),
        early_checkout_note: normalizeOptionalText(req.body.internal_note),
        original_checkout_date: booking.check_out,
        early_checkout_refund_amount: 0,
        early_checkout_adjustment_charge: 0,
        early_checkout_policy_applied: EARLY_CHECKOUT_POLICY,
      });
    }
    await booking.update(bookingUpdates, { transaction });
    await updateCouponUsageForBooking(
      booking.id,
      { booking_status: "checked_out" },
      transaction
    );

    if (booking.room.status !== "maintenance") {
      await booking.room.update({ status: "cleaning" }, { transaction });
    }

    await CustomerHistory.findOrCreate({
      where: { booking_id: booking.id },
      defaults: {
        booking_id: booking.id,
        customer_id: booking.customer_id,
        cust_name: booking.customer.full_name,
        phone: booking.customer.phone,
        room_number: booking.room.room_number,
        category: booking.room.category,
        check_in: booking.check_in,
        check_out: booking.check_out,
        nights: booking.nights,
        amount: booking.total_amount,
        status: booking.status,
        feedback_given: true,
      },
      transaction,
    });

    await CustomerHistory.update(
      { feedback_given: true },
      { where: { booking_id: booking.id }, transaction }
    );

    const collectedAt = new Date();
    const operationalStaffId = req.user.role === "admin"
      ? booking.checked_in_by_staff_id || (await Staff?.findOne?.({
        where: { role: "receptionist", is_active: true },
        attributes: ["id"],
        transaction,
      }))?.id || null
      : req.user.id;
    const feedback = await Feedback.create({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      room_id: booking.room_id,
      cust_name: booking.customer.full_name,
      rating: Number(req.body.feedback.rating),
      title: early ? "Early checkout feedback" : "Checkout feedback",
      comment: req.body.feedback.feedback_text.trim(),
      room_category: booking.room.category,
      room_number: booking.room.room_number,
      room_name: booking.room.name,
      internal_note: normalizeOptionalText(
        req.body.feedback.internal_note || req.body.internal_note
      ),
      source: "receptionist_checkout",
      collected_by_receptionist_id: operationalStaffId,
      collected_by_receptionist_name: req.user.name || `${req.user.role} #${req.user.id}`,
      collected_at: collectedAt,
      check_in_date: booking.check_in,
      check_out_date: booking.check_out,
      status: "pending",
    }, { transaction });

    const bill = await generateBill(booking.id, extras, transaction, req.user);

    if (operationalStaffId) {
      await Task.create({
        staff_id: operationalStaffId,
        room_id: booking.room.id,
        title: `Allocate cleaning for room ${booking.room.room_number}`,
        description: `Room ${booking.room.room_number} ${early ? "checked out early" : "checked out"} under ${booking.booking_ref}. Assign cleaning and mark the room ready once housekeeping finishes.`,
        room_number: booking.room.room_number,
        task_type: "cleaning",
        priority: "high",
      }, { transaction });
    }

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Thank You for Staying",
      message: "Thank you for staying with us. We'd love your feedback.",
      type: "system",
    }, { transaction });

    await Notification.create({
      target_role: "receptionist",
      title: "Cleaning Allocation Needed",
      message: `Room ${booking.room.room_number} is in cleaning after ${booking.booking_ref}. Assign housekeeping from the receptionist task queue.`,
      type: "booking",
    }, { transaction });

    await writeAudit({
      action: early ? "EARLY_CHECKOUT" : "CHECKOUT",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      module: "booking",
      message: early
        ? `Guest checked out early from ${booking.booking_ref}`
        : `Guest checked out from ${booking.booking_ref}`,
      metadata: {
        bookingId: booking.id,
        customerId: booking.customer_id,
        roomId: booking.room_id,
        originalCheckoutDate: booking.check_out,
        actualCheckoutAt: now.toISOString(),
        earlyCheckoutAt: early ? now.toISOString() : null,
        reason: early ? req.body.reason.trim() : null,
        performedBy: req.user.id,
        performedByName: req.user.name || null,
        role: req.user.role,
        timestampIST: formatToIST(now),
        timestampUTC: now.toISOString(),
        ipAddress: req.ip || req.headers?.["x-forwarded-for"] || null,
        userAgent: req.headers?.["user-agent"] || null,
        oldValue: { status: "checked_in", roomStatus: previousRoomStatus },
        newValue: {
          status: "checked_out",
          roomStatus: bookingUpdates.room_status_after_checkout,
          isEarlyCheckout: early,
        },
        paymentSettlement: {
          totalAmount: Number(booking.total_amount || 0),
          paidAmount: Number(booking.amount_paid || 0),
          remainingAmount: Number(booking.remaining_amount || 0),
          paymentStatus: bookingUpdates.payment_status,
          refundAmount: 0,
          policyApplied: early ? EARLY_CHECKOUT_POLICY : null,
        },
      },
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      data: {
        booking,
        bill,
        feedback,
        settlement: {
          total_amount: Number(booking.total_amount || 0),
          paid_amount: Number(booking.amount_paid || 0),
          remaining_amount: Number(booking.remaining_amount || 0),
          refund_amount: 0,
          policy_applied: early ? EARLY_CHECKOUT_POLICY : null,
          status: bookingUpdates.payment_status,
        },
      },
      message: early
        ? "Early check-out completed. The room is now in cleaning."
        : "Check-out completed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function checkOutBooking(req, res) {
  return completeCheckout(req, res);
}

async function earlyCheckOutBooking(req, res) {
  return completeCheckout(req, res, { early: true });
}

async function updateBooking(req, res) {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  const updates = { ...req.body };
  const noShowUpdateFields = {
    check_in_time: "checkInTime",
    check_in_datetime: "checkInDateTime",
    auto_cancel_at: "autoCancelAt",
    no_show_grace_minutes: "noShowGraceMinutes",
    auto_cancellation_reason: "autoCancellationReason",
    auto_cancelled_at: "autoCancelledAt",
    cancellation_type: "cancellationType",
    refund_request_created_at: "refundRequestCreatedAt",
  };
  for (const [field, attribute] of Object.entries(noShowUpdateFields)) {
    if (updates[field] !== undefined) {
      updates[attribute] = updates[field];
      delete updates[field];
    }
  }

  if (updates.check_in !== undefined || updates.checkInTime !== undefined) {
    const schedule = buildBookingCheckInSchedule(
      updates.check_in || booking.check_in,
      updates.checkInTime || booking.checkInTime
    );
    updates.checkInTime = schedule.checkInTime;
    updates.checkInDateTime = schedule.checkInDateTime;
    updates.autoCancelAt = schedule.autoCancelAt;
    updates.noShowGraceMinutes = schedule.noShowGraceMinutes;
  }

  await booking.update(updates);
  return res.json({
    success: true,
    data: booking,
    message: "Booking updated successfully",
  });
}

async function deleteBooking(req, res) {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  await booking.destroy();
  return res.json({
    success: true,
    message: "Booking deleted successfully",
  });
}

async function extendBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (!booking.room) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking room information not available" });
    }

    // Extension is allowed only after the guest has checked in.
    if (booking.status !== "checked_in") {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Only checked-in bookings can be extended." });
    }

    if (!booking.fare_per_night || booking.gst_percent === null || booking.gst_percent === undefined) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking pricing information is incomplete" });
    }

    if (!booking.check_in || !booking.check_out) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking date information is incomplete" });
    }

    const { check_out, reason } = req.body;
    const newCheckOut = parseDateInput(check_out);
    const currentCheckOut = parseDateInput(booking.check_out);

    if (!newCheckOut) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Invalid check-out date" });
    }

    if (!currentCheckOut) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Invalid current check-out date" });
    }

    if (newCheckOut <= currentCheckOut) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "New check-out date must be after the current check-out date" });
    }

    const activeExtension = await BookingExtensionRequest.findOne({
      where: {
        booking_id: booking.id,
        status: { [Op.in]: ["pending", "approved"] },
      },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (activeExtension) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "This booking already has an extension awaiting processing or payment",
      });
    }

    const overlapCount = await countOverlappingBookings({
      roomId: booking.room_id,
      checkIn: booking.check_out,
      checkOut: check_out,
      excludeBookingId: booking.id,
      transaction,
      lockRows: true,
    });
    if (overlapCount >= Number(booking.room.total_units || 1)) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "The room is not available for the requested extension period" });
    }

    const totals = await calculateExtensionAmounts({
      booking,
      room: booking.room,
      extendedCheckoutDate: check_out,
    });
    const extension = await BookingExtensionRequest.create(buildExtensionRequestValues({
      booking,
      totals,
      reason,
      status: "approved",
      processedBy: req.user.id,
    }), { transaction });
    await applyExtensionToBooking(booking, totals, transaction);
    await updateCouponUsageForBooking(booking.id, {
      discount_amount: Number(booking.coupon_discount_amount || 0),
      booking_amount_before_coupon: Number(booking.amount_after_offer || booking.total_fare || 0),
      final_amount_after_coupon: Number(booking.total_amount),
    }, transaction);

    const extensionMetadata = {
      bookingId: booking.id,
      extensionRequestId: extension.id,
      oldCheckoutDate: totals.originalCheckoutDate,
      newCheckoutDate: totals.extendedCheckoutDate,
      extensionNights: totals.extensionNights,
      extensionPayableAmount: totals.extensionPayableAmount,
      extensionPaymentStatus: "pending",
    };
    await writeAudit({
      action: "EXTENSION_CREATED",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: extensionMetadata,
      transaction,
    });
    await writeAudit({
      action: "EXTENSION_PAYMENT_PENDING",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: extensionMetadata,
      transaction,
    });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Booking extended - payment pending",
      message: `Your booking ${booking.booking_ref} has been extended to ${check_out}. Pay INR ${totals.extensionPayableAmount.toFixed(2)} at reception.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();
    const responseBooking = booking.get({ plain: true });
    responseBooking.extensionRequests = [toExtensionPayload(extension)];

    return res.json({
      success: true,
      data: responseBooking,
      extension: toExtensionPayload(extension),
      message: "Booking extended. Manual extension payment confirmation is required.",
      extra_charges: totals.extensionPayableAmount,
    });

  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function confirmReservation(req, res) {
  const noShowResult = await processNoShowBooking(req.params.id);
  if (
    noShowResult.cancelled
    || noShowResult.reason === "already_auto_cancelled"
  ) {
    return res.status(400).json({
      success: false,
      error: "Booking has been cancelled due to no-show.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (!["pending", "reserved", "confirmed"].includes(booking.status)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: `Reservation cannot be confirmed from ${booking.status} status` });
    }

    if (booking.payment_status === "paid" || Number(booking.amount_paid || 0) >= Number(booking.total_amount)) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "Payment has already been fully confirmed" });
    }
    const amount = roundMoney(req.body.amount);
    const total = Number(booking.total_amount);
    const priorPaid = Number(booking.amount_paid || booking.advance_paid || 0);
    const requiredRemaining = roundMoney(Math.max(total - priorPaid, 0));
    if (Math.round(amount * 100) !== Math.round(requiredRemaining * 100)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Exact remaining payment of INR ${requiredRemaining.toFixed(2)} is required`,
      });
    }
    const totalPaid = roundMoney(priorPaid + amount);
    if (totalPaid > total) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Confirmed amount exceeds booking total" });
    }
    const reference = normalizeOptionalText(req.body.transaction_reference);
    if (reference) {
      const duplicate = await PaymentTransaction.findOne({ where: { payment_reference: reference }, transaction });
      if (duplicate) {
        await transaction.rollback();
        return res.status(409).json({ success: false, error: "Transaction reference has already been used" });
      }
    }
    const requiredAdvance = roundMoney(total * 0.1);
    const isReservation = booking.reservation_type === "reserved_booking";
    const fullyPaid = totalPaid >= total;
    const now = new Date();
    const transactionMethod = req.body.payment_mode === "hotel_qr" ? "upi" : "cash";

    await booking.update({
      status: fullyPaid || !isReservation ? "confirmed" : "reserved",
      payment_status: fullyPaid ? "paid" : "partially_paid",
      payment_method: transactionMethod,
      payment_mode: req.body.payment_mode,
      payment_confirmed_by: req.user.id,
      payment_confirmed_at: now,
      paid_at: now,
      manual_transaction_id: reference || booking.manual_transaction_id,
      amount_paid: totalPaid,
      advance_paid: isReservation ? Math.min(totalPaid, requiredAdvance) : totalPaid,
      remaining_amount: roundMoney(total - totalPaid),
      reservation_type: fullyPaid ? "confirmed_booking" : booking.reservation_type,
    }, { transaction });

    await PaymentTransaction.create({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      amount,
      payment_method: transactionMethod,
      status: "paid",
      payment_reference: reference,
      paid_at: now,
      remarks: `Manual payment confirmed by receptionist ${req.user.id}`,
    }, { transaction });
    const bill = fullyPaid ? await generateBill(booking.id, [], transaction, req.user) : null;
    await writeAudit({
      action: "manual_payment_confirmed",
      entityType: "booking",
      entityId: booking.id,
      actor: req.user,
      metadata: { amount, paymentMode: req.body.payment_mode, reference, fullyPaid, billId: bill?.id || null },
      transaction,
    });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: fullyPaid ? "Booking Payment Confirmed" : "Reservation Advance Confirmed",
      message: `${amount} INR payment for ${booking.booking_ref} was confirmed by hotel reception.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    const refreshed = await Booking.findByPk(booking.id, {
      include: [
        { model: Customer, as: "customer", attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] } },
        { model: Room, as: "room" },
        { model: Bill, as: "bill", required: false },
      ],
    });

    return res.json({
      success: true,
      data: refreshed,
      message: "Reservation confirmed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function postponeBookingCheckIn(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (booking.status === "checked_in") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Checked-in bookings cannot be postponed.",
      });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Cannot postpone check-in for booking with status: ${booking.status}`,
      });
    }

    const currentCheckIn = parseDateInput(booking.check_in);
    const currentCheckOut = parseDateInput(booking.check_out);
    const requestedCheckIn = parseDateInput(req.body.check_in);
    const today = parseDateInput(getBusinessDate(new Date(), env.hotelTimeZone));

    if (!requestedCheckIn || !currentCheckIn || !currentCheckOut) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Invalid booking dates" });
    }

    if (requestedCheckIn < today) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Check-in cannot be in the past" });
    }

    if (requestedCheckIn <= currentCheckIn) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "New check-in date must be after the current check-in date",
      });
    }

    const nights = Number(booking.nights) || diffNights(booking.check_in, booking.check_out);
    if (!Number.isFinite(nights) || nights < 1) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking nights are invalid" });
    }

    const requestedCheckOut = new Date(requestedCheckIn.getTime() + nights * 24 * 60 * 60 * 1000);
    const requestedCheckInStr = requestedCheckIn.toISOString().slice(0, 10);
    const requestedCheckOutStr = requestedCheckOut.toISOString().slice(0, 10);
    const schedule = buildBookingCheckInSchedule(
      requestedCheckInStr,
      req.body.check_in_time || booking.checkInTime
    );

    const overlapCount = await countOverlappingBookings({
      roomId: booking.room_id,
      checkIn: requestedCheckInStr,
      checkOut: requestedCheckOutStr,
      excludeBookingId: booking.id,
      transaction,
      lockRows: true,
    });

    if (overlapCount >= Number(booking.room.total_units || 1)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        error: "The room is not available for the postponed stay window",
      });
    }

    const refreshedPrice = await calculateStayPricing(
      booking.room,
      requestedCheckInStr,
      requestedCheckOutStr
    );
    const amountAfterOffer = refreshedPrice.totalFare;
    const couponDiscountAmount = roundMoney(
      Math.min(Number(booking.coupon_discount_amount || 0), amountAfterOffer)
    );
    const refreshedFare = roundMoney(amountAfterOffer - couponDiscountAmount);
    const refreshedGst = calculateGST(refreshedFare, booking.gst_percent);
    const refreshedTotal = ensurePositiveAmount(refreshedGst.totalAmount);
    const refreshedDiscount = refreshedPrice.discountAmount;
    const paidAmount = roundMoney(booking.amount_paid || booking.advance_paid || 0);
    const discountExpired = Number(booking.discount_amount || 0) > 0 && refreshedDiscount <= 0;

    await booking.update({
      check_in: requestedCheckInStr,
      checkInTime: schedule.checkInTime,
      checkInDateTime: schedule.checkInDateTime,
      autoCancelAt: schedule.autoCancelAt,
      noShowGraceMinutes: schedule.noShowGraceMinutes,
      check_out: requestedCheckOutStr,
      fare_per_night: refreshedPrice.averagePricePerNight,
      base_amount: refreshedPrice.baseAmount,
      discount_amount: refreshedDiscount,
      offer_discount_amount: refreshedDiscount,
      amount_after_offer: amountAfterOffer,
      offer_id: refreshedPrice.offer?.id || null,
      total_fare: refreshedFare,
      gst_amount: refreshedGst.gstAmount,
      final_payable_amount: refreshedTotal,
      total_amount: refreshedTotal,
      remaining_amount: roundMoney(Math.max(refreshedTotal - paidAmount, 0)),
    }, { transaction });
    await updateCouponUsageForBooking(booking.id, {
      discount_amount: couponDiscountAmount,
      booking_amount_before_coupon: amountAfterOffer,
      final_amount_after_coupon: refreshedTotal,
    }, transaction);

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Check-in postponed",
      message: discountExpired
        ? `Your booking ${booking.booking_ref} check-in has been postponed to ${requestedCheckInStr}. Discount offer is no longer valid for the postponed check-in date. Price has been recalculated without discount.`
        : `Your booking ${booking.booking_ref} check-in has been postponed to ${requestedCheckInStr}.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    const refreshed = await Booking.findByPk(booking.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
    });

    return res.json({
      success: true,
      data: refreshed,
      message: discountExpired
        ? "Discount offer is no longer valid for the postponed check-in date. Price has been recalculated without discount."
        : "Check-in postponed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function verifyBookingId(req, res) {
  const booking = await Booking.findByPk(req.params.id, {
    include: [{ model: Customer, as: "customer" }],
  });

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  const status = req.body.status || "verified";
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, error: "Verification status must be verified or rejected" });
  }

  await booking.update({
    id_verified: status === "verified",
    id_verification_status: status,
    id_verified_by_staff_id: req.user.id,
    id_verified_at: new Date(),
    id_verification_note: req.body.note || null,
  });

  return res.json({
    success: true,
    data: booking,
    message: status === "verified" ? "Customer ID verified" : "Customer ID rejected",
  });
}

module.exports = {
  prepareBookingData,
  quoteBooking,
  createBooking,
  verifyBookingPayment,
  markBookingPaymentFailed,
  createReservedPaymentOrder,
  verifyReservedPayment,
  listCustomerBookings,
  getCustomerBooking,
  previewCancellation,
  cancelBooking,
  markBookingNoShow,
  listAllBookings,
  createWalkInBooking,
  checkInBooking,
  confirmReservation,
  checkOutBooking,
  earlyCheckOutBooking,
  extendBooking,
  postponeBookingCheckIn,
  verifyBookingId,
  updateBooking,
  deleteBooking,
};
