const express = require("express");
const validate = require("../middleware/validate");
const {
  createBookingSchema,
  verifyPaymentSchema,
  cancelBookingSchema,
} = require("../validators/bookingValidator");
const { generateBillSchema } = require("../validators/billValidator");
const {
  getProfile,
  updateProfile,
  getSavedRooms,
  saveRoom,
  removeSavedRoom,
  getNotifications,
  markNotificationsRead,
  deleteNotification,
  clearNotifications,
} = require("../controllers/auth/customerAuth");
const {
  listCustomerTransactions,
  confirmCustomerTransaction,
  regenerateCustomerTransactionQr,
  deleteCustomerTransaction,
  clearCustomerTransactions,
} = require("../controllers/payment/transactionController");
const {
  createBooking,
  verifyBookingPayment,
  listCustomerBookings,
  getCustomerBooking,
  cancelBooking,
} = require("../controllers/booking/bookingController");
const {
  createBookingExtensionRequest,
  getBookingExtensionRequests,
  payExtensionRequest,
} = require("../controllers/booking/extensionController");
const { extensionRequestSchema } = require("../validators/bookingValidator");
const { submitFeedback } = require("../controllers/feedback/feedbackController");
const { getBookingBill, downloadBookingBill } = require("../controllers/bill/billController");

const router = express.Router();

router.get("/me", getProfile);
router.put("/profile", updateProfile);

router.get("/bookings", listCustomerBookings);
router.get("/bookings/:id", getCustomerBooking);
router.post("/bookings", validate(createBookingSchema), createBooking);
router.post("/bookings/verify-payment", validate(verifyPaymentSchema), verifyBookingPayment);
router.post("/bookings/:id/cancel", validate(cancelBookingSchema), cancelBooking);
router.post("/bookings/:id/extensions", validate(extensionRequestSchema), createBookingExtensionRequest);
router.get("/bookings/:id/extensions", getBookingExtensionRequests);
router.post("/bookings/:bookingId/extensions/:id/pay", payExtensionRequest);

router.get("/saved-rooms", getSavedRooms);
router.post("/saved-rooms", saveRoom);
router.delete("/saved-rooms/:roomId", removeSavedRoom);

router.post("/feedbacks", submitFeedback);

router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markNotificationsRead);
router.delete("/notifications/:id", deleteNotification);
router.delete("/notifications", clearNotifications);

router.get("/transactions", listCustomerTransactions);
router.post("/transactions/:id/confirm", confirmCustomerTransaction);
router.post("/transactions/:id/regenerate-qr", regenerateCustomerTransactionQr);
router.delete("/transactions/:id", deleteCustomerTransaction);
router.delete("/transactions", clearCustomerTransactions);

router.get("/bills/:bookingId", getBookingBill);
router.get("/bills/:bookingId/download", downloadBookingBill);

module.exports = router;
