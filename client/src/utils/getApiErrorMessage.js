const USER_ERROR_PATTERNS = [
  [/coupon.*(expired|expiry)|expired.*coupon/i, "apiErrors.couponExpired"],
  [/(invalid|unknown|not found).*coupon|coupon.*(invalid|not found)/i, "apiErrors.invalidCoupon"],
  [/room.*(unavailable|not available|already booked)|no rooms? available/i, "apiErrors.roomUnavailable"],
  [/payment.*(failed|declined|unsuccessful)/i, "apiErrors.paymentFailed"],
  [/refund.*(already|processed|completed)/i, "apiErrors.refundProcessed"],
  [/(access denied|forbidden|not authorized|unauthorized)/i, "apiErrors.accessDenied"],
  [/(invalid|incorrect|expired).*otp/i, "apiErrors.invalidOtp"],
  [/no[- ]?show/i, "apiErrors.noShowCancelled"],
  [/(network error|failed to fetch|connect to (the )?server)/i, "apiErrors.network"],
];

export function getApiErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.", t) {
  const responseData = error?.response?.data || {};
  const fieldErrors = responseData?.details?.fieldErrors || {};
  const firstFieldError = Object.values(fieldErrors).find(
    (messages) => Array.isArray(messages) && messages.length > 0
  )?.[0];

  const candidates = [
    firstFieldError,
    responseData.error,
    responseData.message,
    error?.message,
  ];

  for (const item of candidates) {
    const value = String(item || "").trim();
    if (value && value !== "Request failed with status code 500") {
      if (!t) return value;
      const match = USER_ERROR_PATTERNS.find(([pattern]) => pattern.test(value));
      return match ? t(match[1]) : t("apiErrors.generic");
    }
  }

  return t ? (fallbackMessage || t("apiErrors.generic")) : fallbackMessage;
}
