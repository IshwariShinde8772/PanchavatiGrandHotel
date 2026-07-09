const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { Op } = require("sequelize");
const env = require("../src/config/env");

// Keep this development verifier deterministic and prevent real email delivery.
env.smtp.user = "";
env.smtp.pass = "";

const app = require("../src/app");
const {
  AuditLog,
  Customer,
  Feedback,
  HotelSetting,
  Offer,
  Room,
  RoomAmenity,
  sequelize,
} = require("../models");
const {
  setLogSavingEnabled,
  writeAudit,
} = require("../src/services/auditService");
const { calculateEffectivePrice } = require("../src/services/roomService");

async function verifyFeatureChanges() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const adminId = 900000001;
  const adminToken = jwt.sign({ id: adminId, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });
  const customerToken = jwt.sign({ id: 900000002, role: "customer" }, env.jwtSecret, { expiresIn: "15m" });
  const phone = `+919${String(Date.now()).slice(-9)}`;
  const unknownPhone = `+918${String(Date.now() + 1).slice(-9)}`;
  const email = `qa-feature-${suffix}@example.com`;
  const password = "FeatureTest1";
  const roomNumber = `REG-${suffix}`;
  const checks = [];
  const createdFeedbackIds = [];
  let customerId = null;
  let roomId = null;
  let offerId = null;
  let originalLogsEnabled = true;
  const runStartedAt = new Date();

  const admin = (method, path) => request(app)[method](path)
    .set("Authorization", `Bearer ${adminToken}`);

  try {
    const settings = await HotelSetting.findByPk(1);
    originalLogsEnabled = settings?.logs_enabled !== false;

    const customer = await Customer.create({
      full_name: "Feature QA Guest",
      email,
      phone,
      password_hash: await bcrypt.hash(password, 4),
      otp_verified: true,
    });
    customerId = customer.id;

    const otpResponse = await request(app)
      .post("/api/auth/send-otp")
      .send({ phone });
    if (
      otpResponse.status !== 200
      || otpResponse.body.data?.delivery !== "email"
      || otpResponse.body.data?.masked_email?.includes("qa-feature-")
      || !otpResponse.body.data?.otp
    ) {
      throw new Error(`Phone/email OTP request failed: ${otpResponse.text}`);
    }
    const otpVerify = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone, otp: otpResponse.body.data.otp });
    if (otpVerify.status !== 200 || !otpVerify.body.data?.token) {
      throw new Error(`Phone/email OTP verification failed: ${otpVerify.text}`);
    }
    checks.push("phone login delivers and verifies OTP through registered email");

    const unknownPhoneResponse = await request(app)
      .post("/api/auth/send-otp")
      .send({ phone: unknownPhone });
    if (unknownPhoneResponse.status !== 400) {
      throw new Error("Unknown phone number was not rejected");
    }
    checks.push("unknown phone number is rejected safely");

    const emailLogin = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    if (emailLogin.status !== 200 || !emailLogin.body.data?.token) {
      throw new Error(`Existing email login failed: ${emailLogin.text}`);
    }
    checks.push("email/password login remains operational");

    const invalidRoom = await admin("post", "/api/admin/rooms").send({
      room_number: `INVALID-${suffix}`,
      name: "Invalid Legacy Category Room",
      category: "Suite",
      description: "This temporary room should fail category validation.",
      base_price: 2500,
      capacity: 2,
      images: [],
    });
    if (invalidRoom.status !== 400) {
      throw new Error("Invalid room category was not rejected");
    }

    const validRoom = await admin("post", "/api/admin/rooms").send({
      room_number: roomNumber,
      name: "Regular Category Test Room",
      category: "regular",
      description: "Temporary room used to verify canonical category handling.",
      base_price: 2500,
      capacity: 2,
      images: [],
    });
    if (validRoom.status !== 201 || validRoom.body.data?.category !== "Regular") {
      throw new Error(`Regular room category failed: ${validRoom.text}`);
    }
    roomId = validRoom.body.data.id;
    checks.push("room API accepts only canonical three categories");

    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const invalidOffer = await admin("post", "/api/admin/offers").send({
      title: `Invalid Offer ${suffix}`,
      discount_pct: 10,
      start_date: startDate,
      end_date: endDate,
      room_category: "Family",
    });
    if (invalidOffer.status !== 400) {
      throw new Error("Invalid offer category was not rejected");
    }

    const validOffer = await admin("post", "/api/admin/offers").send({
      title: `Regular Offer ${suffix}`,
      discount_pct: 10,
      start_date: startDate,
      end_date: endDate,
      room_category: "regular",
    });
    if (validOffer.status !== 201 || validOffer.body.data?.room_category !== "Regular") {
      throw new Error(`Regular offer category failed: ${validOffer.text}`);
    }
    offerId = validOffer.body.data.id;
    checks.push("offer API accepts only All, Standard, Deluxe, and Regular");

    const seasonalRoute = await admin("get", "/api/admin/seasonal-pricing");
    if (seasonalRoute.status !== 404) {
      throw new Error("Removed seasonal pricing route is still available");
    }
    const legacySeasonalPricing = calculateEffectivePrice({
      base_price: 2500,
      category: "Regular",
      seasonal_price: 1,
      seasonal_start: startDate,
      seasonal_end: endDate,
    }, startDate, []);
    if (legacySeasonalPricing.pricePerNight !== 2500 || legacySeasonalPricing.priceType !== "base") {
      throw new Error("Legacy seasonal price still affects room pricing");
    }
    checks.push("seasonal pricing route and calculation are disabled");

    const logsUnauthorized = await request(app)
      .get("/api/admin/logs")
      .set("Authorization", `Bearer ${customerToken}`);
    if (logsUnauthorized.status !== 403) {
      throw new Error("Customer could access admin logs");
    }

    await admin("patch", "/api/admin/logs/status").send({ enabled: false });
    const disabledAction = `qa_disabled_${suffix}`;
    await writeAudit({
      action: disabledAction,
      entityType: "booking",
      actor: { id: adminId, role: "admin" },
    });
    if (await AuditLog.count({ where: { action: disabledAction } })) {
      throw new Error("Log was persisted while logging was disabled");
    }

    await admin("patch", "/api/admin/logs/status").send({ enabled: true });
    const enabledAction = `qa_enabled_${suffix}`;
    await writeAudit({
      action: enabledAction,
      entityType: "booking",
      actor: { id: adminId, role: "admin" },
      message: "QA booking log",
    });
    const logList = await admin("get", "/api/admin/logs")
      .query({
        date: new Date().toISOString().slice(0, 10),
        level: "info",
        module: "booking",
        search: enabledAction,
      });
    if (logList.status !== 200 || !logList.body.data?.some((item) => item.action === enabledAction)) {
      throw new Error("Enabled log was not saved or filterable");
    }
    checks.push("admin log access, filters, disable, and re-enable work");

    const feedbackRecords = await Feedback.bulkCreate([
      {
        cust_name: "Published QA Guest",
        rating: 5,
        title: "Excellent stay",
        comment: `Published feedback ${suffix}`,
        room_category: "Regular",
        room_name: "Regular Category Test Room",
        internal_note: "private staff note",
        admin_reply: "private admin reply",
        status: "published",
      },
      {
        cust_name: "Pending QA Guest",
        rating: 4,
        comment: `Pending feedback ${suffix}`,
        internal_note: "must stay private",
        status: "pending",
      },
      {
        cust_name: "Rejected QA Guest",
        rating: 2,
        comment: `Rejected feedback ${suffix}`,
        status: "rejected",
      },
    ]);
    createdFeedbackIds.push(...feedbackRecords.map((item) => item.id));

    const feedbackResponse = await request(app).get("/api/feedbacks/published");
    const publicFeedback = feedbackResponse.body.data || [];
    const published = publicFeedback.find((item) => item.id === feedbackRecords[0].id);
    if (!published || publicFeedback.some((item) => (
      item.id === feedbackRecords[1].id || item.id === feedbackRecords[2].id
    ))) {
      throw new Error("Published feedback visibility rules failed");
    }
    const forbiddenFields = [
      "customer_id",
      "customer_email",
      "customer_phone",
      "internal_note",
      "admin_reply",
      "photos",
      "live_photo_url",
      "id_doc_url",
    ];
    if (forbiddenFields.some((field) => Object.hasOwn(published, field))) {
      throw new Error("Public feedback exposed a private field");
    }

    const homeResponse = await request(app).get("/api/home");
    const homeTestimonials = homeResponse.body.data?.testimonials || [];
    if (
      !homeTestimonials.some((item) => item.id === feedbackRecords[0].id)
      || homeTestimonials.some((item) => item.id === feedbackRecords[1].id)
    ) {
      throw new Error("Homepage feedback moderation rules failed");
    }
    checks.push("homepage and public API expose only safe approved feedback");

    console.log(JSON.stringify({ success: true, checks }, null, 2));
  } finally {
    if (roomId) {
      await RoomAmenity.destroy({ where: { room_id: roomId } });
      await Room.destroy({ where: { id: roomId } });
    }
    if (offerId) await Offer.destroy({ where: { id: offerId } });
    if (createdFeedbackIds.length) {
      await Feedback.destroy({ where: { id: createdFeedbackIds } });
    }
    if (customerId) {
      await AuditLog.destroy({ where: { actor_id: customerId } });
      await Customer.destroy({ where: { id: customerId } });
    }
    await AuditLog.destroy({
      where: {
        created_at: { [Op.gte]: runStartedAt },
        actor_id: adminId,
      },
    });
    await AuditLog.destroy({
      where: {
        action: { [Op.like]: `%${suffix}%` },
      },
    });
    const settings = await HotelSetting.findByPk(1);
    if (settings) await settings.update({ logs_enabled: originalLogsEnabled });
    setLogSavingEnabled(originalLogsEnabled);
  }
}

verifyFeatureChanges()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  });
