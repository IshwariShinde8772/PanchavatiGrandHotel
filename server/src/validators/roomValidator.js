const { z } = require("zod");

const emptyStringToNull = (value) => (value === "" ? null : value);

const nullableDateSchema = z.preprocess(
  emptyStringToNull,
  z.string().nullable().optional()
);

const nullablePercentSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(100).nullable().optional()
);
const nullableIntegerSchema = z.preprocess(
  emptyStringToNull,
  z.coerce.number().int().nullable().optional()
);

const IMAGE_EXTENSIONS =
  /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?(#.*)?$/i;

const TRUSTED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "res.cloudinary.com",
  "firebasestorage.googleapis.com",
];

function normalizeImageReferences(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Fall back to treating a single string as one image URL.
    }

    return [trimmed];
  }

  return [String(value)];
}

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

    const hasValidProtocol =
      parsed.protocol === "http:" || parsed.protocol === "https:";

    const hasImageExtension =
      IMAGE_EXTENSIONS.test(parsed.pathname) ||
      IMAGE_EXTENSIONS.test(normalized);

    const isTrustedImageHost = TRUSTED_IMAGE_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );

    return hasValidProtocol && (hasImageExtension || isTrustedImageHost);
  } catch (error) {
    return false;
  }
}

const imageReferenceSchema = z.string().trim().refine(
  isValidImageReference,
  "Each image must be a valid image URL or upload path"
);

const imageReferenceArraySchema = z.preprocess(
  normalizeImageReferences,
  z.array(imageReferenceSchema)
);

const amenityIdArraySchema = z.array(
  z.coerce.number().int().positive()
).max(100).refine(
  (ids) => new Set(ids).size === ids.length,
  "Amenity IDs must be unique"
);

const roomCategorySchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const categories = {
      standard: "Standard",
      deluxe: "Deluxe",
      regular: "Regular",
    };
    return categories[value.trim().toLocaleLowerCase()] || value;
  },
  z.enum(["Standard", "Deluxe", "Regular"])
);

function isValidDateRange(checkIn, checkOut) {
  if (!checkIn && !checkOut) return true;
  if (!checkIn || !checkOut) return false;
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
}

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
}).passthrough().refine((data) => isValidDateRange(data.checkIn, data.checkOut), {
  message: "Check-in and check-out must be a valid date range",
  path: ["checkOut"],
});

const roomDetailQuerySchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  calendarStart: z.string().optional(),
}).passthrough().refine((data) => isValidDateRange(data.checkIn, data.checkOut), {
  message: "Check-in and check-out must be a valid date range",
  path: ["checkOut"],
});

const roomCreateSchema = z.object({
  room_number: z.string().min(1),
  name: z.string().min(2),
  category: roomCategorySchema,
  description: z.string().min(10),
  base_price: z.coerce.number().positive(),
  discount_pct: nullablePercentSchema,
  discount_start: nullableDateSchema,
  discount_end: nullableDateSchema,
  total_units: z.coerce.number().int().min(1).default(1),
  capacity: z.coerce.number().int().min(1),
  amenities: z.array(z.string()).default([]),
  amenity_ids: amenityIdArraySchema.default([]),
  images: imageReferenceArraySchema.default([]),
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
  category: roomCategorySchema.optional(),
  description: z.string().min(10).optional(),
  base_price: z.coerce.number().positive().optional(),
  discount_pct: nullablePercentSchema,
  discount_start: nullableDateSchema,
  discount_end: nullableDateSchema,
  total_units: z.coerce.number().int().min(1).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  amenity_ids: amenityIdArraySchema.optional(),
  images: imageReferenceArraySchema.optional(),
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
  roomDetailQuerySchema,
  roomCreateSchema,
  roomUpdateSchema,
};
