const BookingFactory = require("../models/Booking");

describe("Booking no-show field mappings", () => {
  it("maps camelCase Sequelize attributes to the exact snake_case columns", () => {
    let attributes;
    let options;
    class FakeBooking {
      toJSON() {
        return {};
      }
    }
    const sequelize = {
      define: jest.fn((modelName, modelAttributes, modelOptions) => {
        attributes = modelAttributes;
        options = modelOptions;
        return FakeBooking;
      }),
    };

    BookingFactory(sequelize);

    expect(attributes.checkInTime.field).toBe("check_in_time");
    expect(attributes.checkInDateTime.field).toBe("check_in_datetime");
    expect(attributes.autoCancelAt.field).toBe("auto_cancel_at");
    expect(attributes.noShowGraceMinutes.field).toBe("no_show_grace_minutes");
    expect(attributes.autoCancellationReason.field).toBe("auto_cancellation_reason");
    expect(attributes.autoCancelledAt.field).toBe("auto_cancelled_at");
    expect(attributes.cancellationType.field).toBe("cancellation_type");
    expect(attributes.is_early_checkout.defaultValue).toBe(false);
    expect(attributes.early_checkout_at.type).toBeDefined();
    expect(attributes.early_checkout_reason.type).toBeDefined();
    expect(attributes.original_checkout_date.type).toBeDefined();
    expect(attributes.early_checkout_refund_amount.defaultValue).toBe(0);
    expect(attributes.room_status_after_checkout.type).toBeDefined();
    expect(options.indexes).toBeUndefined();
  });
});
