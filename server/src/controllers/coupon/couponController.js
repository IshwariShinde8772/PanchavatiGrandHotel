const { Op } = require("sequelize");
const {
  Booking,
  Coupon,
  CouponUsage,
  Customer,
  Room,
} = require("../../../models");
const { getPagination } = require("../../utils/pagination");
const { getBusinessDate } = require("../../utils/dateHelpers");
const env = require("../../config/env");
const {
  buildCouponPriceBreakdown,
  expireCoupons,
  normalizeCouponCode,
} = require("../../services/couponService");

const ELIGIBILITY_TYPES = new Set([
  "all_customers",
  "first_time_customers",
  "existing_customers",
  "selected_customers",
]);
const APPLICABLE_SCOPES = new Set([
  "all_rooms",
  "selected_rooms",
  "selected_room_types",
]);
const ROOM_CATEGORIES = new Set(["Standard", "Deluxe", "Regular"]);
const STATUSES = new Set(["active", "inactive", "expired"]);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function uniqueValues(values = [], mapper = (value) => value) {
  return [...new Set((Array.isArray(values) ? values : []).map(mapper))];
}

function optionalLimit(value, fieldName) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw httpError(400, `${fieldName} must be a non-negative whole number`);
  }
  return parsed;
}

function optionalMoney(value, fieldName) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw httpError(400, `${fieldName} must be non-negative`);
  }
  return parsed;
}

function normalizeCouponPayload(payload = {}) {
  const discountType = String(payload.discount_type || "");
  const discountValue = Number(payload.discount_value);
  const validFrom = String(payload.valid_from || "");
  const validTill = String(payload.valid_till || "");
  const eligibilityType = String(payload.eligibility_type || "all_customers");
  const applicableScope = String(payload.applicable_scope || "all_rooms");
  const eligibleCustomerIds = uniqueValues(payload.eligible_customer_ids, Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const applicableRoomIds = uniqueValues(payload.applicable_room_ids, Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const applicableRoomTypeIds = uniqueValues(payload.applicable_room_type_ids, String)
    .filter((category) => ROOM_CATEGORIES.has(category));

  if (!normalizeCouponCode(payload.code)) throw httpError(400, "Coupon code is required");
  if (!String(payload.title || "").trim()) throw httpError(400, "Coupon title is required");
  if (!["percentage", "fixed"].includes(discountType)) {
    throw httpError(400, "Discount type is invalid");
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw httpError(400, "Discount value must be greater than 0");
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw httpError(400, "Percentage discount cannot exceed 100");
  }
  if (!validFrom || !validTill) throw httpError(400, "Coupon validity dates are required");
  if (validTill <= validFrom) {
    throw httpError(400, "Valid till date must be after valid from date");
  }
  if (!ELIGIBILITY_TYPES.has(eligibilityType)) {
    throw httpError(400, "Coupon eligibility type is invalid");
  }
  if (eligibilityType === "selected_customers" && !eligibleCustomerIds.length) {
    throw httpError(400, "Select at least one eligible customer");
  }
  if (!APPLICABLE_SCOPES.has(applicableScope)) {
    throw httpError(400, "Coupon applicable scope is invalid");
  }
  if (applicableScope === "selected_rooms" && !applicableRoomIds.length) {
    throw httpError(400, "Select at least one room");
  }
  if (applicableScope === "selected_room_types" && !applicableRoomTypeIds.length) {
    throw httpError(400, "Select at least one room type");
  }

  let status = String(payload.status || "active");
  if (!STATUSES.has(status)) throw httpError(400, "Coupon status is invalid");
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  if (validTill < today) status = "expired";

  return {
    code: normalizeCouponCode(payload.code),
    title: String(payload.title).trim(),
    description: String(payload.description || "").trim() || null,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount_amount: discountType === "percentage"
      ? optionalMoney(payload.max_discount_amount, "Maximum discount")
      : null,
    min_booking_amount: optionalMoney(payload.min_booking_amount, "Minimum booking amount") || 0,
    valid_from: validFrom,
    valid_till: validTill,
    eligibility_type: eligibilityType,
    eligible_customer_ids: eligibilityType === "selected_customers" ? eligibleCustomerIds : [],
    applicable_scope: applicableScope,
    applicable_room_ids: applicableScope === "selected_rooms" ? applicableRoomIds : [],
    applicable_room_type_ids: applicableScope === "selected_room_types" ? applicableRoomTypeIds : [],
    can_combine_with_offers: Boolean(payload.can_combine_with_offers),
    total_usage_limit: optionalLimit(payload.total_usage_limit, "Total usage limit"),
    per_user_usage_limit: optionalLimit(payload.per_user_usage_limit, "Per-user usage limit"),
    status,
    updated_at: new Date(),
  };
}

async function assertReferences(payload) {
  if (payload.eligible_customer_ids.length) {
    const customerCount = await Customer.count({
      where: { id: { [Op.in]: payload.eligible_customer_ids }, is_deleted: false },
    });
    if (customerCount !== payload.eligible_customer_ids.length) {
      throw httpError(400, "One or more selected customers do not exist");
    }
  }
  if (payload.applicable_room_ids.length) {
    const roomCount = await Room.count({
      where: { id: { [Op.in]: payload.applicable_room_ids } },
    });
    if (roomCount !== payload.applicable_room_ids.length) {
      throw httpError(400, "One or more selected rooms do not exist");
    }
  }
}

async function createCoupon(req, res) {
  const payload = normalizeCouponPayload(req.body);
  await assertReferences(payload);
  const duplicate = await Coupon.findOne({ where: { code: payload.code } });
  if (duplicate) return res.status(409).json({ success: false, error: "Coupon code already exists" });

  const coupon = await Coupon.create({
    ...payload,
    created_by_admin_id: req.user.id,
    used_count: 0,
    created_at: new Date(),
  });
  return res.status(201).json({ success: true, data: coupon, message: "Coupon created" });
}

async function listCoupons(req, res) {
  await expireCoupons();
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${req.query.search}%` } },
      { title: { [Op.like]: `%${req.query.search}%` } },
    ];
  }

  const { count, rows } = await Coupon.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    offset,
    limit,
  });
  const ids = rows.map((coupon) => coupon.id);
  const usages = ids.length
    ? await CouponUsage.findAll({ where: { coupon_id: { [Op.in]: ids } } })
    : [];
  const analytics = usages.reduce((map, usage) => {
    const current = map.get(usage.coupon_id) || { usage_count: 0, total_discount_given: 0 };
    current.usage_count += 1;
    current.total_discount_given += Number(usage.discount_amount || 0);
    map.set(usage.coupon_id, current);
    return map;
  }, new Map());

  const data = rows.map((coupon) => {
    const item = coupon.get({ plain: true });
    const totals = analytics.get(coupon.id) || { usage_count: 0, total_discount_given: 0 };
    return {
      ...item,
      used_count: Math.max(Number(item.used_count || 0), totals.usage_count),
      total_discount_given: Number(totals.total_discount_given.toFixed(2)),
    };
  });

  return res.json({
    success: true,
    data,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function couponDetailsPayload(id) {
  await expireCoupons();
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw httpError(404, "Coupon not found");
  const usages = await CouponUsage.findAll({
    where: { coupon_id: coupon.id },
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "full_name", "email", "phone"],
      },
      {
        model: Booking,
        as: "booking",
        required: false,
        include: [{ model: Room, as: "room", attributes: ["id", "room_number", "name", "category"] }],
      },
    ],
    order: [["used_at", "DESC"]],
  });
  const analytics = usages.reduce((totals, usage) => {
    totals.total_times_used += 1;
    totals.total_discount_given += Number(usage.discount_amount || 0);
    totals.revenue_generated += Number(usage.final_amount_after_coupon || 0);
    if (["cancelled", "refunded"].includes(usage.booking_status)) {
      totals.cancelled_bookings += 1;
    } else {
      totals.successful_bookings += 1;
    }
    return totals;
  }, {
    total_times_used: 0,
    total_discount_given: 0,
    successful_bookings: 0,
    cancelled_bookings: 0,
    revenue_generated: 0,
  });

  for (const key of ["total_discount_given", "revenue_generated"]) {
    analytics[key] = Number(analytics[key].toFixed(2));
  }
  return { coupon, analytics, usages };
}

async function getCoupon(req, res) {
  return res.json({ success: true, data: await couponDetailsPayload(req.params.id) });
}

async function updateCoupon(req, res) {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, error: "Coupon not found" });

  const payload = normalizeCouponPayload({
    ...coupon.get({ plain: true }),
    ...req.body,
  });
  await assertReferences(payload);
  if (payload.code !== coupon.code) {
    const [usageCount, bookingCount] = await Promise.all([
      CouponUsage.count({ where: { coupon_id: coupon.id } }),
      Booking.count({ where: { coupon_id: coupon.id } }),
    ]);
    if (usageCount > 0 || bookingCount > 0) {
      return res.status(409).json({
        success: false,
        error: "Coupon code cannot be changed after it has been applied. Create a new coupon instead.",
      });
    }
  }
  const duplicate = await Coupon.findOne({
    where: { code: payload.code, id: { [Op.ne]: coupon.id } },
  });
  if (duplicate) return res.status(409).json({ success: false, error: "Coupon code already exists" });

  await coupon.update(payload);
  return res.json({ success: true, data: coupon, message: "Coupon updated" });
}

async function toggleCouponStatus(req, res) {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, error: "Coupon not found" });

  const requestedStatus = req.body?.status;
  let status = requestedStatus || (coupon.status === "active" ? "inactive" : "active");
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ success: false, error: "Status must be active or inactive" });
  }
  if (status === "active" && String(coupon.valid_till) < getBusinessDate(new Date(), env.hotelTimeZone)) {
    status = "expired";
  }
  await coupon.update({ status, updated_at: new Date() });
  return res.json({ success: true, data: coupon, message: `Coupon marked ${status}` });
}

async function deleteCoupon(req, res) {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, error: "Coupon not found" });
  const [usageCount, bookingCount] = await Promise.all([
    CouponUsage.count({ where: { coupon_id: coupon.id } }),
    Booking.count({ where: { coupon_id: coupon.id } }),
  ]);
  if (usageCount > 0 || bookingCount > 0) {
    return res.status(409).json({
      success: false,
      error: "Used or applied coupons cannot be deleted. Deactivate this coupon instead.",
    });
  }
  await coupon.destroy();
  return res.json({ success: true, message: "Coupon deleted" });
}

async function validateCustomerCoupon(req, res) {
  // Imported lazily to keep the pricing and coupon services free of controller cycles.
  const { prepareBookingData } = require("../booking/bookingController");
  const prepared = await prepareBookingData({
    roomId: req.body.room_id,
    checkIn: req.body.check_in,
    checkOut: req.body.check_out,
    guests: req.body.guests,
  });
  const pricing = await buildCouponPriceBreakdown({
    prepared,
    couponCode: req.body.coupon_code,
    customerId: req.user.id,
  });

  return res.json({
    success: true,
    data: {
      coupon: pricing.coupon,
      base_amount: pricing.baseAmount,
      offer_discount_amount: pricing.offerDiscountAmount,
      amount_after_offer: pricing.amountAfterOffer,
      coupon_discount_amount: pricing.couponDiscountAmount,
      amount_after_coupon: pricing.amountAfterCoupon,
      applied_coupon_code: pricing.coupon.code,
      total_fare: pricing.amountAfterCoupon,
      gst_percent: pricing.gst.gstPercent,
      gst_amount: pricing.gst.gstAmount,
      final_payable_amount: pricing.finalPayableAmount,
      total_amount: pricing.finalPayableAmount,
      advance_required: Number((pricing.finalPayableAmount * 0.1).toFixed(2)),
      remaining_after_advance: Number((pricing.finalPayableAmount * 0.9).toFixed(2)),
    },
    message: `${pricing.coupon.code} applied successfully`,
  });
}

module.exports = {
  createCoupon,
  deleteCoupon,
  getCoupon,
  listCoupons,
  toggleCouponStatus,
  updateCoupon,
  validateCustomerCoupon,
};
