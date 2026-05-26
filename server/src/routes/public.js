const express = require("express");
const validate = require("../middleware/validate");
const {
  customerLoginLimiter,
  adminLoginLimiter,
  staffLoginLimiter,
  otpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require("../middleware/rateLimiter");
const { roomQuerySchema, roomCreateSchema } = require("../validators/roomValidator");
const {
  sendOtpSchema,
  verifyOtpSchema,
  customerRegisterSchema,
  customerLoginSchema,
  forgotPasswordSchema,
  customerForgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  customerResetPasswordSchema,
  adminLoginSchema,
  staffLoginSchema,
} = require("../validators/authValidator");
const { listRooms, getRoomDetail, getHomeCatalogue } = require("../controllers/room/roomController");
const {
  sendOtpCode,
  verifyOtpCode,
  registerCustomer,
  loginCustomer,
  forgotPassword: forgotCustomerPassword,
  resetPassword: resetCustomerPassword,
} = require("../controllers/auth/customerAuth");
const {
  forgotPassword,
  resetPassword,
} = require("../controllers/auth/passwordResetAuth");
const { loginAdmin } = require("../controllers/auth/adminAuth");
const { login } = require("../controllers/auth/loginAuth");
const { loginStaff } = require("../controllers/auth/staffAuth");
const { listPublishedFeedback } = require("../controllers/feedback/feedbackController");
const { createEnquiry } = require("../controllers/enquiry/enquiryController");
const { getPublicSettings } = require("../controllers/settings/settingsController");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

router.get("/home", getHomeCatalogue);
router.get("/settings/public", getPublicSettings);
router.get("/rooms", validate(roomQuerySchema, "query"), listRooms);
router.get("/rooms/:id", getRoomDetail);
router.get("/feedbacks/published", listPublishedFeedback);
router.post("/enquiries", createEnquiry);

router.post("/auth/send-otp", otpLimiter, validate(sendOtpSchema), sendOtpCode);
router.post("/auth/verify-otp", validate(verifyOtpSchema), verifyOtpCode);
router.post("/auth/login", validate(loginSchema), login);
router.post("/auth/customer/register", customerLoginLimiter, validate(customerRegisterSchema), registerCustomer);
router.post("/auth/customer/login", validate(customerLoginSchema), loginCustomer);
router.post("/auth/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/auth/reset-password", resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/auth/customer/forgot-password", forgotPasswordLimiter, validate(customerForgotPasswordSchema), forgotCustomerPassword);
router.post("/auth/customer/reset-password", resetPasswordLimiter, validate(customerResetPasswordSchema), resetCustomerPassword);
router.post("/auth/admin/login", adminLoginLimiter, validate(adminLoginSchema), loginAdmin);
router.post("/auth/staff/login", staffLoginLimiter, validate(staffLoginSchema), loginStaff);

module.exports = router;
