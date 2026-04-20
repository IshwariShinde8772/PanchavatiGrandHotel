const { z } = require("zod");

const generateBillSchema = z.object({
  booking_id: z.coerce.number().int().positive(),
  extras: z.array(z.object({
    title: z.string(),
    amount: z.coerce.number().min(0),
  })).default([]),
});

module.exports = { generateBillSchema };

