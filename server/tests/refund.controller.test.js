jest.mock("../models", () => ({
  Admin: {},
  Booking: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  Customer: {},
  HotelSetting: {
    findByPk: jest.fn(),
  },
  RefundRequest: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  Room: {},
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock("../src/services/paymentService", () => ({
  refundPayment: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendRefundEmail: jest.fn(),
}));

const {
  Booking,
  HotelSetting,
  RefundRequest,
  sequelize,
} = require("../models");
const { refundPayment } = require("../src/services/paymentService");
const { sendRefundEmail } = require("../src/services/emailService");
const { approveRefund } = require("../src/controllers/refund/refundController");

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function createTransaction() {
  return {
    LOCK: { UPDATE: "UPDATE" },
    commit: jest.fn(),
    rollback: jest.fn(),
    finished: false,
  };
}

function createPendingRefund(overrides = {}) {
  return {
    id: 10,
    booking_id: 20,
    status: "pending_admin_approval",
    refund_amount: "1250.50",
    amount_paid: "1500.00",
    razorpay_payment_id: "pay_original",
    razorpay_refund_id: null,
    refund_transaction_id: null,
    update: jest.fn(function update(values) {
      Object.assign(this, values);
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

describe("admin Razorpay refund processing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HotelSetting.findByPk.mockResolvedValue({ hotel_name: "Panchavati Grand" });
    RefundRequest.update.mockResolvedValue([1]);
    Booking.update.mockResolvedValue([1]);
    sendRefundEmail.mockResolvedValue({ success: true });
  });

  it("locks the request, marks it processing, and sends the exact paise amount to Razorpay", async () => {
    const transaction = createTransaction();
    sequelize.transaction.mockResolvedValue(transaction);
    const item = createPendingRefund();
    const booking = {
      id: 20,
      status: "cancelled",
      razorpay_payment_id: "pay_original",
      update: jest.fn().mockResolvedValue(true),
    };
    const completed = {
      ...item,
      booking,
      customer: { email: "guest@example.com" },
      status: "completed",
      razorpay_refund_id: "rfnd_123",
    };

    RefundRequest.findByPk
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(completed);
    Booking.findByPk.mockResolvedValue(booking);
    refundPayment.mockResolvedValue({ id: "rfnd_123", status: "processed" });

    const res = createRes();
    await approveRefund({
      params: { id: "10" },
      user: { id: 3, role: "admin" },
    }, res);

    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "processing",
        processed_by_admin_id: 3,
      }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(refundPayment).toHaveBeenCalledWith("pay_original", 125050);
    expect(RefundRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        razorpay_refund_id: "rfnd_123",
      }),
      { where: { id: 10 } }
    );
    expect(Booking.update).toHaveBeenCalledWith(
      { refund_status: "completed", payment_status: "refunded" },
      { where: { id: 20 } }
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Razorpay refund completed",
    }));
  });

  it("blocks duplicate processing before calling Razorpay", async () => {
    const transaction = createTransaction();
    sequelize.transaction.mockResolvedValue(transaction);
    RefundRequest.findByPk.mockResolvedValue(createPendingRefund({
      status: "processing",
      razorpay_refund_id: "rfnd_existing",
    }));
    Booking.findByPk.mockResolvedValue({
      id: 20,
      status: "cancelled",
      razorpay_payment_id: "pay_original",
    });

    await expect(approveRefund({
      params: { id: "10" },
      user: { id: 3, role: "admin" },
    }, createRes())).rejects.toThrow("Refund cannot be processed from processing status");

    expect(transaction.rollback).toHaveBeenCalled();
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers in the controller as defense in depth", async () => {
    await expect(approveRefund({
      params: { id: "10" },
      user: { id: 8, role: "receptionist" },
    }, createRes())).rejects.toMatchObject({ status: 403 });

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(refundPayment).not.toHaveBeenCalled();
  });
});
