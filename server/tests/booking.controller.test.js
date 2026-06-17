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
    count: jest.fn(),
  },
  Customer: {},
  CustomerHistory: {
    findOrCreate: jest.fn(),
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
    findOrCreate: jest.fn(),
    update: jest.fn(),
  },
  Room: {
    findByPk: jest.fn(),
  },
  Task: {
    create: jest.fn(),
  },
  Bill: {},
}));

const { sequelize, Booking, CustomerHistory, HotelSetting, Notification, PaymentTransaction, Room, Task } = require("../models");
const { verifySignature } = require("../src/services/paymentService");
const { generateBill } = require("../src/services/billService");
const { sendBookingConfirmation } = require("../src/services/emailService");
const {
  verifyBookingPayment,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  extendBooking,
  postponeBookingCheckIn,
} = require("../src/controllers/booking/bookingController");

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

    Booking.findByPk.mockResolvedValue(booking);
    verifySignature.mockReturnValue(true);

    const paymentRecord = {
      status: "paid",
      update: jest.fn(),
    };
    PaymentTransaction.findOrCreate.mockResolvedValue([paymentRecord, false]);

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

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Payment already verified",
    }));
    expect(booking.update).not.toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
    expect(sendBookingConfirmation).not.toHaveBeenCalled();
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
      payment_status: "pending",
      update: jest.fn().mockResolvedValue(true),
    };

    const room = {
      id: 7,
      room_number: "205",
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
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
      check_out: "2026-04-22",
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
        update: roomUpdate,
      },
      update: jest.fn().mockResolvedValue(true),
    };

    Booking.findByPk.mockResolvedValue(booking);
    CustomerHistory.findOrCreate.mockResolvedValue([{}, true]);
    generateBill.mockResolvedValue({ id: 333 });
    Task.create.mockResolvedValue({ id: 334 });
    Notification.create.mockResolvedValue({ id: 335 });

    const req = {
      params: { id: "20" },
      body: {
        extras: [{ label: "Mini Bar", amount: 450 }],
        payment_method: "cash",
        payment_status: "paid",
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
      expect.objectContaining({ status: "cancelled" }),
      expect.any(Object)
    );
    expect(Booking.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        room_id: 2,
        status: "checked_in",
      }),
    }));
    expect(roomUpdate).toHaveBeenCalledWith({ status: "available" }, expect.any(Object));
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
