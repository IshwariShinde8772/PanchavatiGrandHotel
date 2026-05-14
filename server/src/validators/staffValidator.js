const { z } = require("zod");

const trimString = (value) => (typeof value === "string" ? value.trim() : value);
const optionalTrimmed = (schema) =>
  z.preprocess((value) => {
    const trimmed = trimString(value);
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());

const staffSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum(["receptionist", "housekeeping", "kitchen", "server", "manager"]),
  password: optionalTrimmed(z.string().min(8)),
  schedule_json: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

module.exports = { staffSchema };

