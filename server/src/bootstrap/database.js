const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { DataTypes } = require("sequelize");
const env = require("../config/env");
const { sequelize, Admin, HotelSetting } = require("../../models");

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
  cancellation_policy_text: "Free cancellation up to 48 hours before check-in. Late cancellations are charged one night.",
  late_checkout_fee: 800,
  extra_bed_charge: 500,
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
  } finally {
    if (shouldDisableForeignKeys) {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  }

  await ensureBaseRecords();

  return {
    force: shouldForce,
    alter: shouldAlter,
    uploadsDir,
  };
}

module.exports = {
  defaultHotelSettings,
  ensureBaseRecords,
  ensureUploadDirectory,
  syncDatabase,
  uploadsDir,
};
