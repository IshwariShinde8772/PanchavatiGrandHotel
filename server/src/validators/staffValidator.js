const { z } = require("zod");

const staffSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum(["receptionist", "housekeeping", "kitchen", "server", "manager"]),
  password: z.string().min(8).optional(),
  schedule_json: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

module.exports = { staffSchema };

