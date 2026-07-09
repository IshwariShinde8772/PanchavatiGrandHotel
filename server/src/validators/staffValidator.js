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
  role: z.enum(["reception"]),
  password: optionalTrimmed(z.string().min(8)),
  schedule_json: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

const receptionistStaffSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(10),
  email: optionalTrimmed(z.string().email()),
  address: z.string().min(3),
  gender: z.enum(["male", "female", "other"]),
  role: z.enum(["housekeeping", "waiter", "admin_staff"]),
  specific_role: optionalTrimmed(z.string().min(2)),
  joining_date: z.string().min(10),
  shift: optionalTrimmed(z.string().min(2)),
  id_proof_type: z.string().min(2),
  id_proof_url: z.string().url(),
  id_proof_public_id: z.string().min(1),
  is_active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "admin_staff") {
    if (!data.specific_role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specific_role"],
        message: "Specific role is required for admin staff",
      });
    }

    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email is required for admin staff",
      });
    }
  }
});

module.exports = { receptionistStaffSchema, staffSchema };

