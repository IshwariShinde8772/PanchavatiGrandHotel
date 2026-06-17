jest.mock("../models", () => ({
  Customer: {
    findOne: jest.fn(),
  },
}));

jest.mock("../src/config/smsGateway", () => ({
  sendSms: jest.fn(),
}));

jest.mock("../src/services/otpService", () => ({
  generateOtp: jest.fn(() => "123456"),
  hashOtp: jest.fn(() => Promise.resolve("hashed-otp")),
  verifyOtp: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendEmail: jest.fn(),
}));

const { Customer } = require("../models");
const { sendSms } = require("../src/config/smsGateway");
const { generateOtp, hashOtp } = require("../src/services/otpService");
const { sendOtpCode } = require("../src/controllers/auth/customerAuth");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("Customer OTP authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendSms.mockResolvedValue({ success: true, provider: "test" });
  });

  it("does not send OTP or create a customer for an unregistered mobile number", async () => {
    Customer.findOne.mockResolvedValue(null);
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(Customer.findOne).toHaveBeenCalledWith({
      where: {
        phone: "+919876543210",
        is_deleted: false,
      },
    });
    expect(generateOtp).not.toHaveBeenCalled();
    expect(hashOtp).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Mobile number not registered. Please register first.",
    });
  });

  it("sends and stores OTP for a registered mobile number", async () => {
    const customer = {
      id: 7,
      full_name: "Registered Guest",
      otp_expires_at: null,
      update: jest.fn().mockResolvedValue(),
    };
    Customer.findOne.mockResolvedValue(customer);
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(customer.update).toHaveBeenCalledWith({
      otp_code: "hashed-otp",
      otp_expires_at: expect.any(Date),
      otp_verified: false,
    });
    expect(sendSms).toHaveBeenCalledWith(
      "+919876543210",
      "Your Panchavati Grand OTP is 123456. It is valid for 10 minutes.",
      { otp: "123456" }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "OTP sent successfully",
      })
    );
  });

  it("blocks rapid OTP resend for the same registered mobile number", async () => {
    const customer = {
      id: 7,
      full_name: "Registered Guest",
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      update: jest.fn(),
    };
    Customer.findOne.mockResolvedValue(customer);
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(customer.update).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("Please wait"),
    });
  });
});
