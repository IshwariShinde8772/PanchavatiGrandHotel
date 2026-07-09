const { Op } = require("sequelize");
const { BookingExtensionRequest } = require("../../models");
const { calculateGST } = require("../utils/gst");
const { diffNights, parseDateInput } = require("../utils/dateHelpers");
const { calculateStayPricing } = require("./roomService");

function roundMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
}

function resolveBookingPaidAmount(booking) {
  const stored = roundMoney(booking.amount_paid || booking.advance_paid || 0);
  const total = roundMoney(booking.total_amount || booking.final_payable_amount || 0);
  return booking.payment_status === "paid" ? Math.max(stored, total) : stored;
}

function extensionPayable(request) {
  return roundMoney(request.extension_payable_amount ?? request.extra_amount ?? 0);
}

function extensionPaid(request) {
  if (request.extension_paid_amount !== undefined && request.extension_paid_amount !== null) {
    return roundMoney(request.extension_paid_amount);
  }
  return request.payment_status === "paid" ? extensionPayable(request) : 0;
}

function extensionRemaining(request) {
  if (request.extension_remaining_amount !== undefined && request.extension_remaining_amount !== null) {
    return roundMoney(request.extension_remaining_amount);
  }
  return roundMoney(Math.max(extensionPayable(request) - extensionPaid(request), 0));
}

async function calculateExtensionAmounts({ booking, room, extendedCheckoutDate }) {
  const originalCheckoutDate = String(booking.check_out);
  const originalCheckout = parseDateInput(originalCheckoutDate);
  const extendedCheckout = parseDateInput(extendedCheckoutDate);

  if (!originalCheckout || !extendedCheckout) {
    throw Object.assign(new Error("A valid extension checkout date is required"), { status: 400 });
  }
  if (extendedCheckout <= originalCheckout) {
    throw Object.assign(
      new Error("New check-out date must be after the current check-out date"),
      { status: 400 }
    );
  }

  const extensionNights = diffNights(originalCheckoutDate, extendedCheckoutDate);
  if (!Number.isInteger(extensionNights) || extensionNights < 1) {
    throw Object.assign(new Error("Extension must add at least one night"), { status: 400 });
  }

  const pricing = await calculateStayPricing(room, originalCheckoutDate, extendedCheckoutDate);
  const extensionBaseAmount = roundMoney(Math.max(pricing.baseAmount, 0));
  const extensionDiscountAmount = roundMoney(Math.max(pricing.discountAmount, 0));
  const discountedFare = roundMoney(Math.max(pricing.totalFare, 0));
  const gst = calculateGST(discountedFare, booking.gst_percent);
  const extensionTaxAmount = roundMoney(Math.max(gst.gstAmount, 0));
  const extensionPayableAmount = roundMoney(Math.max(discountedFare + extensionTaxAmount, 0));

  return {
    originalCheckoutDate,
    extendedCheckoutDate: String(extendedCheckoutDate),
    extensionNights,
    extensionBaseAmount,
    extensionDiscountAmount,
    extensionTaxAmount,
    extensionPayableAmount,
    extensionPaidAmount: 0,
    extensionRemainingAmount: extensionPayableAmount,
    originalBookingAmount: roundMoney(booking.total_amount || booking.final_payable_amount || 0),
    originalPaidAmount: resolveBookingPaidAmount(booking),
    discountedFare,
  };
}

function buildExtensionRequestValues({ booking, totals, reason, status = "approved", processedBy }) {
  return {
    booking_id: booking.id,
    customer_id: booking.customer_id,
    requested_from: totals.originalCheckoutDate,
    requested_to: totals.extendedCheckoutDate,
    nights: totals.extensionNights,
    reason,
    status,
    payment_status: "pending",
    extra_fare: totals.discountedFare,
    extra_gst: totals.extensionTaxAmount,
    extra_amount: totals.extensionPayableAmount,
    original_checkout_date: totals.originalCheckoutDate,
    extended_checkout_date: totals.extendedCheckoutDate,
    extension_nights: totals.extensionNights,
    extension_base_amount: totals.extensionBaseAmount,
    extension_discount_amount: totals.extensionDiscountAmount,
    extension_tax_amount: totals.extensionTaxAmount,
    extension_payable_amount: totals.extensionPayableAmount,
    extension_paid_amount: 0,
    extension_remaining_amount: totals.extensionRemainingAmount,
    original_booking_amount: totals.originalBookingAmount,
    original_paid_amount: totals.originalPaidAmount,
    processed_by_staff_id: processedBy || null,
    responded_at: status === "approved" ? new Date() : null,
  };
}

async function applyExtensionToBooking(booking, totals, transaction) {
  const currentNights = Number(booking.nights || diffNights(booking.check_in, booking.check_out));
  const newNights = currentNights + totals.extensionNights;
  const newBaseAmount = roundMoney(Number(booking.base_amount || 0) + totals.extensionBaseAmount);
  const newDiscountAmount = roundMoney(
    Number(booking.offer_discount_amount ?? booking.discount_amount ?? 0)
      + totals.extensionDiscountAmount
  );
  const newAmountAfterOffer = roundMoney(
    Number(booking.amount_after_offer || booking.total_fare || 0) + totals.discountedFare
  );
  const newFare = roundMoney(Number(booking.total_fare || 0) + totals.discountedFare);
  const newGst = roundMoney(Number(booking.gst_amount || 0) + totals.extensionTaxAmount);
  const newTotal = roundMoney(totals.originalBookingAmount + totals.extensionPayableAmount);
  const paidAmount = roundMoney(Math.min(totals.originalPaidAmount, newTotal));
  const remainingAmount = roundMoney(Math.max(newTotal - paidAmount, 0));

  await booking.update({
    check_out: totals.extendedCheckoutDate,
    nights: newNights,
    fare_per_night: newNights > 0 ? roundMoney(newFare / newNights) : booking.fare_per_night,
    base_amount: newBaseAmount,
    discount_amount: newDiscountAmount,
    offer_discount_amount: newDiscountAmount,
    amount_after_offer: newAmountAfterOffer,
    total_fare: newFare,
    gst_amount: newGst,
    final_payable_amount: newTotal,
    total_amount: newTotal,
    amount_paid: paidAmount,
    remaining_amount: remainingAmount,
    payment_status: remainingAmount === 0 ? "paid" : paidAmount > 0 ? "partially_paid" : "pending",
  }, { transaction });

  return {
    newNights,
    newTotal,
    paidAmount,
    remainingAmount,
  };
}

function toExtensionPayload(record) {
  const request = typeof record?.get === "function"
    ? record.get({ plain: true })
    : { ...(record || {}) };
  const payable = extensionPayable(request);
  const paid = extensionPaid(request);
  const remaining = extensionRemaining(request);

  return {
    ...request,
    originalCheckoutDate: request.original_checkout_date || request.requested_from,
    extendedCheckoutDate: request.extended_checkout_date || request.requested_to,
    extensionNights: Number(request.extension_nights || request.nights || 0),
    extensionBaseAmount: roundMoney(request.extension_base_amount ?? request.extra_fare ?? 0),
    extensionDiscountAmount: roundMoney(request.extension_discount_amount || 0),
    extensionTaxAmount: roundMoney(request.extension_tax_amount ?? request.extra_gst ?? 0),
    extensionPayableAmount: payable,
    extensionPaidAmount: paid,
    extensionRemainingAmount: remaining,
    extensionPaymentStatus: request.payment_status || "pending",
  };
}

async function getActiveExtensions(bookingId, transaction) {
  return BookingExtensionRequest.findAll({
    where: {
      booking_id: bookingId,
      status: { [Op.in]: ["pending", "approved", "completed"] },
    },
    order: [["requested_at", "ASC"]],
    transaction,
  });
}

async function assertExtensionPaymentsConfirmed(bookingId, transaction) {
  const extensions = await getActiveExtensions(bookingId, transaction);
  const unpaid = extensions.find((request) => (
    extensionPayable(request) > 0
    && (request.payment_status !== "paid" || extensionRemaining(request) > 0)
  ));

  if (unpaid) {
    throw Object.assign(
      new Error("Extension payment must be confirmed before generating final bill."),
      { status: 409, code: "EXTENSION_PAYMENT_PENDING", extensionRequestId: unpaid.id }
    );
  }

  return extensions;
}

module.exports = {
  applyExtensionToBooking,
  assertExtensionPaymentsConfirmed,
  buildExtensionRequestValues,
  calculateExtensionAmounts,
  extensionPaid,
  extensionPayable,
  extensionRemaining,
  getActiveExtensions,
  resolveBookingPaidAmount,
  roundMoney,
  toExtensionPayload,
};
