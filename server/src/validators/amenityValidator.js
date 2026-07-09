const { z } = require("zod");
const { AMENITY_CATEGORIES } = require("../../models/Amenity");

const categorySchema = z.enum(AMENITY_CATEGORIES);
const statusSchema = z.enum(["active", "inactive"]);
const optionalIconSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().max(80).nullable().optional()
);

const amenityCreateSchema = z.object({
  name: z.string().trim().min(1, "Amenity name is required").max(100),
  icon: optionalIconSchema,
  category: categorySchema.default("Other"),
  status: statusSchema.default("active"),
});

const amenityUpdateSchema = z.object({
  name: z.string().trim().min(1, "Amenity name is required").max(100).optional(),
  icon: optionalIconSchema,
  category: categorySchema.optional(),
  status: statusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one amenity field is required",
});

const amenityListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: statusSchema.optional(),
}).passthrough();

module.exports = {
  amenityCreateSchema,
  amenityListQuerySchema,
  amenityUpdateSchema,
};
