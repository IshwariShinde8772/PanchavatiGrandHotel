const express = require("express");
const { getRefund, listRefunds } = require("../controllers/refund/refundController");
const validate = require("../middleware/validate");
const {
  walkInBookingSchema,
  checkInSchema,
  checkOutSchema,
  earlyCheckOutSchema,
  extendBookingSchema,
  postponeCheckInSchema,
  cancelBookingSchema,
  processExtensionRequestSchema,
  extensionPaymentConfirmationSchema,
  manualPaymentConfirmationSchema,
} = require("../validators/bookingValidator");
const { receptionistStaffSchema } = require("../validators/staffValidator");
const { generateBillSchema } = require("../validators/billValidator");
const { getReceptionistDashboard } = require("../controllers/dashboard/receptionistDashboard");
const {
  listAllBookings,
  createWalkInBooking,
  checkInBooking,
  confirmReservation,
  checkOutBooking,
  earlyCheckOutBooking,
  extendBooking,
  postponeBookingCheckIn,
  cancelBooking,
  markBookingNoShow,
  verifyBookingId,
  previewCancellation,
} = require("../controllers/booking/bookingController");
const { getRoomGrid, markRoomCleaned } = require("../controllers/room/roomController");
const { generateBookingBill } = require("../controllers/bill/billController");
const {
  listMaintenance,
  createMaintenanceLog,
} = require("../controllers/maintenance/maintenanceController");
const {
  listBookingExtensionRequests,
  processBookingExtensionRequest,
  confirmExtensionPayment,
} = require("../controllers/booking/extensionController");
const {
  listEnquiries,
  createOfflineEnquiry,
  respondToEnquiry,
} = require("../controllers/enquiry/enquiryController");
const { createReceptionistStaff, listReceptionistStaff } = require("../controllers/staff/staffController");

const router = express.Router();

router.get("/dashboard", getReceptionistDashboard);
router.get("/bookings", listAllBookings);
router.post("/walk-in-bookings", validate(walkInBookingSchema), createWalkInBooking);
router.post("/bookings/:id/check-in", validate(checkInSchema), checkInBooking);
router.patch("/bookings/:id/confirm-reservation", validate(manualPaymentConfirmationSchema), confirmReservation);
router.patch("/bookings/:id/verify-id", verifyBookingId);
router.post("/bookings/:id/check-out", validate(checkOutSchema), checkOutBooking);
router.post("/bookings/:id/early-checkout", validate(earlyCheckOutSchema), earlyCheckOutBooking);
router.post("/bookings/:id/extend", validate(extendBookingSchema), extendBooking);
router.post("/bookings/:id/postpone", validate(postponeCheckInSchema), postponeBookingCheckIn);
router.post("/bookings/:id/cancel", validate(cancelBookingSchema), cancelBooking);
router.post("/bookings/:id/mark-no-show", markBookingNoShow);
router.get("/bookings/:id/cancellation-preview", previewCancellation);
router.get("/room-grid", getRoomGrid);
router.patch("/rooms/:id/mark-cleaned", markRoomCleaned);
router.post("/bills/generate", validate(generateBillSchema), generateBookingBill);
router.get("/maintenance", listMaintenance);
router.post("/maintenance", createMaintenanceLog);
router.get("/enquiries", listEnquiries);
router.post("/enquiries", createOfflineEnquiry);
router.patch("/enquiries/:id/respond", respondToEnquiry);
router.get("/staff", listReceptionistStaff);
router.post("/staff", validate(receptionistStaffSchema), createReceptionistStaff);
router.get("/extensions", listBookingExtensionRequests);
router.patch("/extensions/:id/process", validate(processExtensionRequestSchema), processBookingExtensionRequest);
router.patch("/extensions/:id/confirm-payment", validate(extensionPaymentConfirmationSchema), confirmExtensionPayment);
router.get("/refunds", listRefunds);
router.get("/refunds/:id", getRefund);

module.exports = router;
