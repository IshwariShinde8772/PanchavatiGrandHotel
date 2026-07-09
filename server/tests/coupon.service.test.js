jest.mock("../models", () => ({
  Booking: {
    count: jest.fn(),
  },
  Coupon: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  CouponUsage: {
    count: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const { Booking, Coupon, CouponUsage } = require("../models");
const {
  buildCouponPriceBreakdown,
  consumeCouponForBooking,
  validateCoupon,
} = require("../src/services/couponService");

function coupon(overrides = {}) {
  return {
    id: 1,
    code: "FIRST10",
    title: "10% Extra Off",
    discount_type: "percentage",
    discount_value: 10,
    max_discount_amount: 1000,
    min_booking_amount: 3000,
    valid_from: "2026-01-01",
    valid_till: "2099-12-31",
    eligibility_type: "all_customers",
    eligible_customer_ids: [],
    applicable_scope: "all_rooms",
    applicable_room_ids: [],
    applicable_room_type_ids: [],
    can_combine_with_offers: true,
    total_usage_limit: 100,
    per_user_usage_limit: 1,
    used_count: 0,
    status: "active",
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const room = { id: 5, category: "Deluxe" };

describe("Coupon eligibility, pricing, and consumption", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Booking.count.mockResolvedValue(0);
    CouponUsage.count.mockResolvedValue(0);
    CouponUsage.findOne.mockResolvedValue(null);
    CouponUsage.findAll.mockResolvedValue([]);
  });

  it("applies a percentage coupon after the offer and honors its cap", async () => {
    Coupon.findOne.mockResolvedValue(coupon());
    const prepared = {
      room,
      baseAmount: 10000,
      discountAmount: 2000,
      fare: 8000,
      settings: { gst_percent: 0 },
    };

    const pricing = await buildCouponPriceBreakdown({
      prepared,
      couponCode: "first10",
      customerId: 20,
    });

    expect(pricing.offerDiscountAmount).toBe(2000);
    expect(pricing.amountAfterOffer).toBe(8000);
    expect(pricing.couponDiscountAmount).toBe(800);
    expect(pricing.finalPayableAmount).toBe(7200);
  });

  it("caps a percentage discount at the configured maximum", async () => {
    const result = await validateCoupon({
      coupon: coupon({ discount_value: 25, max_discount_amount: 1000 }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    });
    expect(result.discountAmount).toBe(1000);
    expect(result.amountAfterCoupon).toBe(7000);
  });

  it("rejects a coupon that cannot combine with an active offer", async () => {
    await expect(validateCoupon({
      coupon: coupon({ can_combine_with_offers: false }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
      offerDiscountAmount: 2000,
    })).rejects.toThrow("Coupon cannot be combined with current offer.");
  });

  it("rejects expired coupons with the specific message", async () => {
    await expect(validateCoupon({
      coupon: coupon({ valid_till: "2020-01-01" }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon has expired.");
  });

  it("rejects a first-time coupon for a returning customer", async () => {
    Booking.count.mockResolvedValue(1);
    await expect(validateCoupon({
      coupon: coupon({ eligibility_type: "first_time_customers" }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon is only for first-time customers.");
  });

  it("enforces minimum booking amount", async () => {
    await expect(validateCoupon({
      coupon: coupon(),
      customerId: 20,
      room,
      amountAfterOffer: 2000,
    })).rejects.toThrow("Minimum booking amount should be ₹3000.00.");
  });

  it("enforces per-user and total usage limits", async () => {
    CouponUsage.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1);
    await expect(validateCoupon({
      coupon: coupon(),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon already used by this customer.");

    CouponUsage.count
      .mockReset()
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(0);
    await expect(validateCoupon({
      coupon: coupon(),
      customerId: 21,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon usage limit exceeded.");
  });

  it("enforces selected room and selected customer eligibility", async () => {
    await expect(validateCoupon({
      coupon: coupon({
        applicable_scope: "selected_rooms",
        applicable_room_ids: [99],
      }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon is not valid for this room.");

    await expect(validateCoupon({
      coupon: coupon({
        eligibility_type: "selected_customers",
        eligible_customer_ids: [99],
      }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Coupon is not available for this customer.");
  });

  it("rejects a fixed discount larger than the booking amount", async () => {
    await expect(validateCoupon({
      coupon: coupon({
        discount_type: "fixed",
        discount_value: 9000,
        min_booking_amount: 0,
      }),
      customerId: 20,
      room,
      amountAfterOffer: 8000,
    })).rejects.toThrow("Fixed coupon discount cannot exceed the booking amount.");
  });

  it("records usage and increments used count only when consumption is called", async () => {
    const selectedCoupon = coupon();
    Coupon.findByPk.mockResolvedValue(selectedCoupon);
    CouponUsage.create.mockResolvedValue({ id: 77 });
    const booking = {
      id: 44,
      customer_id: 20,
      coupon_id: 1,
      applied_coupon_code: "FIRST10",
      coupon_discount_amount: 800,
      amount_after_offer: 8000,
      offer_discount_amount: 2000,
      final_payable_amount: 7200,
    };
    const transaction = { LOCK: { UPDATE: "UPDATE" } };

    const usage = await consumeCouponForBooking({
      booking,
      room,
      bookingStatus: "confirmed",
      transaction,
    });

    expect(usage).toEqual({ id: 77 });
    expect(CouponUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      booking_id: 44,
      discount_amount: 800,
      booking_status: "confirmed",
    }), { transaction });
    expect(selectedCoupon.update).toHaveBeenCalledWith(expect.objectContaining({
      used_count: 1,
    }), { transaction });
  });

  it("does not duplicate usage during reservation balance payment", async () => {
    CouponUsage.findOne.mockResolvedValue({ id: 88, booking_id: 44 });
    const existing = await consumeCouponForBooking({
      booking: {
        id: 44,
        coupon_id: 1,
        applied_coupon_code: "FIRST10",
      },
      room,
      bookingStatus: "confirmed",
      transaction: { LOCK: { UPDATE: "UPDATE" } },
    });
    expect(existing.id).toBe(88);
    expect(CouponUsage.create).not.toHaveBeenCalled();
    expect(Coupon.findByPk).not.toHaveBeenCalled();
  });
});
