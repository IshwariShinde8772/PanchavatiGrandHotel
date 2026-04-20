const { z } = require("zod");

const optionalPositiveInt = z.coerce.number().int().positive().optional();

const createTaskSchema = z.object({
  room_id: optionalPositiveInt,
  room_number: z.string().min(1).optional(),
  staff_id: optionalPositiveInt,
  title: z.string().min(2),
  description: z.string().min(2).optional(),
  task_type: z.enum(["cleaning", "service", "delivery", "inspection", "maintenance"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  due_time: z.string().datetime().optional(),
  dueTime: z.string().datetime().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.room_id || data.room_number || data.title,
  { message: "Task title is required" }
);

const assignTaskSchema = z.object({
  staff_id: optionalPositiveInt,
  assigned_to: optionalPositiveInt,
  assigned_to_staff_id: optionalPositiveInt,
}).refine(
  (data) => data.staff_id || data.assigned_to || data.assigned_to_staff_id,
  { message: "Staff member is required" }
);

const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "done"]),
  notes: z.string().optional(),
});

module.exports = {
  assignTaskSchema,
  createTaskSchema,
  updateTaskStatusSchema,
};
