const axios = require("axios");
const env = require("./env");
const { normalizePhoneNumber } = require("../utils/phone");

function formatProviderError(provider, error) {
  const responseData = error.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return `${provider}: ${responseData.trim()}`;
  }

  if (responseData?.message) {
    const message = Array.isArray(responseData.message)
      ? responseData.message.join(", ")
      : responseData.message;
    return `${provider}: ${message}`;
  }

  if (responseData?.error) {
    return `${provider}: ${responseData.error}`;
  }

  return `${provider}: ${error.message}`;
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function resolveOtpCode(message, options = {}) {
  const explicitOtp = digitsOnly(options.otp);
  if (explicitOtp) {
    return explicitOtp;
  }

  const match = String(message || "").match(/\b\d{4,8}\b/);
  return match ? match[0] : "";
}

async function sendViaTwoFactor(phone, message, options = {}) {
  if (!env.twofactor?.apiKey) {
    throw new Error("2Factor is not configured");
  }

  const phoneDigits = digitsOnly(phone);
  if (!phoneDigits) {
    throw new Error("2Factor requires a valid phone number");
  }

  const otpCode = resolveOtpCode(message, options);
  if (!otpCode) {
    throw new Error("2Factor requires an OTP code");
  }

  let endpoint = `https://2factor.in/API/V1/${encodeURIComponent(env.twofactor.apiKey)}/SMS/${encodeURIComponent(phoneDigits)}/${encodeURIComponent(otpCode)}`;
  if (env.twofactor.template) {
    endpoint += `/${encodeURIComponent(env.twofactor.template)}`;
  }

  const response = await axios.post(endpoint, null, { timeout: 5000 });
  const status = String(response.data?.Status || response.data?.status || "").toLowerCase();

  if (status && status !== "success") {
    const details =
      response.data?.Details ||
      response.data?.details ||
      response.data?.message ||
      "2Factor rejected the SMS request";
    throw new Error(String(details));
  }

  return { success: true, provider: "twofactor", response: response.data };
}

async function sendViaFast2Sms(phone, message) {
  if (!env.fast2smsKey) {
    throw new Error("FAST2SMS is not configured");
  }

  if (!phone.startsWith("+91")) {
    throw new Error("FAST2SMS only supports Indian phone numbers in this setup");
  }

  const response = await axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    {
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers: phone.replace(/^\+91/, ""),
      sender_id: env.fast2smsSenderId,
    },
    {
      timeout: 5000,
      headers: {
        authorization: env.fast2smsKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.data?.return === false) {
    const details = Array.isArray(response.data?.message)
      ? response.data.message.join(", ")
      : response.data?.message || "Fast2SMS rejected the SMS request";
    throw new Error(details);
  }

  return { success: true, provider: "fast2sms", response: response.data };
}

async function sendViaTwilio(phone, message) {
  if (!env.twilio.sid || !env.twilio.token || !env.twilio.phone) {
    throw new Error("Twilio is not configured");
  }

  const payload = new URLSearchParams({
    To: phone,
    From: env.twilio.phone,
    Body: message,
  });

  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.sid}/Messages.json`,
    payload.toString(),
    {
      timeout: 5000,
      auth: {
        username: env.twilio.sid,
        password: env.twilio.token,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return { success: true, provider: "twilio", response: response.data };
}

async function sendSms(phone, message, options = {}) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    throw new Error("A valid phone number is required to send SMS");
  }

  const failures = [];

  if (env.twofactor?.apiKey) {
    try {
      return await sendViaTwoFactor(normalizedPhone, message, options);
    } catch (error) {
      failures.push(formatProviderError("2Factor", error));
    }
  }

  if (env.fast2smsKey) {
    try {
      return await sendViaFast2Sms(normalizedPhone, message);
    } catch (error) {
      failures.push(formatProviderError("FAST2SMS", error));
    }
  }

  if (env.twilio.sid && env.twilio.token && env.twilio.phone) {
    try {
      return await sendViaTwilio(normalizedPhone, message);
    } catch (error) {
      failures.push(formatProviderError("Twilio", error));
    }
  }

  if (env.nodeEnv !== "production") {
    console.warn(
      `SMS delivery fallback for ${normalizedPhone}: ${failures.join(" | ") || "No SMS provider configured"}`
    );

    return {
      success: true,
      mocked: true,
      provider: "console",
      message: `SMS to ${normalizedPhone}: ${message}`,
    };
  }

  throw new Error(failures.join(" | ") || "No SMS provider configured");
}

module.exports = { sendSms };
