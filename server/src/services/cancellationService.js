const CANCELLATION_THRESHOLD_HOURS = 24;
const env = require("../config/env");
const { buildHotelDateTime } = require("../utils/dateHelpers");

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildCheckInDateTime(
  dateOnly,
  checkInTime = "14:00",
  timeZone = env.hotelTimeZone
) {
  return buildHotelDateTime(dateOnly, checkInTime, timeZone);
}

function getPaidAmount(booking) {
  const amountPaid = Number(booking.amount_paid || 0);
  if (amountPaid > 0) return roundMoney(amountPaid);
  const advancePaid = Number(booking.advance_paid || 0);
  if (advancePaid > 0) return roundMoney(advancePaid);
  const payable = Number(booking.final_payable_amount || booking.total_amount || 0);
  return roundMoney(booking.payment_status === "paid" ? payable : 0);
}

function calculateCancellationSummary(booking, settings, now = new Date()) {
  const totalAmount = roundMoney(
    Number(booking.final_payable_amount || 0) > 0
      ? booking.final_payable_amount
      : booking.total_amount
  );
  const paidAmount = getPaidAmount(booking);
  const baseAmount = roundMoney(booking.base_amount);
  const offerDiscountAmount = roundMoney(
    booking.offer_discount_amount ?? booking.discount_amount
  );
  const couponDiscountAmount = roundMoney(booking.coupon_discount_amount);
  const storedCheckIn = booking.checkInDateTime
    ? new Date(booking.checkInDateTime)
    : null;
  const checkIn = storedCheckIn && !Number.isNaN(storedCheckIn.getTime())
    ? storedCheckIn
    : buildCheckInDateTime(
      booking.check_in,
      booking.checkInTime || settings?.check_in_time,
      env.hotelTimeZone
    );
  const hoursRemaining = checkIn ? (checkIn.getTime() - now.getTime()) / 3600000 : 0;
  const isReservation = booking.reservation_type === "reserved_booking"
    || (Number(booking.advance_amount || 0) > 0 && Number(booking.advance_amount) < totalAmount);
  const late = hoursRemaining < CANCELLATION_THRESHOLD_HOURS;

  let cancellationCharge = 0;
  let policyApplied;
  let message;

  if (isReservation && late) {
    cancellationCharge = paidAmount;
    policyApplied = "reservation_late_advance_forfeited";
    message = "Your reservation has been cancelled. As cancellation happened less than 24 hours before check-in, the 10% advance amount is non-refundable.";
  } else if (isReservation) {
    policyApplied = "reservation_free_cancellation_before_24h";
    message = `Your reservation has been cancelled. Your advance amount of INR ${paidAmount.toFixed(2)} is eligible for refund and is pending admin approval.`;
  } else if (late) {
    cancellationCharge = roundMoney(paidAmount * 0.1);
    policyApplied = "confirmed_booking_late_10_percent_charge";
    message = "10% cancellation charge has been applied. The refund is pending admin approval.";
  } else {
    policyApplied = "free_cancellation_before_24h";
    message = "Your booking is eligible for free cancellation. The refund is pending admin approval.";
  }

  cancellationCharge = roundMoney(Math.min(Math.max(cancellationCharge, 0), Math.max(paidAmount, 0)));
  const refundAmount = roundMoney(Math.max(paidAmount - cancellationCharge, 0));

  return {
    totalAmount,
    paidAmount,
    baseAmount,
    offerDiscountAmount,
    couponDiscountAmount,
    cancellationCharge,
    refundAmount,
    hoursRemaining,
    policyApplied,
    message,
  };
}

module.exports = {
  CANCELLATION_THRESHOLD_HOURS,
  buildCheckInDateTime,
  calculateCancellationSummary,
  getPaidAmount,
  roundMoney,
};
