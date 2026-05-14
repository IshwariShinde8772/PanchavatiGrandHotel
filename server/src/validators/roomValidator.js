const { z } = require("zod");

const emptyStringToNull = (value) => (value === "" ? null : value);

const nullableDateSchema = z.preprocess(emptyStringToNull, z.string().nullable().optional());
const nullablePositiveNumberSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().positive().nullable().optional()
);
const nullablePercentSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(100).nullable().optional()
);
const nullableIntegerSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().int().nullable().optional()
);
const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?(#.*)?$/i;

function isValidImageReference(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("uploads/") ||
    normalized.startsWith("/assets/")
  ) {
    return IMAGE_EXTENSIONS.test(normalized);
  }

  try {
    const parsed = new URL(normalized);
    return ["http:", "https:"].includes(parsed.protocol) && IMAGE_EXTENSIONS.test(parsed.pathname);
  } catch (error) {
    return false;
  }
}

const imageReferenceSchema = z.string().trim().refine(
  isValidImageReference,
  "Each image must be a valid image URL or upload path"
);

const roomQuerySchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  guests: z.coerce.number().int().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional(),
  viewType: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).passthrough();

const roomCreateSchema = z.object({
  room_number: z.string().min(1),
  name: z.string().min(2),
  category: z.enum(["Standard", "Deluxe", "Suite", "Family", "Presidential"]),
  description: z.string().min(10),
  base_price: z.coerce.number().positive(),
  seasonal_price: nullablePositiveNumberSchema,
  seasonal_start: nullableDateSchema,
  seasonal_end: nullableDateSchema,
  discount_pct: nullablePercentSchema,
  discount_start: nullableDateSchema,
  discount_end: nullableDateSchema,
  total_units: z.coerce.number().int().min(1).default(1),
  capacity: z.coerce.number().int().min(1),
  amenities: z.array(z.string()).default([]),
  images: z.array(imageReferenceSchema).default([]),
  floor: nullableIntegerSchema,
  view_type: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  bed_type: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  size_sqm: nullableIntegerSchema,
  is_active: z.boolean().optional(),
  status: z.enum(["available", "occupied", "maintenance", "cleaning"]).optional(),
  nashik_landmark: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
});

const roomUpdateSchema = z.object({
  room_number: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  category: z.enum(["Standard", "Deluxe", "Suite", "Family", "Presidential"]).optional(),
  description: z.string().min(10).optional(),
  base_price: z.coerce.number().positive().optional(),
  seasonal_price: nullablePositiveNumberSchema,
  seasonal_start: nullableDateSchema,
  seasonal_end: nullableDateSchema,
  discount_pct: nullablePercentSchema,
  discount_start: nullableDateSchema,
  discount_end: nullableDateSchema,
  total_units: z.coerce.number().int().min(1).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(imageReferenceSchema).optional(),
  floor: nullableIntegerSchema,
  view_type: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  bed_type: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  size_sqm: nullableIntegerSchema,
  is_active: z.boolean().optional(),
  status: z.enum(["available", "occupied", "maintenance", "cleaning"]).optional(),
  nashik_landmark: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
});

module.exports = {
  roomQuerySchema,
  roomCreateSchema,
  roomUpdateSchema,
};
