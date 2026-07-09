const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { DataTypes, Op, Sequelize } = require("sequelize");
const env = require("../config/env");
const { sequelize, Admin, Booking, HotelSetting } = require("../../models");
const {
  buildHotelDateTime,
  calculateAutoCancelAt,
  normalizeTimeInput,
} = require("../utils/dateHelpers");

function resolveStaticAssetsPath() {
  const configuredPath = String(env.staticAssetsPath || "").trim();

  if (!configuredPath) {
    return path.resolve(__dirname, "../../uploads");
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

const uploadsDir = resolveStaticAssetsPath();

const defaultHotelSettings = {
  id: 1,
  hotel_name: "Panchavati Grand",
  address: "Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003",
  phone: "+91-0253-4447777",
  email: "stay@panchavatgrand.in",
  whatsapp: "919999999999",
  gst_percent: env.gstPercent,
  bank_name: "State Bank of India",
  upi_id: "panchavatgrand@okaxis",
  gstin_number: "27AAAAA0000A1Z5",
  pan_number: "AAAAA0000A",
  check_in_time: "14:00",
  check_out_time: "11:00",
  cancellation_policy_text: "Free cancellation before 24 hours. A 10% charge applies to confirmed bookings cancelled less than 24 hours before check-in.",
  late_checkout_fee: 800,
  extra_bed_charge: 500,
  logs_enabled: true,
};

function ensureUploadDirectory() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function ensureResetPasswordColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const targets = [
    { table: "admins", columns: ["reset_password_token", "reset_password_expires"] },
    { table: "staff", columns: ["reset_password_token", "reset_password_expires"] },
    { table: "customers", columns: ["reset_password_token", "reset_password_expires"] },
  ];

  for (const target of targets) {
    const tableMeta = await queryInterface.describeTable(target.table);

    if (!tableMeta[target.columns[0]]) {
      await queryInterface.addColumn(target.table, target.columns[0], {
        type: DataTypes.STRING(128),
        allowNull: true,
      });
    }

    if (!tableMeta[target.columns[1]]) {
      await queryInterface.addColumn(target.table, target.columns[1], {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }
  }
}

async function ensurePaymentTransactionColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const tableMeta = await queryInterface.describeTable("payment_transactions");

  if (!tableMeta.razorpay_qr_id) {
    await queryInterface.addColumn("payment_transactions", "razorpay_qr_id", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }

  await addColumnIfMissing(queryInterface, "payment_transactions", tableMeta, "razorpay_order_id", {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  });
  await addColumnIfMissing(queryInterface, "payment_transactions", tableMeta, "razorpay_payment_id", {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  });
  await addColumnIfMissing(queryInterface, "payment_transactions", tableMeta, "razorpay_signature", {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "payment_transactions", tableMeta, "payment_type", {
    type: DataTypes.ENUM("full_booking", "reservation_advance", "reservation_balance"),
    allowNull: false,
    defaultValue: "full_booking",
  });
}

async function addColumnIfMissing(queryInterface, tableName, tableMeta, columnName, definition) {
  if (!tableMeta[columnName]) {
    const safeDefinition = { ...definition };
    const typeText = String(definition.type || "").toUpperCase();

    if (
      safeDefinition.allowNull === false
      && !Object.prototype.hasOwnProperty.call(safeDefinition, "defaultValue")
      && (typeText.includes("DATE") || typeText.includes("TIME"))
    ) {
      safeDefinition.defaultValue = Sequelize.literal("CURRENT_TIMESTAMP");
    }

    await queryInterface.addColumn(tableName, columnName, safeDefinition);
    tableMeta[columnName] = definition;
  }
}

async function ensureBookingNoShowIndex() {
  const queryInterface = sequelize.getQueryInterface();
  const bookingMeta = await queryInterface.describeTable("bookings");
  if (!bookingMeta.auto_cancel_at || !bookingMeta.status) {
    throw new Error(
      "Cannot create bookings_auto_cancel_status_idx before auto_cancel_at and status exist"
    );
  }

  const indexes = await queryInterface.showIndex("bookings");
  if (!indexes.some((index) => index.name === "bookings_auto_cancel_status_idx")) {
    try {
      await queryInterface.addIndex("bookings", ["auto_cancel_at", "status"], {
        name: "bookings_auto_cancel_status_idx",
      });
    } catch (error) {
      if (error?.original?.code !== "ER_DUP_KEYNAME") throw error;
    }
  }
}

async function ensureFeatureColumns() {
  const queryInterface = sequelize.getQueryInterface();

  const staffMeta = await queryInterface.describeTable("staff");
  if (staffMeta.email?.allowNull === false) {
    await queryInterface.changeColumn("staff", "email", {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    });
  }
  await queryInterface.changeColumn("staff", "role", {
    type: DataTypes.ENUM("receptionist", "housekeeping", "kitchen", "server", "waiter", "manager", "admin_staff"),
    allowNull: false,
  });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "specific_role", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "address", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "gender", { type: DataTypes.ENUM("male", "female", "other"), allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "joining_date", { type: DataTypes.DATEONLY, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "shift", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "id_proof_type", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "id_proof_url", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "id_proof_public_id", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "created_by_staff_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "staff", staffMeta, "updated_at", {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  });

  const bookingMeta = await queryInterface.describeTable("bookings");
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "base_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "discount_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "offer_discount_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "amount_after_offer", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "offer_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "coupon_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "applied_coupon_code", { type: DataTypes.STRING(64), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "coupon_discount_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "final_payable_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "advance_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "advance_paid", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "remaining_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "check_in_time", { type: DataTypes.STRING(5), allowNull: false, defaultValue: "14:00" });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "check_in_datetime", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "auto_cancel_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "no_show_grace_minutes", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "booking_type", { type: DataTypes.ENUM("manual", "online"), allowNull: false, defaultValue: "online" });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "reservation_type", { type: DataTypes.ENUM("confirmed_booking", "reserved_booking"), allowNull: false, defaultValue: "confirmed_booking" });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "checkout_token", { type: DataTypes.STRING(64), allowNull: true, unique: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "amount_paid", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "razorpay_signature", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "payment_mode", { type: DataTypes.STRING(30), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "payment_confirmed_by", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "payment_confirmed_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "paid_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "created_by_user_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "cancellation_charge", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "refund_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "refund_status", { type: DataTypes.STRING(30), allowNull: false, defaultValue: "not_applicable" });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "cancellation_policy_applied", { type: DataTypes.STRING(80), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "cancellation_type", { type: DataTypes.STRING(40), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "auto_cancellation_reason", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "auto_cancelled_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "refund_request_created_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "cancelled_by", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "checked_in_by_staff_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "checked_out_by_staff_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "checked_out_by_role", { type: DataTypes.STRING(30), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "is_early_checkout", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_reason", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_note", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "original_checkout_date", { type: DataTypes.DATEONLY, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_refund_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_adjustment_charge", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "early_checkout_policy_applied", { type: DataTypes.STRING(160), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "room_status_after_checkout", { type: DataTypes.STRING(30), allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "id_verification_status", { type: DataTypes.ENUM("pending", "verified", "rejected"), allowNull: false, defaultValue: "pending" });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "id_verified_by_staff_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "id_verified_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "bookings", bookingMeta, "id_verification_note", { type: DataTypes.TEXT, allowNull: true });
  await queryInterface.changeColumn("bookings", "payment_status", {
    type: DataTypes.ENUM("pending", "partially_paid", "paid", "failed", "pay_at_hotel", "refunded"),
    allowNull: false,
    defaultValue: "pending",
  });

  const billMeta = await queryInterface.describeTable("bills");
  await addColumnIfMissing(queryInterface, "bills", billMeta, "base_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bills", billMeta, "offer_discount_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bills", billMeta, "amount_after_offer", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bills", billMeta, "applied_coupon_code", { type: DataTypes.STRING(64), allowNull: true });
  await addColumnIfMissing(queryInterface, "bills", billMeta, "coupon_discount_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, "bills", billMeta, "final_payable_amount", { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

  const customerMeta = await queryInterface.describeTable("customers");
  await addColumnIfMissing(queryInterface, "customers", customerMeta, "id_doc_public_id", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "customers", customerMeta, "live_photo_url", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "customers", customerMeta, "live_photo_public_id", { type: DataTypes.STRING, allowNull: true });

  const feedbackMeta = await queryInterface.describeTable("feedbacks");
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "room_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "room_number", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "room_name", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "internal_note", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "source", { type: DataTypes.ENUM("customer", "receptionist_checkout"), allowNull: false, defaultValue: "customer" });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "collected_by_receptionist_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "collected_by_receptionist_name", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "collected_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "check_in_date", { type: DataTypes.DATEONLY, allowNull: true });
  await addColumnIfMissing(queryInterface, "feedbacks", feedbackMeta, "check_out_date", { type: DataTypes.DATEONLY, allowNull: true });

  const enquiryMeta = await queryInterface.describeTable("enquiries");
  await addColumnIfMissing(queryInterface, "enquiries", enquiryMeta, "enquiry_type", { type: DataTypes.STRING, allowNull: false, defaultValue: "room_booking" });
  await addColumnIfMissing(queryInterface, "enquiries", enquiryMeta, "status", { type: DataTypes.STRING, allowNull: false, defaultValue: "new" });
  await addColumnIfMissing(queryInterface, "enquiries", enquiryMeta, "created_by_staff_id", { type: DataTypes.INTEGER, allowNull: true });

  const notificationMeta = await queryInterface.describeTable("notifications");
  if (notificationMeta.type) {
    await queryInterface.changeColumn("notifications", "type", {
      type: DataTypes.ENUM("booking", "payment", "maintenance", "task", "system", "enquiry"),
      allowNull: false,
    });
  }

  const refundMeta = await queryInterface.describeTable("refund_requests");
  await addColumnIfMissing(queryInterface, "refund_requests", refundMeta, "processed_by_admin_id", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "refund_requests", refundMeta, "processed_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "refund_requests", refundMeta, "refunded_at", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "refund_requests", refundMeta, "razorpay_payment_id", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, "refund_requests", refundMeta, "razorpay_refund_id", { type: DataTypes.STRING, allowNull: true, unique: true });
  await queryInterface.changeColumn("refund_requests", "status", {
    type: DataTypes.ENUM("pending_admin_approval", "pending", "approved", "processing", "completed", "rejected", "failed"),
    allowNull: false,
    defaultValue: "pending_admin_approval",
  });
  await queryInterface.bulkUpdate(
    "refund_requests",
    { status: "pending_admin_approval" },
    { status: "pending" }
  );
}

async function ensureBaseRecords() {
  await HotelSetting.findOrCreate({
    where: { id: 1 },
    defaults: defaultHotelSettings,
  });

  const existingAdmin = await Admin.findOne({
    where: { email: env.defaultAdmin.email },
  });

  if (!existingAdmin) {
    await Admin.create({
      full_name: env.defaultAdmin.fullName,
      email: env.defaultAdmin.email,
      phone: env.defaultAdmin.phone,
      password_hash: await bcrypt.hash(env.defaultAdmin.password, 12),
    });
  }
}

async function backfillBookingCheckInSchedules() {
  const settings = await HotelSetting.findByPk(1);
  const bookings = await Booking.findAll({
    where: {
      status: { [Op.in]: ["reserved", "confirmed"] },
      autoCancelAt: null,
    },
  });

  for (const booking of bookings) {
    const checkInTime = normalizeTimeInput(
      booking.checkInTime || settings?.check_in_time || "14:00"
    );
    const checkInDateTime = buildHotelDateTime(
      booking.check_in,
      checkInTime,
      env.hotelTimeZone
    );
    const autoCancelAt = calculateAutoCancelAt(
      booking.check_in,
      checkInTime,
      60,
      env.hotelTimeZone
    );
    if (!checkInDateTime || !autoCancelAt) continue;

    await booking.update({
      checkInTime,
      checkInDateTime,
      autoCancelAt,
      noShowGraceMinutes: 60,
    });
  }
}

async function syncDatabase(options = {}) {
  const shouldForce = options.force ?? env.db.forceSync;
  const shouldAlter = shouldForce ? false : (options.alter ?? env.db.syncAlter);
  const syncOptions = shouldForce ? { force: true } : shouldAlter ? { alter: true } : undefined;
  const shouldDisableForeignKeys = shouldForce && sequelize.getDialect() === "mysql";

  ensureUploadDirectory();
  await sequelize.authenticate();

  if (shouldDisableForeignKeys) {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  }

  try {
    await sequelize.sync(syncOptions);
    await ensureResetPasswordColumns();
    await ensurePaymentTransactionColumns();
    await ensureFeatureColumns();
    await ensureBookingNoShowIndex();
  } finally {
    if (shouldDisableForeignKeys) {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  }

  await ensureBaseRecords();
  await backfillBookingCheckInSchedules();

  return {
    force: shouldForce,
    alter: shouldAlter,
    uploadsDir,
  };
}

module.exports = {
  defaultHotelSettings,
  backfillBookingCheckInSchedules,
  ensureBookingNoShowIndex,
  ensureBaseRecords,
  ensureUploadDirectory,
  syncDatabase,
  uploadsDir,
};
