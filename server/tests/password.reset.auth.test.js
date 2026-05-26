jest.mock("../models", () => ({
  Admin: { findOne: jest.fn() },
  Staff: { findOne: jest.fn() },
  Customer: { findOne: jest.fn() },
}));

jest.mock("../src/services/emailService", () => ({
  sendEmail: jest.fn(),
  hasUsableSmtpConfig: jest.fn(),
}));

jest.mock("../src/config/env", () => ({
  clientUrl: "http://localhost:5173",
  nodeEnv: "development",
}));

const {
  forgotPassword,
  resetPassword,
} = require("../src/controllers/auth/passwordResetAuth");
const { Admin, Staff, Customer } = require("../models");
const { sendEmail, hasUsableSmtpConfig } = require("../src/services/emailService");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("Password reset auth controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns generic forgot password response when account is not found", async () => {
    Admin.findOne.mockResolvedValue(null);
    Staff.findOne.mockResolvedValue(null);
    Customer.findOne.mockResolvedValue(null);

    const req = { body: { identifier: "unknown@example.com" } };
    const res = createRes();

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "If an account exists, reset instructions have been sent.",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("stores hashed token and logs reset link in development when smtp is not configured", async () => {
    const update = jest.fn().mockResolvedValue();
    const account = {
      email: "admin@example.com",
      full_name: "Portal Admin",
      update,
    };

    Admin.findOne.mockResolvedValue(account);
    hasUsableSmtpConfig.mockReturnValue(false);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const req = { body: { identifier: "admin@example.com", role: "admin" } };
    const res = createRes();

    await forgotPassword(req, res);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        resetPasswordToken: expect.any(String),
        resetPasswordExpires: expect.any(Date),
      })
    );
    expect(sendEmail).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/reset-password?token="));

    logSpy.mockRestore();
  });

  it("rejects reset password when token is invalid or expired", async () => {
    Admin.findOne.mockResolvedValue(null);
    Staff.findOne.mockResolvedValue(null);
    Customer.findOne.mockResolvedValue(null);

    const req = {
      body: {
        token: "not-valid-token",
        newPassword: "ValidPass123",
        confirmPassword: "ValidPass123",
      },
    };
    const res = createRes();

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Reset link is invalid or expired",
    });
  });

  it("updates password hash and clears reset token fields when token is valid", async () => {
    const update = jest.fn().mockResolvedValue();
    const account = { update };
    Admin.findOne.mockResolvedValue(account);

    const req = {
      body: {
        token: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        newPassword: "ValidPass123",
        confirmPassword: "ValidPass123",
      },
    };
    const res = createRes();

    await resetPassword(req, res);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        password_hash: expect.stringMatching(/^\$2[aby]\$/),
        resetPasswordToken: null,
        resetPasswordExpires: null,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Password reset successful",
    });
  });
});
