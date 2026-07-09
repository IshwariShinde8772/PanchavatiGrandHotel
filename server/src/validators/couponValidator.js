const { z } = require("zod");

const optionalMoney = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().min(0).nullable()
);

const optionalLimit = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().int().min(0).nullable()
);

const booleanValue = z.union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");

const couponPayloadShape = {
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/, "Coupon code can contain only letters, numbers, hyphens, and underscores"),
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive(),
  max_discount_amount: optionalMoney.optional(),
  min_booking_amount: z.coerce.number().min(0).default(0),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid from must be a date"),
  valid_till: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid till must be a date"),
  eligibility_type: z.enum([
    "all_customers",
    "first_time_customers",
    "existing_customers",
    "selected_customers",
  ]),
  eligible_customer_ids: z.array(z.coerce.number().int().positive()).default([]),
  applicable_scope: z.enum(["all_rooms", "selected_rooms", "selected_room_types"]),
  applicable_room_ids: z.array(z.coerce.number().int().positive()).default([]),
  applicable_room_type_ids: z.array(z.string().trim().min(1)).default([]),
  can_combine_with_offers: booleanValue.default(false),
  total_usage_limit: optionalLimit.optional(),
  per_user_usage_limit: optionalLimit.optional(),
  status: z.enum(["active", "inactive", "expired"]).default("active"),
};

function validateCouponRules(data, ctx) {
  if (data.discount_type === "percentage" && Number(data.discount_value) > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_value"],
      message: "Percentage discount cannot exceed 100",
    });
  }
  if (data.valid_from && data.valid_till && data.valid_till <= data.valid_from) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["valid_till"],
      message: "Valid till date must be after valid from date",
    });
  }
  if (data.eligibility_type === "selected_customers" && !data.eligible_customer_ids?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["eligible_customer_ids"],
      message: "Select at least one eligible customer",
    });
  }
  if (data.applicable_scope === "selected_rooms" && !data.applicable_room_ids?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applicable_room_ids"],
      message: "Select at least one room",
    });
  }
  if (data.applicable_scope === "selected_room_types" && !data.applicable_room_type_ids?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["applicable_room_type_ids"],
      message: "Select at least one room type",
    });
  }
}

const couponCreateSchema = z.object(couponPayloadShape).superRefine(validateCouponRules);

const couponUpdateSchema = z.object(
  Object.fromEntries(
    Object.entries(couponPayloadShape).map(([key, schema]) => [key, schema.optional()])
  )
);

const couponValidationSchema = z.object({
  coupon_code: z.string().trim().min(1).max(64),
  room_id: z.coerce.number().int().positive(),
  check_in: z.string().min(10),
  check_out: z.string().min(10),
  guests: z.coerce.number().int().min(1).max(10),
});

module.exports = {
  couponCreateSchema,
  couponUpdateSchema,
  couponValidationSchema,
  validateCouponRules,
};
