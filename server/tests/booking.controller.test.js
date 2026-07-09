const envMock = {
  razorpay: {
    keyId: "",
    keySecret: "",
  },
};

jest.mock("../src/config/env", () => envMock);

jest.mock("../src/services/paymentService", () => ({
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
  refundPayment: jest.fn(),
  fetchPayment: jest.fn(),
}));

jest.mock("../src/services/billService", () => ({
  generateBill: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendBookingConfirmation: jest.fn(),
}));

jest.mock("../src/services/transactionService", () => ({
  createQrTransaction: jest.fn(),
  serializeTransaction: jest.fn(),
}));

jest.mock("../models", () => ({
  sequelize: {
    transaction: jest.fn(),
  },
  Booking: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Customer: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Coupon: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  CouponUsage: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  CustomerHistory: {
    findOrCreate: jest.fn(),
    update: jest.fn(),
  },
  Feedback: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  HotelSetting: {
    findByPk: jest.fn(),
  },
  Notification: {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findOne: jest.fn(),
  },
  PaymentTransaction: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOrCreate: jest.fn(),
    update: jest.fn(),
  },
  Room: {
    findByPk: jest.fn(),
  },
  Task: {
    create: jest.fn(),
  },
  Offer: {
    update: jest.fn(),
    findAll: jest.fn(),
  },
  Bill: {},
  RefundRequest: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { sequelize, Booking, Coupon, CouponUsage, Customer, CustomerHistory, Feedback, HotelSetting, Notification, Offer, PaymentTransaction, RefundRequest, Room, Task } = require("../models");
const { createOrder, fetchPayment, verifySignature } = require("../src/services/paymentService");
const { generateBill } = require("../src/services/billService");
const { sendBookingConfirmation } = require("../src/services/emailService");
const {
  verifyBookingPayment,
  createBooking,
  createReservedPaymentOrder,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  earlyCheckOutBooking,
  confirmReservation,
  extendBooking,
  postponeBookingCheckIn,
} = require("../src/controllers/booking/bookingController");
const { getBusinessDate } = require("../src/utils/dateHelpers");

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("Booking controller hardening and lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    envMock.razorpay.keyId = "";
    envMock.razorpay.keySecret = "";
    RefundRequest.findOne.mockResolvedValue(null);
    CouponUsage.findOne.mockResolvedValue(null);
    CouponUsage.findAll.mockResolvedValue([]);
    CouponUsage.count.mockResolvedValue(0);
    Booking.count.mockResolvedValue(0);
    Offer.update.mockResolvedValue([0]);
    Offer.findAll.mockResolvedValue([]);
  });

  it("fails closed when Razorpay verification config is missing", async () => {
    const req = {
      body: {
        booking_id: 1,
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "sig_1",
      },
    };
    const res = createRes();

    await verifyBookingPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining("temporarily unavailable"),
    }));
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });

  it("creates the Razorpay order from the server-calculated offer-plus-coupon total", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const customer = {
      id: 42,
      full_name: "Guest",
      email: "guest@example.com",
      phone: "9876543210",
      id_type: "aadhaar",
      id_number: "123412341234",
      id_doc_url: "https://example.com/id.jpg",
      id_doc_public_id: "id-proof",
      update: jest.fn().mockResolvedValue(true),
    };
    Customer.findByPk.mockResolvedValue(customer);
    Room.findByPk.mockResolvedValue({
      id: 5,
      category: "Deluxe",
      base_price: 10000,
      total_units: 1,
      capacity: 2,
      is_active: true,
      status: "available",
    });
    Booking.findAll.mockResolvedValue([]);
    HotelSetting.findByPk.mockResolvedValue({ gst_percent: 0 });
    Offer.findAll.mockResolvedValue([{
      id: 7,
      title: "20% room offer",
      discount_pct: 20,
      start_date: "2026-01-01",
      end_date: "2099-12-31",
      room_category: "Deluxe",
      is_active: true,
    }]);
    Coupon.findOne.mockResolvedValue({
      id: 3,
      code: "FIRST10",
      status: "active",
      valid_from: "2026-01-01",
      valid_till: "2099-12-31",
      eligibility_type: "all_customers",
      applicable_scope: "all_rooms",
      min_booking_amount: 3000,
      can_combine_with_offers: true,
      total_usage_limit: 100,
      per_user_usage_limit: 1,
      used_count: 0,
      discount_type: "percentage",
      discount_value: 10,
      max_discount_amount: 1000,
    });
    Booking.findOne.mockResolvedValue(null);
    const booking = {
      id: 25,
      customer_id: 42,
      amount_paid: 0,
      payment_status: "pending",
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    Booking.create.mockResolvedValue(booking);
    PaymentTransaction.findOne.mockResolvedValue(null);
    createOrder.mockResolvedValue({
      id: "order_coupon_total",
      amount: 720000,
      currency: "INR",
    });
    PaymentTransaction.create.mockResolvedValue({
      amount: 7200,
      currency: "INR",
      payment_type: "full_booking",
      razorpay_order_id: "order_coupon_total",
    });

    const res = createRes();
    await createBooking({
      user: { id: 42, role: "customer" },
      body: {
        room_id: 5,
        check_in: "2099-07-10",
        check_in_time: "12:00",
        check_out: "2099-07-11",
        guests: 1,
        special_requests: "",
        payment_method: "online",
        checkout_token: "6b58524a-1ab4-4d91-97ef-509bd4d08728",
        coupon_code: "first10",
        guest: {
          full_name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          id_type: customer.id_type,
          id_number: customer.id_number,
          id_doc_url: customer.id_doc_url,
          id_doc_public_id: customer.id_doc_public_id,
          live_photo_url: "https://example.com/live.jpg",
          live_photo_public_id: "live-photo",
        },
      },
    }, res);

    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      base_amount: 10000,
      offer_discount_amount: 2000,
      amount_after_offer: 8000,
      applied_coupon_code: "FIRST10",
      coupon_discount_amount: 800,
      final_payable_amount: 7200,
      total_amount: 7200,
      checkInTime: "12:00",
      noShowGraceMinutes: 60,
      checkInDateTime: new Date("2099-07-10T06:30:00.000Z"),
      autoCancelAt: new Date("2099-07-10T07:30:00.000Z"),
    }), { transaction });
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
      amount: 720000,
      currency: "INR",
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("returns idempotent success for repeated payment verification", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";

    const booking = {
      id: 1,
      booking_ref: "BKG-0001",
      customer_id: 42,
      status: "confirmed",
      payment_status: "paid",
      razorpay_payment_id: "pay_1",
      total_amount: 1200,
      customer: { id: 42, full_name: "Guest" },
      update: jest.fn(),
    };

    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    Booking.findOne.mockResolvedValue(booking);

    const paymentRecord = {
      status: "paid",
      update: jest.fn(),
    };
    PaymentTransaction.findOne.mockResolvedValue(paymentRecord);

    const req = {
      body: {
        booking_id: 1,
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "sig_1",
      },
      user: { id: 42, role: "customer" },
    };
    const res = createRes();

    await verifyBookingPayment(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Payment already verified",
    }));
    expect(booking.update).not.toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
    expect(sendBookingConfirmation).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("confirms a full booking only after signature, amount, and availability checks pass", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 2,
      booking_ref: "BKG-0002",
      customer_id: 42,
      room_id: 5,
      check_in: "2026-07-10",
      check_out: "2026-07-11",
      status: "pending",
      payment_status: "pending",
      reservation_type: "confirmed_booking",
      razorpay_order_id: "order_full",
      total_amount: 1120,
      amount_paid: 0,
      advance_paid: 0,
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    const pendingPayment = {
      amount: 1120,
      payment_type: "full_booking",
      update: jest.fn().mockResolvedValue(true),
    };
    Booking.findOne.mockResolvedValue(booking);
    PaymentTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingPayment);
    verifySignature.mockReturnValue(true);
    fetchPayment.mockResolvedValue({
      id: "pay_full",
      order_id: "order_full",
      currency: "INR",
      amount: 112000,
      status: "captured",
    });
    Room.findByPk.mockResolvedValue({ id: 5, is_active: true, status: "available", total_units: 1 });
    Booking.findAll.mockResolvedValue([]);
    Customer.findByPk.mockResolvedValue({ id: 42, full_name: "Guest" });
    HotelSetting.findByPk.mockResolvedValue({ gst_percent: 12 });

    const req = {
      body: {
        booking_id: 2,
        razorpay_order_id: "order_full",
        razorpay_payment_id: "pay_full",
        razorpay_signature: "valid_signature",
      },
      user: { id: 42, role: "customer" },
    };
    const res = createRes();

    await verifyBookingPayment(req, res);

    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "confirmed",
      payment_status: "paid",
      amount_paid: 1120,
      remaining_amount: 0,
      razorpay_payment_id: "pay_full",
    }), expect.any(Object));
    expect(pendingPayment.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "paid",
      razorpay_payment_id: "pay_full",
    }), expect.any(Object));
    expect(transaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Payment verified and booking confirmed",
    }));
  });

  it("records coupon usage only after a captured coupon-aware payment is verified", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 22,
      booking_ref: "BKG-COUPON-22",
      customer_id: 42,
      room_id: 5,
      check_in: "2026-07-10",
      check_out: "2026-07-11",
      status: "pending",
      payment_status: "pending",
      reservation_type: "confirmed_booking",
      razorpay_order_id: "order_coupon",
      base_amount: 10000,
      offer_discount_amount: 2000,
      amount_after_offer: 8000,
      coupon_id: 3,
      applied_coupon_code: "FIRST10",
      coupon_discount_amount: 800,
      final_payable_amount: 7200,
      total_amount: 7200,
      amount_paid: 0,
      advance_paid: 0,
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    const pendingPayment = {
      amount: 7200,
      payment_type: "full_booking",
      update: jest.fn().mockResolvedValue(true),
    };
    const selectedCoupon = {
      id: 3,
      code: "FIRST10",
      status: "active",
      valid_from: "2026-01-01",
      valid_till: "2099-12-31",
      eligibility_type: "all_customers",
      applicable_scope: "all_rooms",
      min_booking_amount: 3000,
      can_combine_with_offers: true,
      total_usage_limit: 100,
      per_user_usage_limit: 1,
      used_count: 0,
      discount_type: "percentage",
      discount_value: 10,
      max_discount_amount: 1000,
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findOne.mockResolvedValue(booking);
    PaymentTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingPayment);
    verifySignature.mockReturnValue(true);
    fetchPayment.mockResolvedValue({
      id: "pay_coupon",
      order_id: "order_coupon",
      currency: "INR",
      amount: 720000,
      status: "captured",
    });
    Room.findByPk.mockResolvedValue({ id: 5, category: "Deluxe", is_active: true, status: "available", total_units: 1 });
    Booking.findAll.mockResolvedValue([]);
    Booking.count.mockResolvedValue(0);
    Coupon.findByPk.mockResolvedValue(selectedCoupon);
    CouponUsage.create.mockResolvedValue({ id: 90 });
    Customer.findByPk.mockResolvedValue({ id: 42, full_name: "Guest" });

    await verifyBookingPayment({
      body: {
        booking_id: 22,
        razorpay_order_id: "order_coupon",
        razorpay_payment_id: "pay_coupon",
        razorpay_signature: "valid_signature",
      },
      user: { id: 42, role: "customer" },
    }, createRes());

    expect(CouponUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      coupon_id: 3,
      booking_id: 22,
      customer_id: 42,
      discount_amount: 800,
      final_amount_after_coupon: 7200,
    }), { transaction });
    expect(selectedCoupon.update).toHaveBeenCalledWith(expect.objectContaining({
      used_count: 1,
    }), { transaction });
    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "confirmed",
      amount_paid: 7200,
      remaining_amount: 0,
    }), { transaction });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("reserves a room after exactly the verified 10% advance", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 3,
      booking_ref: "BKG-0003",
      customer_id: 42,
      room_id: 5,
      check_in: "2026-07-12",
      check_out: "2026-07-13",
      status: "pending",
      payment_status: "pending",
      reservation_type: "reserved_booking",
      razorpay_order_id: "order_advance",
      total_amount: 10000,
      amount_paid: 0,
      advance_paid: 0,
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    const pendingPayment = {
      amount: 1000,
      payment_type: "reservation_advance",
      update: jest.fn().mockResolvedValue(true),
    };
    Booking.findOne.mockResolvedValue(booking);
    PaymentTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingPayment);
    verifySignature.mockReturnValue(true);
    fetchPayment.mockResolvedValue({
      id: "pay_advance",
      order_id: "order_advance",
      currency: "INR",
      amount: 100000,
      status: "captured",
    });
    Room.findByPk.mockResolvedValue({ id: 5, is_active: true, status: "available", total_units: 1 });
    Booking.findAll.mockResolvedValue([]);

    const req = {
      body: {
        booking_id: 3,
        razorpay_order_id: "order_advance",
        razorpay_payment_id: "pay_advance",
        razorpay_signature: "valid_signature",
      },
      user: { id: 42, role: "customer" },
    };
    const res = createRes();

    await verifyBookingPayment(req, res);

    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "reserved",
      payment_status: "partially_paid",
      advance_paid: 1000,
      amount_paid: 1000,
      remaining_amount: 9000,
    }), expect.any(Object));
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("rejects a captured amount that differs from the server order", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    Booking.findOne.mockResolvedValue({
      id: 4,
      customer_id: 42,
      razorpay_order_id: "order_tampered",
    });
    PaymentTransaction.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        amount: 1000,
        payment_type: "full_booking",
      });
    verifySignature.mockReturnValue(true);
    fetchPayment.mockResolvedValue({
      id: "pay_tampered",
      order_id: "order_tampered",
      currency: "INR",
      amount: 99900,
      status: "captured",
    });

    const req = {
      body: {
        booking_id: 4,
        razorpay_order_id: "order_tampered",
        razorpay_payment_id: "pay_tampered",
        razorpay_signature: "valid_signature",
      },
      user: { id: 42, role: "customer" },
    };

    await expect(verifyBookingPayment(req, createRes())).rejects.toThrow(
      "Captured Razorpay payment does not match the server order"
    );
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
    expect(CouponUsage.create).not.toHaveBeenCalled();
  });

  it("creates a Razorpay balance order for only the remaining reservation amount", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const booking = {
      id: 5,
      customer_id: 42,
      room_id: 2,
      check_in: "2026-07-20",
      check_out: "2026-07-21",
      reservation_type: "reserved_booking",
      status: "reserved",
      payment_status: "partially_paid",
      total_amount: 10000,
      amount_paid: 1000,
      advance_paid: 1000,
      update: jest.fn().mockResolvedValue(true),
    };
    Booking.findOne.mockResolvedValue(booking);
    Room.findByPk.mockResolvedValue({ id: 2, is_active: true, status: "available", total_units: 1 });
    Booking.findAll.mockResolvedValue([]);
    PaymentTransaction.findOne.mockReset().mockResolvedValue(null);
    createOrder.mockResolvedValue({
      id: "order_balance",
      amount: 900000,
      currency: "INR",
    });
    PaymentTransaction.create.mockResolvedValue({
      amount: 9000,
      currency: "INR",
      payment_type: "reservation_balance",
      razorpay_order_id: "order_balance",
    });
    const req = {
      params: { id: "5" },
      user: { id: 42, role: "customer" },
    };
    const res = createRes();

    await createReservedPaymentOrder(req, res);

    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
      amount: 900000,
      currency: "INR",
    }));
    expect(PaymentTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 9000,
      payment_type: "reservation_balance",
      status: "pending",
    }), expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amount: 900000,
        amount_rupees: 9000,
        payment_type: "reservation_balance",
      }),
    }));
  });

  it("sets the remaining amount to zero after the verified reservation balance", async () => {
    envMock.razorpay.keyId = "rzp_test_key";
    envMock.razorpay.keySecret = "rzp_secret";
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const booking = {
      id: 6,
      booking_ref: "BKG-0006",
      customer_id: 42,
      room_id: 2,
      check_in: "2026-07-20",
      check_out: "2026-07-21",
      status: "reserved",
      payment_status: "partially_paid",
      reservation_type: "reserved_booking",
      razorpay_order_id: "order_balance",
      total_amount: 10000,
      amount_paid: 1000,
      advance_paid: 1000,
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };
    const pendingPayment = {
      amount: 9000,
      payment_type: "reservation_balance",
      update: jest.fn().mockResolvedValue(true),
    };
    Booking.findOne.mockResolvedValue(booking);
    PaymentTransaction.findOne.mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pendingPayment);
    verifySignature.mockReturnValue(true);
    fetchPayment.mockResolvedValue({
      id: "pay_balance",
      order_id: "order_balance",
      currency: "INR",
      amount: 900000,
      status: "captured",
    });
    Room.findByPk.mockResolvedValue({ id: 2, is_active: true, status: "available", total_units: 1 });
    Booking.findAll.mockResolvedValue([]);
    Customer.findByPk.mockResolvedValue({ id: 42, full_name: "Guest" });
    HotelSetting.findByPk.mockResolvedValue({ gst_percent: 12 });

    await verifyBookingPayment({
      body: {
        booking_id: 6,
        razorpay_order_id: "order_balance",
        razorpay_payment_id: "pay_balance",
        razorpay_signature: "valid_signature",
      },
      user: { id: 42, role: "customer" },
    }, createRes());

    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "confirmed",
      payment_status: "paid",
      reservation_type: "confirmed_booking",
      amount_paid: 10000,
      advance_paid: 1000,
      remaining_amount: 0,
    }), expect.any(Object));
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("check-in sets booking/room status and creates task + notification", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 10,
      room_id: 7,
      booking_ref: "BKG-CHECKIN",
      customer_id: 55,
      payment_method: "cash",
      payment_status: "paid",
      remaining_amount: 0,
      status: "confirmed",
      check_in: getBusinessDate(),
      update: jest.fn().mockResolvedValue(true),
    };

    const room = {
      id: 7,
      room_number: "205",
      is_active: true,
      status: "available",
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
    Booking.count.mockResolvedValue(0);
    Room.findByPk.mockResolvedValue(room);
    Task.create.mockResolvedValue({ id: 91 });
    Notification.create.mockResolvedValue({ id: 92 });

    const req = {
      params: { id: "10" },
      body: {
        id_verified: true,
        payment_method: "cash",
        payment_status: "paid",
      },
      user: {
        id: 3,
        role: "receptionist",
      },
    };
    const res = createRes();

    await checkInBooking(req, res);

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "checked_in",
        id_verified: true,
      }),
      expect.any(Object)
    );
    expect(room.update).toHaveBeenCalledWith({ status: "occupied" }, expect.any(Object));
    expect(Task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        task_type: "service",
      }),
      expect.any(Object)
    );
    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
  });

  it("rejects a duplicate check-in before making room or task changes", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    Booking.findByPk.mockResolvedValue({
      id: 11,
      status: "checked_in",
      check_in: getBusinessDate(),
    });
    const res = createRes();

    await checkInBooking({
      params: { id: "11" },
      body: { id_verified: true },
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("already checked in"),
    }));
    expect(Room.findByPk).not.toHaveBeenCalled();
    expect(Task.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("rejects check-in while the room is still cleaning", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const booking = {
      id: 14,
      room_id: 8,
      booking_ref: "BKG-CLEANING",
      status: "confirmed",
      payment_status: "paid",
      remaining_amount: 0,
      check_in: getBusinessDate(),
      update: jest.fn(),
    };
    Booking.findByPk.mockResolvedValue(booking);
    Room.findByPk.mockResolvedValue({
      id: 8,
      is_active: true,
      status: "cleaning",
      update: jest.fn(),
    });
    const res = createRes();

    await checkInBooking({
      params: { id: "14" },
      body: { id_verified: true },
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("cleaning"),
    }));
    expect(booking.update).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("rejects check-in before the booked check-in date", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const tomorrow = getBusinessDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    Booking.findByPk.mockResolvedValue({
      id: 13,
      status: "confirmed",
      payment_status: "paid",
      remaining_amount: 0,
      check_in: tomorrow,
    });
    const res = createRes();

    await checkInBooking({
      params: { id: "13" },
      body: { id_verified: true },
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: `Check-in is available on ${tomorrow}`,
    }));
    expect(Room.findByPk).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("rejects a payment that is short by a decimal fraction", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const booking = {
      id: 12,
      status: "confirmed",
      payment_status: "partially_paid",
      total_amount: "2000.00",
      amount_paid: "749.50",
    };
    Booking.findByPk.mockResolvedValue(booking);
    const res = createRes();

    await confirmReservation({
      params: { id: "12" },
      body: {
        amount: 1250,
        payment_mode: "cash",
      },
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Exact remaining payment of INR 1250.50 is required",
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it("check-out sets cleaning state and creates bill/history/task/notifications", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const roomUpdate = jest.fn().mockResolvedValue(true);
    const booking = {
      id: 20,
      booking_ref: "BKG-CHECKOUT",
      customer_id: 87,
      room_id: 5,
      check_in: "2026-04-20",
      check_out: getBusinessDate(),
      nights: 2,
      total_amount: 3000,
      extra_charges: 0,
      payment_method: "cash",
      payment_status: "paid",
      status: "checked_in",
      customer: {
        full_name: "Aarav",
        phone: "+919999999999",
      },
      room: {
        id: 5,
        room_number: "305",
        category: "Deluxe",
        status: "occupied",
        update: roomUpdate,
      },
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
    Feedback.findOne.mockResolvedValue(null);
    Feedback.create.mockResolvedValue({ id: 336 });
    CustomerHistory.findOrCreate.mockResolvedValue([{}, true]);
    CustomerHistory.update.mockResolvedValue([1]);
    generateBill.mockResolvedValue({ id: 333 });
    Task.create.mockResolvedValue({ id: 334 });
    Notification.create.mockResolvedValue({ id: 335 });

    const req = {
      params: { id: "20" },
      body: {
        extras: [{ label: "Mini Bar", amount: 450 }],
        payment_method: "cash",
        payment_status: "paid",
        feedback: {
          rating: 5,
          feedback_text: "Excellent stay",
          internal_note: "Guest requested a quiet room next time",
        },
      },
      user: {
        id: 3,
        role: "receptionist",
      },
    };
    const res = createRes();

    await checkOutBooking(req, res);

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "checked_out",
      }),
      expect.any(Object)
    );
    expect(roomUpdate).toHaveBeenCalledWith({ status: "cleaning" }, expect.any(Object));
    expect(CustomerHistory.findOrCreate).toHaveBeenCalled();
    expect(Feedback.create).toHaveBeenCalledWith(expect.objectContaining({
      booking_id: 20,
      rating: 5,
      comment: "Excellent stay",
      source: "receptionist_checkout",
      collected_by_receptionist_id: 3,
    }), expect.any(Object));
    expect(generateBill).toHaveBeenCalled();
    const [, normalizedExtras] = generateBill.mock.calls[0];
    expect(normalizedExtras[0]).toEqual(expect.objectContaining({
      title: "Mini Bar",
      amount: 450,
    }));
    expect(Task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        task_type: "cleaning",
      }),
      expect.any(Object)
    );
    expect(Notification.create).toHaveBeenCalledTimes(2);
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
  });

  it("rejects check-out before the booked check-out date", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const tomorrow = getBusinessDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    Booking.findByPk.mockResolvedValue({
      id: 21,
      status: "checked_in",
      check_out: tomorrow,
    });
    const res = createRes();

    await checkOutBooking({
      params: { id: "21" },
      body: {},
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: `Check-out is available on ${tomorrow}`,
    }));
    expect(Feedback.findOne).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("checks out a paid guest early, records policy details, and sends the room to cleaning", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    const tomorrow = getBusinessDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const roomUpdate = jest.fn().mockResolvedValue(true);
    const booking = {
      id: 22,
      booking_ref: "BKG-EARLY-22",
      customer_id: 91,
      room_id: 8,
      check_in: getBusinessDate(),
      check_out: tomorrow,
      actual_checkin_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      nights: 2,
      total_amount: 4200,
      amount_paid: 4200,
      remaining_amount: 0,
      extra_charges: 0,
      payment_method: "cash",
      payment_status: "paid",
      status: "checked_in",
      customer: {
        full_name: "Meera",
        phone: "+919999999998",
      },
      room: {
        id: 8,
        room_number: "208",
        name: "Godavari",
        category: "Deluxe",
        status: "occupied",
        update: roomUpdate,
      },
      update: jest.fn(function update(values) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
    };

    Booking.findByPk.mockResolvedValue(booking);
    HotelSetting.findByPk.mockResolvedValue({ check_out_time: "11:00" });
    Feedback.findOne.mockResolvedValue(null);
    Feedback.create.mockResolvedValue({ id: 401 });
    CustomerHistory.findOrCreate.mockResolvedValue([{}, true]);
    CustomerHistory.update.mockResolvedValue([1]);
    generateBill.mockResolvedValue({ id: 402 });
    Task.create.mockResolvedValue({ id: 403 });
    Notification.create.mockResolvedValue({ id: 404 });

    const res = createRes();
    await earlyCheckOutBooking({
      params: { id: "22" },
      body: {
        reason: "Guest changed travel plans",
        internal_note: "Airport transfer arranged",
        extras: [],
        payment_method: "cash",
        payment_status: "paid",
        feedback: {
          rating: 5,
          feedback_text: "Very comfortable stay",
          internal_note: "Airport transfer arranged",
        },
      },
      user: { id: 3, role: "receptionist", name: "Front Desk" },
      headers: { "user-agent": "jest" },
      ip: "127.0.0.1",
    }, res);

    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "checked_out",
      is_early_checkout: true,
      early_checkout_at: expect.any(Date),
      early_checkout_reason: "Guest changed travel plans",
      early_checkout_note: "Airport transfer arranged",
      original_checkout_date: tomorrow,
      early_checkout_refund_amount: 0,
      early_checkout_adjustment_charge: 0,
      room_status_after_checkout: "cleaning",
      checked_out_by_staff_id: 3,
      checked_out_by_role: "receptionist",
    }), { transaction });
    expect(booking.early_checkout_policy_applied).toContain("No automatic refund");
    expect(roomUpdate).toHaveBeenCalledWith({ status: "cleaning" }, { transaction });
    expect(Task.create).toHaveBeenCalledWith(
      expect.objectContaining({ task_type: "cleaning", room_id: 8 }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining("Early check-out completed"),
    }));
  });

  it("blocks duplicate early check-out", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    Booking.findByPk.mockResolvedValue({
      id: 23,
      status: "checked_out",
      is_early_checkout: true,
    });
    const res = createRes();

    await earlyCheckOutBooking({
      params: { id: "23" },
      body: {},
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("already been checked out early"),
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(Feedback.findOne).not.toHaveBeenCalled();
  });

  it("blocks early check-out while a booking balance remains unpaid", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);
    Booking.findByPk.mockResolvedValue({
      id: 24,
      status: "checked_in",
      actual_checkin_time: new Date(),
      check_out: getBusinessDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      payment_status: "partially_paid",
      remaining_amount: 500.25,
    });
    HotelSetting.findByPk.mockResolvedValue({ check_out_time: "11:00" });
    const res = createRes();

    await earlyCheckOutBooking({
      params: { id: "24" },
      body: { reason: "Guest request" },
      user: { id: 3, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Settle the remaining amount of INR 500.25 before early check-out",
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(Feedback.findOne).not.toHaveBeenCalled();
  });

  it("blocks cancellation for pending bookings", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 31,
      status: "pending",
      customer_id: 5,
    };
    Booking.findByPk.mockResolvedValue(booking);

    const req = {
      params: { id: "31" },
      body: { reason: "Change of plans" },
      user: { id: 5, role: "customer" },
    };
    const res = createRes();

    await cancelBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining("Pending bookings cannot be cancelled"),
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it("allows cancellation for confirmed bookings and updates room status safely", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const roomUpdate = jest.fn().mockResolvedValue(true);
    const booking = {
      id: 44,
      booking_ref: "BKG-CANCEL-44",
      status: "confirmed",
      check_in: "2026-06-20",
      fare_per_night: 2200,
      total_amount: 6600,
      payment_status: "pay_at_hotel",
      razorpay_payment_id: null,
      customer_id: 7,
      room_id: 2,
      room: {
        status: "occupied",
        update: roomUpdate,
      },
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
    Booking.count.mockResolvedValue(0);
    PaymentTransaction.update.mockResolvedValue([1]);
    Notification.create.mockResolvedValue({ id: 1 });

    const req = {
      params: { id: "44" },
      body: { reason: "Guest request" },
      user: { id: 7, role: "customer" },
    };
    const res = createRes();

    await cancelBooking(req, res);

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        refund_status: "not_applicable",
        refund_amount: 0,
      }),
      expect.any(Object)
    );
    expect(Booking.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        room_id: 2,
        status: "checked_in",
      }),
    }));
    expect(roomUpdate).toHaveBeenCalledWith({ status: "available" }, expect.any(Object));
    expect(RefundRequest.create).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Booking cancelled successfully",
    }));
  });

  it("blocks cancellation for checked-in bookings", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 55,
      status: "checked_in",
      customer_id: 9,
    };
    Booking.findByPk.mockResolvedValue(booking);

    const req = {
      params: { id: "55" },
      body: { reason: "Cannot travel" },
      user: { id: 9, role: "customer" },
    };
    const res = createRes();

    await cancelBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining("Checked-in bookings cannot be cancelled"),
    }));
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("cancels a paid booking immediately and creates one admin-pending refund request", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 45,
      booking_ref: "BKG-CANCEL-45",
      status: "confirmed",
      check_in: "2099-06-20",
      total_amount: 6600,
      advance_paid: 6600,
      amount_paid: 6600,
      payment_status: "paid",
      reservation_type: "confirmed_booking",
      razorpay_payment_id: "pay_original_45",
      customer_id: 7,
      room_id: 2,
      customer: {
        full_name: "Test Guest",
        email: "guest@example.com",
      },
      room: {
        status: "available",
      },
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
    HotelSetting.findByPk.mockResolvedValue({ check_in_time: "14:00" });
    RefundRequest.create.mockResolvedValue({ id: 501 });
    PaymentTransaction.update.mockResolvedValue([1]);
    Notification.create.mockResolvedValue({ id: 1 });

    const res = createRes();
    await cancelBooking({
      params: { id: "45" },
      body: { reason: "Change of plans" },
      user: { id: 7, role: "customer" },
    }, res);

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        refund_status: "pending_admin_approval",
        refund_amount: 6600,
      }),
      expect.objectContaining({ transaction })
    );
    expect(RefundRequest.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { booking_id: 45 },
      transaction,
    }));
    expect(RefundRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_id: 45,
        status: "pending_admin_approval",
        razorpay_payment_id: "pay_original_45",
      }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
  });

  it("rejects extend booking when booking is not checked in", async () => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 77,
      status: "confirmed",
      room: { id: 10 },
    };
    Booking.findByPk.mockResolvedValue(booking);

    const req = {
      params: { id: "77" },
      body: {
        check_out: "2026-07-10",
        reason: "Guest requested extension",
        payment_method: "cash",
      },
    };
    const res = createRes();

    await extendBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: "Only checked-in bookings can be extended.",
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it("rejects postponing booking when booking is already checked in", async () => {
    const transaction = {
      LOCK: { UPDATE: "UPDATE" },
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(transaction);

    const booking = {
      id: 88,
      status: "checked_in",
      room: { total_units: 1 },
    };
    Booking.findByPk.mockResolvedValue(booking);

    const req = {
      params: { id: "88" },
      body: {
        check_in: "2026-07-11",
        reason: "Guest requested new arrival date",
      },
    };
    const res = createRes();

    await postponeBookingCheckIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: "Checked-in bookings cannot be postponed.",
    }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });
});
