const { Op } = require("sequelize");
const {
  Booking,
  Coupon,
  CouponUsage,
} = require("../../models");
const env = require("../config/env");
const { calculateGST } = require("../utils/gst");
const { getBusinessDate } = require("../utils/dateHelpers");
const { roundMoney } = require("./cancellationService");

const PRIOR_BOOKING_STATUSES = ["confirmed", "checked_in", "checked_out"];

function couponError(message, status = 400, code = "COUPON_INVALID") {
  return Object.assign(new Error(message), { status, code });
}

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function todayDate() {
  return getBusinessDate(new Date(), env.hotelTimeZone);
}

async function expireCoupons(referenceDate = todayDate()) {
  if (!Coupon?.update) return;
  await Coupon.update(
    { status: "expired", updated_at: new Date() },
    {
      where: {
        status: "active",
        valid_till: { [Op.lt]: referenceDate },
      },
    }
  );
}

async function loadCoupon(code, { transaction, lock = false } = {}) {
  const coupon = await Coupon.findOne({
    where: { code: normalizeCouponCode(code) },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!coupon) throw couponError("Coupon code is invalid.");
  return coupon;
}

async function countPreviousBookings(customerId, excludeBookingId, transaction) {
  const where = {
    customer_id: customerId,
    status: { [Op.in]: PRIOR_BOOKING_STATUSES },
  };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };
  return Booking.count({ where, transaction });
}

function assertCouponState(coupon, referenceDate = todayDate()) {
  if (coupon.status === "expired" || String(coupon.valid_till) < referenceDate) {
    throw couponError("Coupon has expired.", 400, "COUPON_EXPIRED");
  }
  if (String(coupon.valid_from) > referenceDate) {
    throw couponError("Coupon is not active yet.", 400, "COUPON_NOT_STARTED");
  }
  if (coupon.status !== "active") {
    throw couponError("Coupon is inactive.", 400, "COUPON_INACTIVE");
  }
}

async function validateCoupon({
  coupon,
  couponCode,
  customerId,
  room,
  amountAfterOffer,
  offerDiscountAmount = 0,
  transaction,
  lock = false,
  excludeBookingId,
}) {
  const selectedCoupon = coupon || await loadCoupon(couponCode, { transaction, lock });
  const bookingAmount = roundMoney(amountAfterOffer);
  assertCouponState(selectedCoupon);

  if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
    throw couponError("Booking amount is invalid.");
  }

  const previousBookings = await countPreviousBookings(customerId, excludeBookingId, transaction);
  if (selectedCoupon.eligibility_type === "first_time_customers" && previousBookings > 0) {
    throw couponError(
      "Coupon is only for first-time customers.",
      400,
      "COUPON_FIRST_TIME_ONLY"
    );
  }
  if (selectedCoupon.eligibility_type === "existing_customers" && previousBookings === 0) {
    throw couponError(
      "Coupon is only for existing customers.",
      400,
      "COUPON_EXISTING_ONLY"
    );
  }
  if (selectedCoupon.eligibility_type === "selected_customers") {
    const allowedCustomerIds = normalizeArray(selectedCoupon.eligible_customer_ids).map(Number);
    if (!allowedCustomerIds.includes(Number(customerId))) {
      throw couponError(
        "Coupon is not available for this customer.",
        400,
        "COUPON_CUSTOMER_INELIGIBLE"
      );
    }
  }

  if (selectedCoupon.applicable_scope === "selected_rooms") {
    const roomIds = normalizeArray(selectedCoupon.applicable_room_ids).map(Number);
    if (!roomIds.includes(Number(room?.id))) {
      throw couponError("Coupon is not valid for this room.", 400, "COUPON_ROOM_INELIGIBLE");
    }
  }
  if (selectedCoupon.applicable_scope === "selected_room_types") {
    const roomTypes = normalizeArray(selectedCoupon.applicable_room_type_ids).map(String);
    if (!roomTypes.includes(String(room?.category))) {
      throw couponError("Coupon is not valid for this room.", 400, "COUPON_ROOM_INELIGIBLE");
    }
  }

  const minimumAmount = roundMoney(selectedCoupon.min_booking_amount);
  if (bookingAmount < minimumAmount) {
    throw couponError(
      `Minimum booking amount should be ₹${minimumAmount.toFixed(2)}.`,
      400,
      "COUPON_MINIMUM_NOT_MET"
    );
  }
  if (Number(offerDiscountAmount) > 0 && !selectedCoupon.can_combine_with_offers) {
    throw couponError(
      "Coupon cannot be combined with current offer.",
      400,
      "COUPON_OFFER_COMBINATION_BLOCKED"
    );
  }

  let usageCount;
  let customerUsageCount;
  if (lock && transaction) {
    const committedUsages = await CouponUsage.findAll({
      where: { coupon_id: selectedCoupon.id },
      attributes: ["id", "customer_id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    usageCount = committedUsages.length;
    customerUsageCount = committedUsages.filter(
      (usage) => Number(usage.customer_id) === Number(customerId)
    ).length;
  } else {
    [usageCount, customerUsageCount] = await Promise.all([
      CouponUsage.count({ where: { coupon_id: selectedCoupon.id }, transaction }),
      CouponUsage.count({
        where: { coupon_id: selectedCoupon.id, customer_id: customerId },
        transaction,
      }),
    ]);
  }
  const effectiveUsageCount = Math.max(Number(selectedCoupon.used_count || 0), usageCount);
  if (
    selectedCoupon.total_usage_limit !== null
    && selectedCoupon.total_usage_limit !== undefined
    && effectiveUsageCount >= Number(selectedCoupon.total_usage_limit)
  ) {
    throw couponError("Coupon usage limit exceeded.", 400, "COUPON_TOTAL_LIMIT");
  }
  if (
    selectedCoupon.per_user_usage_limit !== null
    && selectedCoupon.per_user_usage_limit !== undefined
    && customerUsageCount >= Number(selectedCoupon.per_user_usage_limit)
  ) {
    throw couponError(
      "Coupon already used by this customer.",
      400,
      "COUPON_USER_LIMIT"
    );
  }

  const discountValue = Number(selectedCoupon.discount_value);
  let discountAmount;
  if (selectedCoupon.discount_type === "percentage") {
    discountAmount = bookingAmount * (discountValue / 100);
    if (selectedCoupon.max_discount_amount !== null && selectedCoupon.max_discount_amount !== undefined) {
      discountAmount = Math.min(discountAmount, Number(selectedCoupon.max_discount_amount));
    }
  } else {
    if (discountValue > bookingAmount) {
      throw couponError(
        "Fixed coupon discount cannot exceed the booking amount.",
        400,
        "COUPON_DISCOUNT_EXCEEDS_AMOUNT"
      );
    }
    discountAmount = discountValue;
  }

  discountAmount = roundMoney(Math.max(discountAmount, 0));
  const amountAfterCoupon = roundMoney(Math.max(bookingAmount - discountAmount, 0));
  return {
    coupon: selectedCoupon,
    discountAmount,
    amountAfterCoupon,
    usageCount: effectiveUsageCount,
    customerUsageCount,
  };
}

async function buildCouponPriceBreakdown({
  prepared,
  couponCode,
  customerId,
  transaction,
}) {
  const amountAfterOffer = roundMoney(prepared.fare);
  const offerDiscountAmount = roundMoney(prepared.discountAmount);
  let couponResult = null;

  if (normalizeCouponCode(couponCode)) {
    couponResult = await validateCoupon({
      couponCode,
      customerId,
      room: prepared.room,
      amountAfterOffer,
      offerDiscountAmount,
      transaction,
    });
  }

  const amountAfterCoupon = couponResult?.amountAfterCoupon ?? amountAfterOffer;
  const gst = calculateGST(
    amountAfterCoupon,
    prepared.settings?.gst_percent ?? env.gstPercent
  );

  return {
    baseAmount: roundMoney(prepared.baseAmount),
    offerDiscountAmount,
    amountAfterOffer,
    coupon: couponResult?.coupon || null,
    couponDiscountAmount: roundMoney(couponResult?.discountAmount || 0),
    amountAfterCoupon,
    gst,
    finalPayableAmount: roundMoney(gst.totalAmount),
  };
}

async function consumeCouponForBooking({ booking, room, bookingStatus, transaction }) {
  if (!booking.coupon_id || !normalizeCouponCode(booking.applied_coupon_code)) return null;

  const existing = await CouponUsage.findOne({
    where: { booking_id: booking.id },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (existing) {
    if (existing.booking_status !== bookingStatus) {
      await CouponUsage.update({
        booking_status: bookingStatus,
        payment_status: "paid",
        updated_at: new Date(),
      }, {
        where: { id: existing.id },
        transaction,
      });
    }
    return existing;
  }

  const coupon = await Coupon.findByPk(booking.coupon_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!coupon || normalizeCouponCode(coupon.code) !== normalizeCouponCode(booking.applied_coupon_code)) {
    throw couponError("Coupon code is invalid.");
  }

  await validateCoupon({
    coupon,
    customerId: booking.customer_id,
    room,
    amountAfterOffer: booking.amount_after_offer,
    offerDiscountAmount: booking.offer_discount_amount,
    transaction,
    lock: true,
    excludeBookingId: booking.id,
  });

  const usage = await CouponUsage.create({
    coupon_id: coupon.id,
    coupon_code: coupon.code,
    customer_id: booking.customer_id,
    booking_id: booking.id,
    discount_amount: booking.coupon_discount_amount,
    booking_amount_before_coupon: booking.amount_after_offer,
    final_amount_after_coupon: booking.final_payable_amount || booking.total_amount,
    used_at: new Date(),
    payment_status: "paid",
    booking_status: bookingStatus,
    created_at: new Date(),
    updated_at: new Date(),
  }, { transaction });

  await coupon.update({
    used_count: Number(coupon.used_count || 0) + 1,
    updated_at: new Date(),
  }, { transaction });
  return usage;
}

async function updateCouponUsageForBooking(bookingId, values, transaction) {
  if (!bookingId || !CouponUsage?.update) return;
  await CouponUsage.update(
    { ...values, updated_at: new Date() },
    { where: { booking_id: bookingId }, transaction }
  );
}

async function listPublicCoupons(referenceDate = todayDate()) {
  await expireCoupons(referenceDate);
  return Coupon.findAll({
    where: {
      status: "active",
      valid_from: { [Op.lte]: referenceDate },
      valid_till: { [Op.gte]: referenceDate },
      eligibility_type: { [Op.ne]: "selected_customers" },
    },
    attributes: [
      "id",
      "code",
      "title",
      "description",
      "discount_type",
      "discount_value",
      "max_discount_amount",
      "min_booking_amount",
      "valid_till",
      "eligibility_type",
      "applicable_scope",
    ],
    order: [["valid_till", "ASC"]],
    limit: 6,
  });
}

module.exports = {
  buildCouponPriceBreakdown,
  consumeCouponForBooking,
  expireCoupons,
  listPublicCoupons,
  normalizeCouponCode,
  updateCouponUsageForBooking,
  validateCoupon,
};
