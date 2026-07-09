jest.mock("../models", () => ({
  Customer: {
    findOne: jest.fn(),
  },
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
const { generateOtp, hashOtp } = require("../src/services/otpService");
const { sendEmail } = require("../src/services/emailService");
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
    sendEmail.mockResolvedValue({ success: true, provider: "test" });
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
    expect(sendEmail).not.toHaveBeenCalled();
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
      email: "shubham@example.com",
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
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "shubham@example.com",
      subject: "Your Panchavati Grand login OTP",
      text: expect.stringContaining("123456"),
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "OTP sent to your registered email: sh*****@example.com",
        data: expect.objectContaining({
          delivery: "email",
          masked_email: "sh*****@example.com",
        }),
      })
    );
  });

  it("blocks rapid OTP resend for the same registered mobile number", async () => {
    const customer = {
      id: 7,
      full_name: "Registered Guest",
      email: "guest@example.com",
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      update: jest.fn(),
    };
    Customer.findOne.mockResolvedValue(customer);
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(customer.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("Please wait"),
    });
  });

  it("rejects phone login when the account has no registered email", async () => {
    Customer.findOne.mockResolvedValue({
      id: 7,
      email: null,
      otp_expires_at: null,
      update: jest.fn(),
    });
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("not linked to a registered email"),
    });
  });

  it("does not store an OTP when email delivery fails", async () => {
    const customer = {
      id: 7,
      email: "guest@example.com",
      otp_expires_at: null,
      update: jest.fn(),
    };
    Customer.findOne.mockResolvedValue(customer);
    sendEmail.mockResolvedValue({ success: false, error: "SMTP unavailable" });
    const req = { body: { phone: "+919876543210" } };
    const res = createResponse();

    await sendOtpCode(req, res);

    expect(customer.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(502);
  });
});
