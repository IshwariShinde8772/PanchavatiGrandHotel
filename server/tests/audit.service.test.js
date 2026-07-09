jest.mock("../models", () => ({
  AuditLog: {
    create: jest.fn(),
  },
  HotelSetting: {
    findByPk: jest.fn(),
  },
}));

const { AuditLog, HotelSetting } = require("../models");
const {
  resetLogSettingCache,
  setLogSavingEnabled,
  writeAudit,
} = require("../src/services/auditService");

describe("audit log persistence setting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLogSettingCache();
    HotelSetting.findByPk.mockResolvedValue({ logs_enabled: true });
    AuditLog.create.mockResolvedValue({ id: 1 });
  });

  it("stores normalized level, module, and message fields when enabled", async () => {
    await writeAudit({
      action: "refund_request_created",
      entityType: "refund_request",
      entityId: 8,
      actor: { id: 3, role: "customer" },
    });

    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: "refund_request_created",
      entity_type: "refund_request",
      entity_id: 8,
      actor_role: "customer",
      actor_id: 3,
      level: "info",
      module: "refund",
      message: "refund request created",
    }), { transaction: undefined });
  });

  it("does not save new logs while persistence is disabled", async () => {
    setLogSavingEnabled(false);

    const result = await writeAudit({
      action: "booking_viewed",
      entityType: "booking",
      actor: { id: 1, role: "admin" },
    });

    expect(result).toBeNull();
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("resumes saving after persistence is enabled again", async () => {
    setLogSavingEnabled(false);
    await writeAudit({ action: "first", entityType: "system" });
    setLogSavingEnabled(true);
    await writeAudit({ action: "second", entityType: "system" });

    expect(AuditLog.create).toHaveBeenCalledTimes(1);
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "second" }),
      { transaction: undefined }
    );
  });
});
