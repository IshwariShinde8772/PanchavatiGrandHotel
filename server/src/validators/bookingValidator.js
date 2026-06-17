const { z } = require("zod");

function parseDateOnly(value) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function hasValidStayWindow(data) {
  const checkIn = parseDateOnly(data.check_in);
  const checkOut = parseDateOnly(data.check_out);
  if (!checkIn || !checkOut) {
    return false;
  }

  return checkOut > checkIn;
}

function isCheckInTodayOrFuture(data) {
  const checkIn = parseDateOnly(data.check_in);
  if (!checkIn) {
    return false;
  }

  return checkIn >= startOfTodayUTC();
}

const createBookingSchema = z.object({
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_out: z.string().min(10),
  guests: z.coerce.number().int().min(1).max(10),
  special_requests: z.string().max(1000).optional(),
  payment_method: z.enum(["qr", "online", "pay_later"]).default("qr"),
  guest: z.object({
    full_name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(10),
    nationality: z.string().optional(),
    id_type: z.enum(["passport", "national_id", "driving_license", "other"]).optional(),
    id_number: z.string().optional(),
    id_expiry: z.preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      const normalized = String(value).trim();
      return normalized || undefined;
    }, z.string().optional()),
    id_doc_url: z.string().optional(),
  }),
}).refine(hasValidStayWindow, {
  message: "Check-out must be after check-in",
  path: ["check_out"],
}).refine(isCheckInTodayOrFuture, {
  message: "Check-in cannot be in the past",
  path: ["check_in"],
});

const verifyPaymentSchema = z.object({
  booking_id: z.coerce.number().int().positive(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3),
});

const extensionRequestSchema = z.object({
  requested_from: z.string().min(10),
  requested_to: z.string().min(10),
  reason: z.string().min(5),
});

const receptionistExtensionRequestSchema = z.object({
  requested_from: z.string().min(10),
  requested_to: z.string().min(10),
  reason: z.string().min(5),
  payment_method: z.enum(["cash", "qr"]),
});

const processExtensionRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  payment_method: z.enum(["cash", "qr"]).optional(),
  response_text: z.string().optional(),
});

const checkInSchema = z.object({
  booking_ref: z.string().optional(),
  payment_method: z.enum(["cash", "card", "upi", "online", "pay_later"]).optional(),
  payment_status: z.enum(["pending", "paid", "pay_at_hotel", "refunded"]).optional(),
  id_verified: z.boolean().default(true),
});

const checkOutSchema = z.object({
  extras: z.array(z.object({
    title: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    amount: z.coerce.number().min(0),
  }).refine((item) => item.title || item.label, {
    message: "Each extra must include a title or label",
  })).default([]),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
});

const extendBookingSchema = z.object({
  check_out: z.string().min(10),
  reason: z.string().min(3),
  payment_method: z.enum(["cash", "card", "upi"]).default("cash"),
});

const walkInBookingSchema = z.object({
  guest: z.object({
    full_name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional().or(z.literal("")),
    nationality: z.string().optional(),
    id_type: z.enum(["passport", "national_id", "driving_license", "other"]).optional(),
    id_number: z.string().optional(),
  }),
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_out: z.string().min(10),
  guests: z.coerce.number().int().min(1),
  special_requests: z.string().optional(),
  payment_method: z.enum(["cash", "card", "upi"]).default("cash"),
}).refine(hasValidStayWindow, {
  message: "Check-out must be after check-in",
  path: ["check_out"],
}).refine(isCheckInTodayOrFuture, {
  message: "Check-in cannot be in the past",
  path: ["check_in"],
});

const postponeCheckInSchema = z.object({
  check_in: z.string().min(10),
  reason: z.string().min(3),
}).refine((data) => isCheckInTodayOrFuture({ check_in: data.check_in }), {
  message: "Check-in cannot be in the past",
  path: ["check_in"],
});

module.exports = {
  createBookingSchema,
  verifyPaymentSchema,
  cancelBookingSchema,
  extensionRequestSchema,
  receptionistExtensionRequestSchema,
  processExtensionRequestSchema,
  checkInSchema,
  checkOutSchema,
  extendBookingSchema,
  walkInBookingSchema,
  postponeCheckInSchema,
};
