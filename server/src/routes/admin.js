const express = require("express");
const validate = require("../middleware/validate");
const { roomCreateSchema, roomUpdateSchema } = require("../validators/roomValidator");
const { staffSchema } = require("../validators/staffValidator");
const { getAdminDashboard } = require("../controllers/dashboard/adminDashboard");
const { listAdminRooms, createRoom, updateRoom, deleteRoom } = require("../controllers/room/roomController");
const { listStaff, createStaff, updateStaff, deleteStaff, toggleStaffActive, resetStaffPassword } = require("../controllers/staff/staffController");
const { listAllBookings, updateBooking, deleteBooking } = require("../controllers/booking/bookingController");
const { getReport, exportBookingsCsv } = require("../controllers/report/reportController");
const { listInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } = require("../controllers/inventory/inventoryController");
const { listAdminFeedback, moderateFeedback, deleteFeedback } = require("../controllers/feedback/feedbackController");
const { listEnquiries, respondToEnquiry, deleteEnquiry } = require("../controllers/enquiry/enquiryController");
const { listMaintenance, assignMaintenance, resolveMaintenance } = require("../controllers/maintenance/maintenanceController");
const { listCustomers, getCustomerDetail, toggleCustomerDeleted } = require("../controllers/auth/customerAuth");
const { getSettings, updateSettings } = require("../controllers/settings/settingsController");
const { listSeasonalPrices, createSeasonalPrice, updateSeasonalPrice, deleteSeasonalPrice } = require("../controllers/room/seasonalController");
const { listOffers, createOffer, updateOffer, deleteOffer } = require("../controllers/room/offerController");

const router = express.Router();

router.get("/dashboard", getAdminDashboard);

router.get("/rooms", listAdminRooms);
router.post("/rooms", validate(roomCreateSchema), createRoom);
router.put("/rooms/:id", validate(roomUpdateSchema), updateRoom);
router.delete("/rooms/:id", deleteRoom);

router.get("/staff", listStaff);
router.post("/staff", validate(staffSchema), createStaff);
router.put("/staff/:id", updateStaff);
router.delete("/staff/:id", deleteStaff);
router.patch("/staff/:id/toggle-active", toggleStaffActive);
router.post("/staff/:id/reset-password", resetStaffPassword);

router.get("/bookings", listAllBookings);
router.put("/bookings/:id", updateBooking);
router.delete("/bookings/:id", deleteBooking);
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

router.get("/seasonal-pricing", listSeasonalPrices);
router.post("/seasonal-pricing", createSeasonalPrice);
router.put("/seasonal-pricing/:id", updateSeasonalPrice);
router.delete("/seasonal-pricing/:id", deleteSeasonalPrice);

router.get("/offers", listOffers);
router.post("/offers", createOffer);
router.put("/offers/:id", updateOffer);
router.delete("/offers/:id", deleteOffer);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);

module.exports = router;
