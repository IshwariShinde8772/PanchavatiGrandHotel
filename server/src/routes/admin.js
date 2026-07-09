const express = require("express");
const { approveRefund, getRefund, listRefunds, rejectRefund } = require("../controllers/refund/refundController");
const validate = require("../middleware/validate");
const { roomCreateSchema, roomUpdateSchema } = require("../validators/roomValidator");
const {
  amenityCreateSchema,
  amenityListQuerySchema,
  amenityUpdateSchema,
} = require("../validators/amenityValidator");
const { logListQuerySchema, logStatusSchema } = require("../validators/logValidator");
const { staffSchema } = require("../validators/staffValidator");
const { getAdminDashboard } = require("../controllers/dashboard/adminDashboard");
const { listAdminRooms, createRoom, updateRoom, deleteRoom } = require("../controllers/room/roomController");
const {
  createAmenity,
  deleteAmenity,
  listAmenities,
  updateAmenity,
} = require("../controllers/room/amenityController");
const { listLogs, updateLogStatus } = require("../controllers/logs/logController");
const { listStaff, createStaff, updateStaff, deleteStaff, toggleStaffActive, resetStaffPassword } = require("../controllers/staff/staffController");
const {
  listAllBookings,
  updateBooking,
  deleteBooking,
  earlyCheckOutBooking,
  markBookingNoShow,
} = require("../controllers/booking/bookingController");
const { earlyCheckOutSchema, extensionPaymentConfirmationSchema } = require("../validators/bookingValidator");
const { confirmExtensionPayment } = require("../controllers/booking/extensionController");
const { getReport, exportBookingsCsv } = require("../controllers/report/reportController");
const { listInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } = require("../controllers/inventory/inventoryController");
const { listAdminFeedback, moderateFeedback, deleteFeedback } = require("../controllers/feedback/feedbackController");
const { listEnquiries, respondToEnquiry, deleteEnquiry } = require("../controllers/enquiry/enquiryController");
const { listMaintenance, assignMaintenance, resolveMaintenance } = require("../controllers/maintenance/maintenanceController");
const { listCustomers, getCustomerDetail, toggleCustomerDeleted } = require("../controllers/auth/customerAuth");
const { getSettings, updateSettings } = require("../controllers/settings/settingsController");
const { listOffers, createOffer, updateOffer, deleteOffer } = require("../controllers/room/offerController");
const {
  createCoupon,
  deleteCoupon,
  getCoupon,
  listCoupons,
  toggleCouponStatus,
  updateCoupon,
} = require("../controllers/coupon/couponController");
const { couponCreateSchema, couponUpdateSchema } = require("../validators/couponValidator");
const {
  listNotifications,
  createNotification,
  markNotificationRead,
  deleteNotification,
} = require("../controllers/notification/notificationController");

const router = express.Router();

router.get("/dashboard", getAdminDashboard);

router.get("/rooms", listAdminRooms);
router.post("/rooms", validate(roomCreateSchema), createRoom);
router.put("/rooms/:id", validate(roomUpdateSchema), updateRoom);
router.delete("/rooms/:id", deleteRoom);

router.get("/amenities", validate(amenityListQuerySchema, "query"), listAmenities);
router.post("/amenities", validate(amenityCreateSchema), createAmenity);
router.put("/amenities/:id", validate(amenityUpdateSchema), updateAmenity);
router.delete("/amenities/:id", deleteAmenity);

router.get("/logs", validate(logListQuerySchema, "query"), listLogs);
router.patch("/logs/status", validate(logStatusSchema), updateLogStatus);

router.get("/staff", listStaff);
router.post("/staff", validate(staffSchema), createStaff);
router.put("/staff/:id", updateStaff);
router.delete("/staff/:id", deleteStaff);
router.patch("/staff/:id/toggle-active", toggleStaffActive);
router.post("/staff/:id/reset-password", resetStaffPassword);

router.get("/bookings", listAllBookings);
router.put("/bookings/:id", updateBooking);
router.post("/bookings/:id/early-checkout", validate(earlyCheckOutSchema), earlyCheckOutBooking);
router.post("/bookings/:id/mark-no-show", markBookingNoShow);
router.delete("/bookings/:id", deleteBooking);
router.patch("/extensions/:id/confirm-payment", validate(extensionPaymentConfirmationSchema), confirmExtensionPayment);
router.get("/reports", getReport);
router.get("/reports/bookings.csv", exportBookingsCsv);

router.get("/inventory", listInventory);
router.post("/inventory", createInventoryItem);
router.put("/inventory/:id", updateInventoryItem);
router.delete("/inventory/:id", deleteInventoryItem);

router.get("/maintenance", listMaintenance);
router.patch("/maintenance/:id/assign", assignMaintenance);
router.patch("/maintenance/:id/resolve", resolveMaintenance);

router.get("/feedbacks", listAdminFeedback);
router.patch("/feedbacks/:id", moderateFeedback);
router.delete("/feedbacks/:id", deleteFeedback);

router.get("/enquiries", listEnquiries);
router.patch("/enquiries/:id/respond", respondToEnquiry);
router.delete("/enquiries/:id", deleteEnquiry);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomerDetail);
router.patch("/customers/:id/toggle-delete", toggleCustomerDeleted);

router.get("/offers", listOffers);
router.post("/offers", createOffer);
router.put("/offers/:id", updateOffer);
router.delete("/offers/:id", deleteOffer);

router.get("/coupons", listCoupons);
router.post("/coupons", validate(couponCreateSchema), createCoupon);
router.get("/coupons/:id", getCoupon);
router.put("/coupons/:id", validate(couponUpdateSchema), updateCoupon);
router.patch("/coupons/:id/status", toggleCouponStatus);
router.delete("/coupons/:id", deleteCoupon);

router.get("/notifications", listNotifications);
router.post("/notifications", createNotification);
router.patch("/notifications/:id/read", markNotificationRead);
router.delete("/notifications/:id", deleteNotification);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/refunds", listRefunds);
router.get("/refunds/:id", getRefund);
router.patch("/refunds/:id/approve", approveRefund);
router.patch("/refunds/:id/reject", rejectRefund);

module.exports = router;
