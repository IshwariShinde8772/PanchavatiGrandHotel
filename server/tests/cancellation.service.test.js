const { calculateCancellationSummary } = require("../src/services/cancellationService");

const settings = { check_in_time: "14:00" };
const now = new Date("2026-07-01T16:00:00.000Z");

describe("24-hour cancellation policy", () => {
  it("fully refunds a confirmed booking cancelled at least 24 hours before check-in", () => {
    const result = calculateCancellationSummary({
      check_in: "2026-07-03",
      total_amount: 10000,
      advance_paid: 10000,
      payment_status: "paid",
      reservation_type: "confirmed_booking",
    }, settings, now);
    expect(result.cancellationCharge).toBe(0);
    expect(result.refundAmount).toBe(10000);
    expect(result.policyApplied).toBe("free_cancellation_before_24h");
  });

  it("charges 10% of total for a late confirmed booking cancellation", () => {
    const result = calculateCancellationSummary({
      check_in: "2026-07-02",
      total_amount: 10000,
      advance_paid: 10000,
      payment_status: "paid",
      reservation_type: "confirmed_booking",
    }, settings, now);
    expect(result.cancellationCharge).toBe(1000);
    expect(result.refundAmount).toBe(9000);
  });

  it("calculates a late refund from the final discounted amount actually paid", () => {
    const result = calculateCancellationSummary({
      check_in: "2026-07-02",
      base_amount: 10000,
      offer_discount_amount: 2000,
      coupon_discount_amount: 800,
      final_payable_amount: 7200,
      total_amount: 7200,
      amount_paid: 7200,
      advance_paid: 720,
      payment_status: "paid",
      reservation_type: "confirmed_booking",
    }, settings, now);
    expect(result.baseAmount).toBe(10000);
    expect(result.offerDiscountAmount).toBe(2000);
    expect(result.couponDiscountAmount).toBe(800);
    expect(result.paidAmount).toBe(7200);
    expect(result.cancellationCharge).toBe(720);
    expect(result.refundAmount).toBe(6480);
  });

  it("refunds a reservation advance when cancelled at least 24 hours before check-in", () => {
    const result = calculateCancellationSummary({
      check_in: "2026-07-03",
      total_amount: 10000,
      advance_amount: 1000,
      advance_paid: 1000,
      reservation_type: "reserved_booking",
    }, settings, now);
    expect(result.cancellationCharge).toBe(0);
    expect(result.refundAmount).toBe(1000);
  });

  it("forfeits only the reservation advance for a late cancellation", () => {
    const result = calculateCancellationSummary({
      check_in: "2026-07-02",
      total_amount: 10000,
      advance_amount: 1000,
      advance_paid: 1000,
      reservation_type: "reserved_booking",
    }, settings, now);
    expect(result.cancellationCharge).toBe(1000);
    expect(result.refundAmount).toBe(0);
    expect(result.policyApplied).toBe("reservation_late_advance_forfeited");
  });
});
