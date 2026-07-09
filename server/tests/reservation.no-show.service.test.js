jest.mock("../models", () => ({
  sequelize: { transaction: jest.fn() },
  Booking: {
    count: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Customer: {},
  HotelSetting: { findByPk: jest.fn() },
  Notification: { bulkCreate: jest.fn() },
  PaymentTransaction: { update: jest.fn() },
  RefundRequest: { findOrCreate: jest.fn() },
  Room: {},
}));

jest.mock("../src/services/couponService", () => ({
  updateCouponUsageForBooking: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendNoShowCancellationEmail: jest.fn(),
}));

jest.mock("../src/services/auditService", () => ({
  writeAudit: jest.fn(),
}));

const {
  Booking,
  HotelSetting,
  Notification,
  PaymentTransaction,
  RefundRequest,
  sequelize,
} = require("../models");
const { updateCouponUsageForBooking } = require("../src/services/couponService");
const { sendNoShowCancellationEmail } = require("../src/services/emailService");
const {
  autoCancelOverdueBookings,
  processNoShowBooking,
} = require("../src/services/reservationService");

function transactionMock() {
  return {
    LOCK: { UPDATE: "UPDATE" },
    commit: jest.fn(),
    rollback: jest.fn(),
  };
}

function paidBooking(overrides = {}) {
  const room = {
    id: 8,
    status: "occupied",
    update: jest.fn().mockResolvedValue(true),
  };
  const booking = {
    id: 31,
    booking_ref: "BKG-NOSHOW-31",
    customer_id: 4,
    room_id: 8,
    check_in: "2026-07-05",
    checkInTime: "12:00",
    checkInDateTime: new Date("2026-07-05T06:30:00.000Z"),
    autoCancelAt: new Date("2026-07-05T07:30:00.000Z"),
    noShowGraceMinutes: 60,
    status: "confirmed",
    actual_checkin_time: null,
    cancelled_at: null,
    cancellationType: null,
    autoCancelledAt: null,
    reservation_type: "confirmed_booking",
    final_payable_amount: 1000,
    total_amount: 1000,
    amount_paid: 1000,
    payment_status: "paid",
    razorpay_payment_id: "pay_31",
    customer: {
      id: 4,
      full_name: "No Show Guest",
      email: "guest@example.com",
      phone: "9876543210",
    },
    room,
    update: jest.fn(function update(values) {
      Object.assign(this, values);
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return booking;
}

describe("no-show auto-cancellation service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue(transactionMock());
    HotelSetting.findByPk.mockResolvedValue({
      hotel_name: "Panchavati Grand",
      check_in_time: "14:00",
      upi_id: "hotel@upi",
    });
    Booking.count.mockResolvedValue(0);
    Notification.bulkCreate.mockResolvedValue([]);
    PaymentTransaction.update.mockResolvedValue([1]);
    updateCouponUsageForBooking.mockResolvedValue(true);
  });

  it("auto-cancels an overdue paid booking, releases its room, and creates one policy refund", async () => {
    const booking = paidBooking();
    const refund = {
      id: 72,
      status: "pending_admin_approval",
      requested_at: new Date("2026-07-05T08:00:00.000Z"),
    };
    Booking.findByPk.mockResolvedValue(booking);
    RefundRequest.findOrCreate.mockResolvedValue([refund, true]);

    const result = await processNoShowBooking(booking.id, {
      now: new Date("2026-07-05T08:00:00.000Z"),
    });

    expect(result.cancelled).toBe(true);
    expect(booking.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "cancelled",
      cancellationType: "no_show_auto_cancel",
      cancelled_by: "system",
      refund_amount: 900,
      cancellation_charge: 100,
      refund_status: "pending_admin_approval",
    }), expect.any(Object));
    expect(RefundRequest.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { booking_id: booking.id },
      defaults: expect.objectContaining({
        refund_reason: "No-show auto-cancellation",
        refund_amount: 900,
      }),
    }));
    expect(booking.room.update).toHaveBeenCalledWith(
      { status: "available" },
      expect.any(Object)
    );
    expect(sendNoShowCancellationEmail).toHaveBeenCalledTimes(1);
  });

  it("does not cancel or refund a checked-in booking after the deadline", async () => {
    const booking = paidBooking({
      status: "checked_in",
      actual_checkin_time: new Date("2026-07-05T07:00:00.000Z"),
    });
    Booking.findByPk.mockResolvedValue(booking);

    const result = await processNoShowBooking(booking.id, {
      now: new Date("2026-07-05T08:00:00.000Z"),
    });

    expect(result.cancelled).toBe(false);
    expect(booking.update).not.toHaveBeenCalled();
    expect(RefundRequest.findOrCreate).not.toHaveBeenCalled();
    expect(sendNoShowCancellationEmail).not.toHaveBeenCalled();
  });

  it("keeps a booking active before its auto-cancel deadline", async () => {
    const booking = paidBooking();
    Booking.findByPk.mockResolvedValue(booking);

    const result = await processNoShowBooking(booking.id, {
      now: new Date("2026-07-05T07:00:00.000Z"),
    });

    expect(result).toEqual(expect.objectContaining({
      cancelled: false,
      reason: "grace_period_active",
      deadline: new Date("2026-07-05T07:30:00.000Z"),
    }));
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(booking.update).not.toHaveBeenCalled();
  });

  it("is idempotent when the scheduler runs again", async () => {
    const booking = paidBooking();
    RefundRequest.findOrCreate.mockResolvedValue([{
      id: 73,
      status: "pending_admin_approval",
      requested_at: new Date("2026-07-05T08:00:00.000Z"),
    }, true]);
    Booking.findByPk.mockResolvedValue(booking);
    const now = new Date("2026-07-05T08:00:00.000Z");

    const first = await processNoShowBooking(booking.id, { now });
    const second = await processNoShowBooking(booking.id, { now });

    expect(first.cancelled).toBe(true);
    expect(second).toEqual(expect.objectContaining({
      cancelled: false,
      reason: "already_auto_cancelled",
    }));
    expect(RefundRequest.findOrCreate).toHaveBeenCalledTimes(1);
    expect(sendNoShowCancellationEmail).toHaveBeenCalledTimes(1);
  });

  it("finds overdue candidates for the scheduled job", async () => {
    const booking = paidBooking();
    Booking.findAll.mockResolvedValue([{ id: booking.id }]);
    Booking.findByPk.mockResolvedValue(booking);
    RefundRequest.findOrCreate.mockResolvedValue([{
      id: 74,
      status: "pending_admin_approval",
      requested_at: new Date("2026-07-05T08:00:00.000Z"),
    }, true]);

    const results = await autoCancelOverdueBookings(
      new Date("2026-07-05T08:00:00.000Z")
    );

    expect(results).toHaveLength(1);
    expect(results[0].cancelled).toBe(true);
    expect(Booking.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        actual_checkin_time: null,
        cancelled_at: null,
      }),
    }));
  });
});
