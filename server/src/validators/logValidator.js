const { z } = require("zod");

const logListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  level: z.enum(["info", "warning", "error"]).optional(),
  module: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).passthrough();

const logStatusSchema = z.object({
  enabled: z.boolean(),
});

module.exports = {
  logListQuerySchema,
  logStatusSchema,
};
