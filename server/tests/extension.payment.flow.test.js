jest.mock("../src/services/roomService", () => ({
  calculateStayPricing: jest.fn(),
  countOverlappingBookings: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../src/services/auditService", () => ({
  writeAudit: jest.fn(),
}));

jest.mock("../models", () => ({
  sequelize: { transaction: jest.fn() },
  Bill: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  Booking: {
    findByPk: jest.fn(),
  },
  BookingExtensionRequest: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Customer: {},
  HotelSetting: {
    findByPk: jest.fn(),
  },
  Notification: {
    create: jest.fn(),
  },
  PaymentTransaction: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  Room: {},
}));

const {
  sequelize,
  Bill,
  Booking,
  BookingExtensionRequest,
  HotelSetting,
  Notification,
  PaymentTransaction,
} = require("../models");
const { calculateStayPricing } = require("../src/services/roomService");
const { writeAudit } = require("../src/services/auditService");
const {
  applyExtensionToBooking,
  assertExtensionPaymentsConfirmed,
  calculateExtensionAmounts,
} = require("../src/services/extensionService");
const { confirmExtensionPayment } = require("../src/controllers/booking/extensionController");
const { generateBill } = require("../src/services/billService");

function createTransaction() {
  return {
    LOCK: { UPDATE: "UPDATE" },
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    finished: false,
  };
}

function createResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function createRequest(overrides = {}) {
  const record = {
    id: 12,
    booking_id: 7,
    customer_id: 4,
    status: "approved",
    payment_status: "pending",
    requested_from: "2026-07-03",
    requested_to: "2026-07-04",
    original_checkout_date: "2026-07-03",
    extended_checkout_date: "2026-07-04",
    extension_nights: 1,
    extension_payable_amount: 3000,
    extension_paid_amount: 0,
    extension_remaining_amount: 3000,
    update: jest.fn(async (values) => Object.assign(record, values)),
    get: jest.fn(() => ({ ...record, update: undefined, get: undefined })),
    ...overrides,
  };
  return record;
}

function createBooking(overrides = {}) {
  const booking = {
    id: 7,
    booking_ref: "PGH-7",
    customer_id: 4,
    room_id: 3,
    check_in: "2026-07-01",
    check_out: "2026-07-03",
    nights: 2,
    fare_per_night: 3000,
    base_amount: 6000,
    offer_discount_amount: 0,
    amount_after_offer: 6000,
    total_fare: 6000,
    gst_percent: 0,
    gst_amount: 0,
    total_amount: 6000,
    final_payable_amount: 6000,
    amount_paid: 6000,
    remaining_amount: 0,
    payment_status: "paid",
    customer: { full_name: "Guest", phone: "9999999999", email: "guest@example.com" },
    room: { room_number: "101", category: "Deluxe", base_price: 3000 },
    update: jest.fn(async (values) => Object.assign(booking, values)),
    ...overrides,
  };
  return booking;
}

describe("manual extension payment flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HotelSetting.findByPk.mockResolvedValue({ hotel_name: "Panchavati Grand" });
    Notification.create.mockResolvedValue({});
  });

  it("calculates and applies only the added night amount", async () => {
    const booking = createBooking();
    calculateStayPricing.mockResolvedValue({
      nights: 1,
      baseAmount: 3000,
      discountAmount: 0,
      totalFare: 3000,
    });

    const totals = await calculateExtensionAmounts({
      booking,
      room: booking.room,
      extendedCheckoutDate: "2026-07-04",
    });
    await applyExtensionToBooking(booking, totals);

    expect(totals).toEqual(expect.objectContaining({
      extensionNights: 1,
      extensionBaseAmount: 3000,
      extensionPayableAmount: 3000,
      extensionRemainingAmount: 3000,
    }));
    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      check_out: "2026-07-04",
      nights: 3,
      total_amount: 9000,
      amount_paid: 6000,
      remaining_amount: 3000,
      payment_status: "partially_paid",
    }), { transaction: undefined });
  });

  it("blocks bill generation while extension payment is pending", async () => {
    BookingExtensionRequest.findAll.mockResolvedValue([createRequest()]);

    await expect(assertExtensionPaymentsConfirmed(7)).rejects.toMatchObject({
      message: "Extension payment must be confirmed before generating final bill.",
      status: 409,
      code: "EXTENSION_PAYMENT_PENDING",
    });
  });

  it("confirms the exact manual amount, creates history, and enables billing", async () => {
    const transaction = createTransaction();
    const extension = createRequest();
    const booking = createBooking({
      total_amount: 9000,
      final_payable_amount: 9000,
      remaining_amount: 3000,
      payment_status: "partially_paid",
    });
    const payment = { id: 91, amount: 3000 };
    sequelize.transaction.mockResolvedValue(transaction);
    BookingExtensionRequest.findByPk
      .mockResolvedValueOnce(extension)
      .mockResolvedValueOnce(extension);
    Booking.findByPk.mockResolvedValue(booking);
    PaymentTransaction.findOne.mockResolvedValue(null);
    PaymentTransaction.create.mockResolvedValue(payment);

    const req = {
      params: { id: "12" },
      body: {
        amount: 3000,
        payment_mode: "upi",
        transaction_reference: "UTR-123",
        note: "Received at front desk",
      },
      user: { id: 2, role: "receptionist", name: "Reception" },
      ip: "127.0.0.1",
      get: jest.fn(() => "Jest"),
    };
    const res = createResponse();
    await confirmExtensionPayment(req, res);

    expect(extension.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "completed",
      payment_status: "paid",
      extension_paid_amount: 3000,
      extension_remaining_amount: 0,
      payment_method: "upi",
      payment_reference: "UTR-123",
    }), { transaction });
    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_paid: 9000,
      remaining_amount: 0,
      payment_status: "paid",
    }), { transaction });
    expect(PaymentTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      extension_request_id: 12,
      amount: 3000,
      payment_type: "extension_payment",
      payment_method: "upi",
      payment_reference: "UTR-123",
    }), { transaction });
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "EXTENSION_PAYMENT_CONFIRMED",
      entityId: 7,
    }));
    expect(transaction.commit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("rejects a partial extension payment", async () => {
    const transaction = createTransaction();
    sequelize.transaction.mockResolvedValue(transaction);
    BookingExtensionRequest.findByPk.mockResolvedValue(createRequest());
    Booking.findByPk.mockResolvedValue(createBooking({
      total_amount: 9000,
      amount_paid: 6000,
      remaining_amount: 3000,
    }));
    const res = createResponse();

    await confirmExtensionPayment({
      params: { id: "12" },
      body: { amount: 2000, payment_mode: "cash" },
      user: { id: 2, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Exact remaining extension payment of INR 3000.00 is required",
    }));
    expect(PaymentTransaction.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("blocks duplicate extension payment confirmation", async () => {
    const transaction = createTransaction();
    sequelize.transaction.mockResolvedValue(transaction);
    BookingExtensionRequest.findByPk.mockResolvedValue(createRequest({
      status: "completed",
      payment_status: "paid",
      extension_paid_amount: 3000,
      extension_remaining_amount: 0,
    }));
    const res = createResponse();

    await confirmExtensionPayment({
      params: { id: "12" },
      body: { amount: 3000, payment_mode: "cash" },
      user: { id: 2, role: "receptionist" },
    }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(PaymentTransaction.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  it("stores extension settlement details in a refreshed final bill", async () => {
    const booking = createBooking({
      check_out: "2026-07-04",
      nights: 3,
      total_fare: 9000,
      total_amount: 9000,
      final_payable_amount: 9000,
      amount_paid: 9000,
    });
    const extension = createRequest({
      status: "completed",
      payment_status: "paid",
      extension_paid_amount: 3000,
      extension_remaining_amount: 0,
      payment_method: "upi",
      payment_reference: "UTR-123",
      payment_confirmed_at: new Date("2026-07-03T10:00:00.000Z"),
      original_booking_amount: 6000,
      original_paid_amount: 6000,
    });
    const createdBill = {
      id: 5,
      generated_at: new Date(),
      update: jest.fn(async () => undefined),
    };
    Booking.findByPk.mockResolvedValue(booking);
    BookingExtensionRequest.findAll.mockResolvedValue([extension]);
    Bill.findOne.mockResolvedValue(null);
    Bill.create.mockResolvedValue(createdBill);

    await generateBill(7, [], undefined, { id: 2, role: "receptionist" });

    expect(Bill.create).toHaveBeenCalledWith(expect.objectContaining({
      original_stay_amount: 6000,
      original_paid_amount: 6000,
      total_paid_amount: 9000,
      remaining_amount: 0,
      extension_json: [
        expect.objectContaining({
          extensionNights: 1,
          extensionPayableAmount: 3000,
          extensionPaymentStatus: "paid",
          payment_method: "upi",
          payment_reference: "UTR-123",
        }),
      ],
    }), { transaction: undefined });
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "BILL_GENERATED_AFTER_EXTENSION",
      entityType: "booking",
      entityId: 7,
    }));
  });
});
