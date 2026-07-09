const { Op } = require("sequelize");

jest.mock("../models", () => ({
  AuditLog: {
    findAndCountAll: jest.fn(),
  },
  HotelSetting: {
    findOrCreate: jest.fn(),
  },
}));

const { AuditLog, HotelSetting } = require("../models");
const { listLogs } = require("../src/controllers/logs/logController");

function response() {
  return {
    json: jest.fn(),
  };
}

describe("admin audit log IST mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HotelSetting.findOrCreate.mockResolvedValue([{ logs_enabled: true }, true]);
    AuditLog.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [{
        get: () => ({
          id: 1,
          action: "EARLY_CHECKOUT",
          entity_type: "booking",
          entity_id: 51,
          actor_role: "receptionist",
          actor_id: 3,
          metadata: {
            actorName: "Front Desk",
            ipAddress: "127.0.0.1",
            userAgent: "test-agent",
            oldValue: { status: "checked_in" },
            newValue: { status: "checked_out" },
          },
          created_at: new Date("2026-07-02T10:15:00.000Z"),
        }),
      }],
    });
  });

  it("filters by an IST calendar day and returns explicit IST and UTC timestamps", async () => {
    const res = response();
    await listLogs({
      query: {
        date: "2026-07-02",
        page: "1",
        limit: "20",
      },
    }, res);

    const query = AuditLog.findAndCountAll.mock.calls[0][0];
    expect(query.where.created_at[Op.gte]).toEqual(new Date("2026-07-01T18:30:00.000Z"));
    expect(query.where.created_at[Op.lt]).toEqual(new Date("2026-07-02T18:30:00.000Z"));

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [
        expect.objectContaining({
          action: "EARLY_CHECKOUT",
          actor_name: "Front Desk",
          ip_address: "127.0.0.1",
          timestamp_utc: "2026-07-02T10:15:00.000Z",
          timestamp_ist: "02 Jul 2026, 03:45 PM IST",
          old_value: { status: "checked_in" },
          new_value: { status: "checked_out" },
        }),
      ],
    }));
  });
});
