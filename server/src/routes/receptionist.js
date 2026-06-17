const express = require("express");
const validate = require("../middleware/validate");
const {
  walkInBookingSchema,
  checkInSchema,
  checkOutSchema,
  extendBookingSchema,
  postponeCheckInSchema,
  cancelBookingSchema,
  processExtensionRequestSchema,
} = require("../validators/bookingValidator");
const { generateBillSchema } = require("../validators/billValidator");
const { getReceptionistDashboard } = require("../controllers/dashboard/receptionistDashboard");
const {
  listAllBookings,
  createWalkInBooking,
  checkInBooking,
  checkOutBooking,
  extendBooking,
  postponeBookingCheckIn,
  cancelBooking,
} = require("../controllers/booking/bookingController");
const { getRoomGrid } = require("../controllers/room/roomController");
const { generateBookingBill } = require("../controllers/bill/billController");
const {
  listMaintenance,
  createMaintenanceLog,
} = require("../controllers/maintenance/maintenanceController");
const {
  listBookingExtensionRequests,
  processBookingExtensionRequest,
} = require("../controllers/booking/extensionController");
const {
  listReceptionNotifications,
  createReceptionNotification,
  markReceptionNotificationRead,
  deleteReceptionNotification,
} = require("../controllers/notification/notificationController");

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
router.post("/bookings/:id/postpone", validate(postponeCheckInSchema), postponeBookingCheckIn);
router.post("/bookings/:id/cancel", validate(cancelBookingSchema), cancelBooking);
router.get("/room-grid", getRoomGrid);
router.post("/bills/generate", validate(generateBillSchema), generateBookingBill);
router.get("/maintenance", listMaintenance);
router.post("/maintenance", createMaintenanceLog);
router.get("/notifications", listReceptionNotifications);
router.post("/notifications", createReceptionNotification);
router.patch("/notifications/:id/read", markReceptionNotificationRead);
router.delete("/notifications/:id", deleteReceptionNotification);
router.get("/enquiries", listEnquiries);
router.patch("/enquiries/:id/respond", respondToEnquiry);
router.get("/extensions", listBookingExtensionRequests);
router.patch("/extensions/:id/process", validate(processExtensionRequestSchema), processBookingExtensionRequest);

module.exports = router;
