jest.mock("../models", () => ({
  Booking: {
    findAll: jest.fn(),
  },
  Customer: {},
  Room: {
    count: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { Booking, Room } = require("../models");
const {
  getReport,
  getReportCsvRows,
} = require("../src/services/reportService");

describe("report IST and early check-out mapping", () => {
  const earlyBooking = {
    id: 51,
    booking_ref: "BKG-EARLY-51",
    customer_id: 7,
    room_id: 4,
    status: "checked_out",
    payment_status: "paid",
    total_amount: 5000,
    amount_paid: 5000,
    remaining_amount: 0,
    gst_amount: 535.71,
    nights: 2,
    check_in: "2026-07-01",
    check_out: "2026-07-03",
    actual_checkin_time: new Date("2026-07-01T08:30:00.000Z"),
    actual_checkout_time: new Date("2026-07-02T10:15:00.000Z"),
    original_checkout_date: "2026-07-03",
    is_early_checkout: true,
    early_checkout_reason: "Travel plans changed",
    checked_out_by_staff_id: 3,
    checked_out_by_role: "receptionist",
    room_status_after_checkout: "cleaning",
    early_checkout_refund_amount: 0,
    early_checkout_adjustment_charge: 0,
    early_checkout_policy_applied: "No automatic refund for early checkout. Settlement follows hotel policy.",
    created_at: new Date("2026-07-01T05:00:00.000Z"),
    customer: {
      full_name: "Test Guest",
      phone: "9876543210",
    },
    room: {
      room_number: "204",
      category: "Deluxe",
      status: "available",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Booking.findAll.mockResolvedValue([earlyBooking]);
    Room.findAll.mockResolvedValue([{ status: "available", count: 1 }]);
    Room.count.mockResolvedValue(1);
  });

  it("includes early checkout audit fields and IST timestamps in report data", async () => {
    const report = await getReport({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(report.summary.early_checked_out).toBe(1);
    expect(report.bookings).toEqual([
      expect.objectContaining({
        booking_ref: "BKG-EARLY-51",
        original_checkout_date: "2026-07-03",
        actual_checkout_ist: "02 Jul 2026, 03:45 PM IST",
        early_checkout: "Yes",
        early_checkout_reason: "Travel plans changed",
        checked_out_by: "receptionist #3",
        room_status_after_checkout: "cleaning",
        refund_adjustment: "0.00",
      }),
    ]);
  });

  it("uses the same IST-safe early checkout columns in CSV exports", async () => {
    const rows = await getReportCsvRows({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });

    expect(rows[0]).toEqual(expect.objectContaining({
      actual_checkout_ist: "02 Jul 2026, 03:45 PM IST",
      early_checkout: "Yes",
      policy_applied: expect.stringContaining("No automatic refund"),
      created_at_ist: expect.stringMatching(/IST$/),
    }));
  });
});
