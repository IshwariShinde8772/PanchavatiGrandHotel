"use strict";

const { buildHotelDateTime } = require("../src/utils/dateHelpers");

const NO_SHOW_GRACE_MINUTES = 60;
const HOTEL_TIME_ZONE = process.env.HOTEL_TIMEZONE || "Asia/Kolkata";

async function addColumnIfMissing(queryInterface, table, metadata, column, definition) {
  if (!metadata[column]) {
    await queryInterface.addColumn(table, column, definition);
    metadata[column] = definition;
  }
}

async function indexExists(queryInterface, table, indexName) {
  const indexes = await queryInterface.showIndex(table);
  return indexes.some((index) => index.name === indexName);
}

function normalizeTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(value || ""));
  return match ? `${match[1]}:${match[2]}` : "14:00";
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const bookings = await queryInterface.describeTable("bookings");
    await addColumnIfMissing(queryInterface, "bookings", bookings, "check_in_time", {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: "14:00",
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "check_in_datetime", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "auto_cancel_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "no_show_grace_minutes", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: NO_SHOW_GRACE_MINUTES,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "cancellation_type", {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "auto_cancellation_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "auto_cancelled_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "bookings", bookings, "refund_request_created_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    const [settingsRows] = await queryInterface.sequelize.query(
      "SELECT check_in_time FROM hotel_settings WHERE id = 1 LIMIT 1"
    );
    const defaultTime = normalizeTime(settingsRows?.[0]?.check_in_time);
    const [activeBookings] = await queryInterface.sequelize.query(
      "SELECT id, check_in, check_in_time FROM bookings WHERE status IN ('reserved', 'confirmed') AND auto_cancel_at IS NULL"
    );

    for (const booking of activeBookings) {
      const selectedTime = normalizeTime(booking.check_in_time || defaultTime);
      const dateOnly = booking.check_in instanceof Date
        ? booking.check_in.toISOString().slice(0, 10)
        : String(booking.check_in).slice(0, 10);
      const checkInDateTime = buildHotelDateTime(
        dateOnly,
        selectedTime,
        HOTEL_TIME_ZONE
      );
      if (!checkInDateTime) continue;

      await queryInterface.bulkUpdate("bookings", {
        check_in_time: selectedTime,
        check_in_datetime: checkInDateTime,
        auto_cancel_at: new Date(checkInDateTime.getTime() + NO_SHOW_GRACE_MINUTES * 60 * 1000),
        no_show_grace_minutes: NO_SHOW_GRACE_MINUTES,
      }, { id: booking.id });
    }

    if (!bookings.auto_cancel_at) {
      throw new Error(
        "Cannot create bookings_auto_cancel_status_idx before auto_cancel_at exists"
      );
    }
    if (!await indexExists(
      queryInterface,
      "bookings",
      "bookings_auto_cancel_status_idx"
    )) {
      try {
        await queryInterface.addIndex("bookings", ["auto_cancel_at", "status"], {
          name: "bookings_auto_cancel_status_idx",
        });
      } catch (error) {
        if (error?.original?.code !== "ER_DUP_KEYNAME") throw error;
      }
    }
  },

  async down(queryInterface) {
    if (await indexExists(
      queryInterface,
      "bookings",
      "bookings_auto_cancel_status_idx"
    )) {
      await queryInterface.removeIndex("bookings", "bookings_auto_cancel_status_idx");
    }

    for (const column of [
      "refund_request_created_at",
      "auto_cancelled_at",
      "auto_cancellation_reason",
      "cancellation_type",
      "no_show_grace_minutes",
      "auto_cancel_at",
      "check_in_datetime",
      "check_in_time",
    ]) {
      const metadata = await queryInterface.describeTable("bookings");
      if (metadata[column]) {
        await queryInterface.removeColumn("bookings", column);
      }
    }
  },
};
