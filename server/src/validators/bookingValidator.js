const { z } = require("zod");
const env = require("../config/env");
const { getBusinessDate } = require("../utils/dateHelpers");

const checkInTimeSchema = z.string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a valid check-in time");

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

  return String(data.check_in).slice(0, 10) >= getBusinessDate(new Date(), env.hotelTimeZone);
}

const staySelectionSchema = z.object({
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_in_time: checkInTimeSchema,
  check_out: z.string().min(10),
  guests: z.coerce.number().int().min(1).max(10),
}).refine(hasValidStayWindow, {
  message: "Check-out must be after check-in",
  path: ["check_out"],
}).refine(isCheckInTodayOrFuture, {
  message: "Check-in cannot be in the past",
  path: ["check_in"],
});

const createBookingSchema = z.object({
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_in_time: checkInTimeSchema,
  check_out: z.string().min(10),
  guests: z.coerce.number().int().min(1).max(10),
  special_requests: z.string().max(1000).optional(),
  payment_method: z.enum(["online", "pay_later"]),
  checkout_token: z.string().uuid(),
  coupon_code: z.string().trim().max(64).optional().nullable(),
  guest: z.object({
    full_name: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(10),
    nationality: z.string().optional(),
    id_type: z.enum(["aadhaar", "passport", "national_id", "driving_license", "other"]),
    id_number: z.string().trim().min(3),
    id_expiry: z.preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      const normalized = String(value).trim();
      return normalized || undefined;
    }, z.string().optional()),
    id_doc_url: z.string().url(),
    id_doc_public_id: z.string().min(1),
    live_photo_url: z.string().url(),
    live_photo_public_id: z.string().min(1),
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

const paymentFailureSchema = z.object({
  razorpay_order_id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const manualPaymentConfirmationSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_mode: z.enum(["hotel_qr", "cash"]),
  transaction_reference: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.payment_mode === "hotel_qr" && !data.transaction_reference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["transaction_reference"], message: "Transaction reference is required for hotel QR payments" });
  }
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
  response_text: z.string().optional(),
});

const extensionPaymentConfirmationSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_mode: z.enum(["cash", "upi", "card", "other"]),
  transaction_reference: z.string().trim().max(255).optional(),
  note: z.string().trim().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (data.payment_mode !== "cash" && !data.transaction_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["transaction_reference"],
      message: "Transaction/reference number is required for UPI, card, and other payments",
    });
  }
});

const checkInSchema = z.object({
  booking_ref: z.string().optional(),
  payment_method: z.enum(["cash", "card", "upi", "online", "pay_later"]).optional(),
  payment_status: z.enum(["pending", "paid", "pay_at_hotel", "refunded"]).optional(),
  id_verified: z.boolean().default(true),
  id_verification_note: z.string().optional(),
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
  feedback: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    feedback_text: z.string().trim().min(3, "Feedback must be at least 3 characters").max(2000),
    internal_note: z.string().trim().max(2000).optional(),
  }),
});

const earlyCheckOutSchema = checkOutSchema.extend({
  payment_status: z.literal("paid").optional(),
  reason: z.string()
    .trim()
    .min(3, "Early check-out reason is required")
    .max(2000),
  internal_note: z.string().trim().max(2000).optional(),
});

const extendBookingSchema = z.object({
  check_out: z.string().min(10),
  reason: z.string().min(3),
});

const walkInBookingSchema = z.object({
  guest: z.object({
    full_name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email(),
    nationality: z.string().optional(),
    id_type: z.enum(["aadhaar", "passport", "national_id", "driving_license", "other"]).optional(),
    id_number: z.string().optional(),
    id_doc_url: z.string().url(),
    id_doc_public_id: z.string().min(1),
    live_photo_url: z.string().url(),
    live_photo_public_id: z.string().min(1),
  }),
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_in_time: checkInTimeSchema,
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
  check_in_time: checkInTimeSchema.optional(),
  reason: z.string().min(3),
}).refine((data) => isCheckInTodayOrFuture({ check_in: data.check_in }), {
  message: "Check-in cannot be in the past",
  path: ["check_in"],
});

module.exports = {
  staySelectionSchema,
  createBookingSchema,
  verifyPaymentSchema,
  paymentFailureSchema,
  cancelBookingSchema,
  manualPaymentConfirmationSchema,
  extensionRequestSchema,
  receptionistExtensionRequestSchema,
  processExtensionRequestSchema,
  extensionPaymentConfirmationSchema,
  checkInSchema,
  checkOutSchema,
  earlyCheckOutSchema,
  extendBookingSchema,
  walkInBookingSchema,
  postponeCheckInSchema,
};
