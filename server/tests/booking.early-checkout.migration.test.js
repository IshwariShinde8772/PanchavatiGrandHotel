const migration = require("../migrations/202607020002-early-checkout");

describe("early checkout migration", () => {
  it("adds all early checkout audit and settlement columns safely", async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({}),
      addColumn: jest.fn().mockResolvedValue(undefined),
    };
    const Sequelize = {
      BOOLEAN: "BOOLEAN",
      DATE: "DATE",
      DATEONLY: "DATEONLY",
      DECIMAL: (precision, scale) => `DECIMAL(${precision},${scale})`,
      STRING: (length) => `STRING(${length})`,
      TEXT: "TEXT",
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledTimes(10);
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "bookings",
      "is_early_checkout",
      expect.objectContaining({
        type: "BOOLEAN",
        allowNull: false,
        defaultValue: false,
      })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "bookings",
      "early_checkout_reason",
      expect.objectContaining({ type: "TEXT" })
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "bookings",
      "room_status_after_checkout",
      expect.objectContaining({ type: "STRING(30)" })
    );
  });
});
