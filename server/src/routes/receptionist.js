const express = require("express");
const validate = require("../middleware/validate");
const {
  walkInBookingSchema,
  checkInSchema,
  checkOutSchema,
  extendBookingSchema,
  cancelBookingSchema,
} = require("../validators/bookingValidator");
const { generateBillSchema } = require("../validators/billValidator");
const { getReceptionistDashboard } = require("../controllers/dashboard/receptionistDashboard");
const {
  listAllBookings,
  createWalkInBooking,
  checkInBooking,
  checkOutBooking,
  extendBooking,
  cancelBooking,
} = require("../controllers/booking/bookingController");
const { getRoomGrid } = require("../controllers/room/roomController");
const { generateBookingBill } = require("../controllers/bill/billController");
const {
  listMaintenance,
  createMaintenanceLog,
} = require("../controllers/maintenance/maintenanceController");
const {
  assignReceptionTask,
  createReceptionTask,
  listAssignableStaff,
  listReceptionTasks,
  updateReceptionTaskStatus,
} = require("../controllers/task/taskController");
const {
  listBookingExtensionRequests,
  processBookingExtensionRequest,
} = require("../controllers/booking/extensionController");
const { processExtensionRequestSchema } = require("../validators/bookingValidator");
const {
  assignTaskSchema,
  createTaskSchema,
  updateTaskStatusSchema,
} = require("../validators/taskValidator");

const {
  listEnquiries,
  respondToEnquiry,
} = require("../controllers/enquiry/enquiryController");

const router = express.Router();

router.get("/dashboard", getReceptionistDashboard);
router.get("/bookings", listAllBookings);
router.post("/walk-in-bookings", validate(walkInBookingSchema), createWalkInBooking);
router.post("/bookings/:id/check-in", validate(checkInSchema), checkInBooking);
router.post("/bookings/:id/check-out", validate(checkOutSchema), checkOutBooking);
router.post("/bookings/:id/extend", validate(extendBookingSchema), extendBooking);
router.post("/bookings/:id/cancel", validate(cancelBookingSchema), cancelBooking);
router.get("/room-grid", getRoomGrid);
router.post("/bills/generate", validate(generateBillSchema), generateBookingBill);
router.get("/maintenance", listMaintenance);
router.post("/maintenance", createMaintenanceLog);
router.get("/staff", listAssignableStaff);
router.get("/tasks", listReceptionTasks);
router.post("/tasks", validate(createTaskSchema), createReceptionTask);
router.patch("/tasks/:id/assign", validate(assignTaskSchema), assignReceptionTask);
router.patch("/tasks/:id/status", validate(updateTaskStatusSchema), updateReceptionTaskStatus);
router.get("/enquiries", listEnquiries);
router.patch("/enquiries/:id/respond", respondToEnquiry);
router.get("/extensions", listBookingExtensionRequests);
router.patch("/extensions/:id/process", validate(processExtensionRequestSchema), processBookingExtensionRequest);

module.exports = router;
