const migration = require("../migrations/202607020001-booking-checkin-time-no-show");

describe("booking check-in time migration", () => {
  it("adds fields, backfills an IST deadline, and creates the lookup index", async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({}),
      addColumn: jest.fn().mockResolvedValue(undefined),
      bulkUpdate: jest.fn().mockResolvedValue(undefined),
      addIndex: jest.fn().mockResolvedValue(undefined),
      showIndex: jest.fn().mockResolvedValue([]),
      sequelize: {
        query: jest.fn()
          .mockResolvedValueOnce([[{ check_in_time: "14:00" }]])
          .mockResolvedValueOnce([[{
            id: 9,
            check_in: "2026-07-05",
            check_in_time: "12:00",
          }]]),
      },
    };
    const Sequelize = {
      STRING: jest.fn(() => "STRING"),
      DATE: "DATE",
      INTEGER: "INTEGER",
      TEXT: "TEXT",
    };
    Sequelize.STRING = Object.assign(
      (length) => `STRING(${length})`,
      { toString: () => "STRING" }
    );

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(8);
    expect(queryInterface.bulkUpdate).toHaveBeenCalledWith(
      "bookings",
      expect.objectContaining({
        check_in_time: "12:00",
        check_in_datetime: new Date("2026-07-05T06:30:00.000Z"),
        auto_cancel_at: new Date("2026-07-05T07:30:00.000Z"),
        no_show_grace_minutes: 60,
      }),
      { id: 9 }
    );
    expect(queryInterface.addIndex).toHaveBeenCalledWith(
      "bookings",
      ["auto_cancel_at", "status"],
      { name: "bookings_auto_cancel_status_idx" }
    );
  });

  it("does not add the index when it already exists", async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({
        check_in_time: {},
        check_in_datetime: {},
        auto_cancel_at: {},
        no_show_grace_minutes: {},
        cancellation_type: {},
        auto_cancellation_reason: {},
        auto_cancelled_at: {},
        refund_request_created_at: {},
        status: {},
      }),
      addColumn: jest.fn(),
      bulkUpdate: jest.fn(),
      addIndex: jest.fn(),
      showIndex: jest.fn().mockResolvedValue([
        { name: "bookings_auto_cancel_status_idx" },
      ]),
      sequelize: {
        query: jest.fn()
          .mockResolvedValueOnce([[{ check_in_time: "14:00" }]])
          .mockResolvedValueOnce([[]]),
      },
    };

    await migration.up(queryInterface, {
      STRING: (length) => `STRING(${length})`,
      DATE: "DATE",
      INTEGER: "INTEGER",
      TEXT: "TEXT",
    });

    expect(queryInterface.addColumn).not.toHaveBeenCalled();
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
  });
});
