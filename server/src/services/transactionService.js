const { Op } = require("sequelize");
const env = require("../config/env");
const razorpay = require("../config/razorpay");

function getQrExpiryDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + env.payments.qrExpiryMinutes * 60 * 1000);
}

function buildQrPayload({ upiId, amount, bookingRef, hotelName }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: hotelName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: `Booking ${bookingRef}`,
  });

  return `upi://pay?${params.toString()}`;
}

function buildQrImageUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
}

function createBadRequestError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function ensureRazorpayQrConfig() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw createBadRequestError(
      "Razorpay QR payment is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  if (!razorpay || !razorpay.qrCode || typeof razorpay.qrCode.create !== "function") {
    const error = new Error("Razorpay QR client is not initialized on the server");
    error.status = 500;
    throw error;
  }
}

function normalizeAmount(rawAmount) {
  const amountNumber = Number(rawAmount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw createBadRequestError("Invalid booking amount for QR payment. Amount must be a positive number.");
  }

  const amountPaise = Math.round(amountNumber * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw createBadRequestError("Invalid booking amount for QR payment. Amount in paise must be greater than zero.");
  }

  return {
    amountPaise,
    amountRupees: Number((amountPaise / 100).toFixed(2)),
  };
}

function truncate(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}

function sanitizeRazorpayText(value, maxLength) {
  return truncate(
    String(value || "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^a-zA-Z0-9 .,_\-()/:#]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    maxLength
  );
}

function buildRazorpayName(bookingRef) {
  const fallbackName = "Booking QR";
  const name = sanitizeRazorpayText(`Booking ${bookingRef}`, 50);
  return name || fallbackName;
}

function buildRazorpayDescription({ bookingRef, customerId, customDescription }) {
  const base = customDescription
    ? `${customDescription} Booking ${bookingRef} Customer ${customerId}`
    : `Booking ${bookingRef} Customer ${customerId}`;

  const sanitized = sanitizeRazorpayText(base, 255);
  return sanitized || `Booking ${bookingRef}`;
}

function mapRazorpayQrStatus(status) {
  if (status === "active") {
    return "pending";
  }

  if (status === "closed") {
    return "expired";
  }

  return "pending";
}

function extractRazorpayError(error) {
  const razorpayError = error?.error || {};

  return {
    statusCode: error?.statusCode || razorpayError?.status_code || null,
    code: razorpayError?.code || error?.code || null,
    description: razorpayError?.description || error?.message || "Failed to create Razorpay QR code",
    field: razorpayError?.field || null,
    source: razorpayError?.source || null,
    step: razorpayError?.step || null,
    reason: razorpayError?.reason || null,
    metadata: razorpayError?.metadata || null,
  };
}

function isRazorpayValidationError(details) {
  const statusCode = Number(details?.statusCode);
  const description = String(details?.description || "").toLowerCase();
  const code = String(details?.code || "").toLowerCase();

  return statusCode === 400
    || code.includes("bad_request")
    || description.includes("validation")
    || description.includes("invalid")
    || description.includes("required");
}

function buildRazorpayFailureMessage(details) {
  if (details?.field) {
    return `Razorpay QR validation failed for field "${details.field}". ${details.description || ""}`.trim();
  }

  const base = String(details?.description || "").trim();
  return base || "Failed to create Razorpay QR code";
}

function shouldRetryWithMinimalPayload(details, attemptLabel) {
  return attemptLabel === "primary" && isRazorpayValidationError(details);
}

function isMissingRazorpayQrColumnError(error) {
  const message = String(
    error?.original?.sqlMessage
    || error?.parent?.sqlMessage
    || error?.message
    || ""
  ).toLowerCase();

  return message.includes("unknown column")
    && message.includes("razorpay_qr_id");
}

async function createPaymentTransactionRecord(PaymentTransaction, payload, options) {
  try {
    return await PaymentTransaction.create(payload, options);
  } catch (error) {
    if (!isMissingRazorpayQrColumnError(error)) {
      throw error;
    }

    console.warn("payment_transactions.razorpay_qr_id is missing in DB, retrying insert without it");

    const retryPayload = { ...payload };
    delete retryPayload.razorpay_qr_id;
    return PaymentTransaction.create(retryPayload, options);
  }
}

function mapRazorpayQrToTransaction({
  booking,
  customer,
  amountRupees,
  upiId,
  expiresAt,
  description,
  fallbackQrPayload,
  qrResponse,
}) {
  const qrId = qrResponse?.id || null;
  const qrStatus = mapRazorpayQrStatus(qrResponse?.status);
  const qrPayload = qrResponse?.short_url || fallbackQrPayload;
  const qrImageUrl = qrResponse?.image_url || buildQrImageUrl(qrPayload);

  return {
    booking_id: booking.id,
    customer_id: customer.id,
    amount: amountRupees,
    currency: "INR",
    payment_method: "qr",
    status: qrStatus,
    upi_id: upiId,
    qr_payload: qrPayload,
    qr_image_url: qrImageUrl,
    qr_expires_at: expiresAt,
    razorpay_qr_id: qrId,
    payment_reference: qrId || (description ? `EXT-${Date.now()}` : undefined),
    remarks: description,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function mapFallbackQrToTransaction({
  booking,
  customer,
  amountRupees,
  upiId,
  expiresAt,
  description,
  fallbackQrPayload,
  fallbackReason,
}) {
  const remarks = [
    description || "",
    fallbackReason ? `Razorpay unavailable: ${fallbackReason}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    booking_id: booking.id,
    customer_id: customer.id,
    amount: amountRupees,
    currency: "INR",
    payment_method: "qr",
    status: "pending",
    upi_id: upiId,
    qr_payload: fallbackQrPayload,
    qr_image_url: buildQrImageUrl(fallbackQrPayload),
    qr_expires_at: expiresAt,
    razorpay_qr_id: null,
    payment_reference: `LOCAL-QR-${Date.now()}`,
    remarks: truncate(remarks, 1000),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function serializeTransaction(record) {
  const plain = typeof record?.get === "function" ? record.get({ plain: true }) : { ...record };
  const now = Date.now();
  const expiry = plain.qr_expires_at ? new Date(plain.qr_expires_at).getTime() : null;
  const isExpired = plain.status === "expired" || (plain.status === "pending" && expiry && expiry <= now);
  const secondsRemaining = expiry && !isExpired ? Math.max(Math.floor((expiry - now) / 1000), 0) : 0;

  return {
    ...plain,
    qr_id: plain.razorpay_qr_id || plain.payment_reference || null,
    is_expired: Boolean(isExpired),
    seconds_remaining: secondsRemaining,
    booking_ref: plain.booking?.booking_ref || null,
    booking_status: plain.booking?.status || null,
    room_name: plain.booking?.room?.name || null,
    room_number: plain.booking?.room?.room_number || null,
  };
}

async function expirePendingTransactions(PaymentTransaction, where = {}) {
  await PaymentTransaction.update(
    {
      status: "expired",
      updated_at: new Date(),
    },
    {
      where: {
        status: "pending",
        qr_expires_at: { [Op.lte]: new Date() },
        ...where,
      },
    }
  );
}

async function expireTransactionIfNeeded(transactionRecord) {
  if (!transactionRecord || transactionRecord.status !== "pending") {
    return transactionRecord;
  }

  if (transactionRecord.qr_expires_at && new Date(transactionRecord.qr_expires_at) <= new Date()) {
    await transactionRecord.update({
      status: "expired",
      updated_at: new Date(),
    });
  }

  return transactionRecord;
}

async function createQrTransaction({ PaymentTransaction, booking, customer, hotelSettings, transaction, amount, description, allowLocalFallback = false }) {
  if (!booking?.id) {
    throw createBadRequestError("Booking not found for QR payment");
  }

  if (!customer?.id) {
    throw createBadRequestError("Customer not found for QR payment");
  }

  const gatewayAvailable = Boolean(
    env.razorpay.keyId
    && env.razorpay.keySecret
    && razorpay?.qrCode
    && typeof razorpay.qrCode.create === "function"
  );
  if (!gatewayAvailable && !allowLocalFallback) ensureRazorpayQrConfig();

  const selectedAmount = amount ?? booking.total_amount;
  const { amountPaise, amountRupees } = normalizeAmount(selectedAmount);

  const expiresAt = getQrExpiryDate();
  const upiId = hotelSettings?.upi_id || "panchavatgrand@okaxis";
  const bookingRef = booking.booking_ref || `BOOKING-${booking.id}`;
  const fallbackQrPayload = buildQrPayload({
    upiId,
    amount: amountRupees,
    bookingRef,
    hotelName: hotelSettings?.hotel_name || "Panchavati Grand",
  });

  const name = buildRazorpayName(bookingRef);
  const qrRequestPayload = {
    type: "upi_qr",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: amountPaise,
    name,
    description: buildRazorpayDescription({
      bookingRef,
      customerId: customer.id,
      customDescription: description,
    }),
    notes: {
      booking_id: String(booking.id),
      booking_ref: truncate(bookingRef, 256),
      customer_id: String(customer.id),
    },
  };

  const minimalQrRequestPayload = {
    type: "upi_qr",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: amountPaise,
    name,
  };

  let qrResponse;
  let lastDetails = null;
  const attempts = [
    { label: "primary", payload: qrRequestPayload },
    { label: "minimal", payload: minimalQrRequestPayload },
  ];

  for (const attempt of gatewayAvailable ? attempts : []) {
    try {
      qrResponse = await razorpay.qrCode.create(attempt.payload);
      break;
    } catch (error) {
      const details = extractRazorpayError(error);
      lastDetails = details;

      console.error("Razorpay QR creation failed", {
        bookingId: booking.id,
        customerId: customer.id,
        amountPaise,
        attempt: attempt.label,
        request: attempt.payload,
        error: details,
      });

      if (!shouldRetryWithMinimalPayload(details, attempt.label)) {
        break;
      }
    }
  }

  const transactionPayload = qrResponse
    ? mapRazorpayQrToTransaction({
        booking,
        customer,
        amountRupees,
        upiId,
        expiresAt,
        description,
        fallbackQrPayload,
        qrResponse,
      })
    : mapFallbackQrToTransaction({
        booking,
        customer,
        amountRupees,
        upiId,
        expiresAt,
        description,
        fallbackQrPayload,
        fallbackReason: gatewayAvailable
          ? buildRazorpayFailureMessage(lastDetails)
          : "Manual hotel UPI advance payment",
      });

  if (!qrResponse) {
    console.warn("Falling back to local UPI QR payload because Razorpay QR creation failed", {
      bookingId: booking.id,
      customerId: customer.id,
      reason: lastDetails,
    });
  }

  return createPaymentTransactionRecord(PaymentTransaction, transactionPayload, { transaction });
}

module.exports = {
  buildQrImageUrl,
  buildQrPayload,
  createQrTransaction,
  expirePendingTransactions,
  expireTransactionIfNeeded,
  getQrExpiryDate,
  serializeTransaction,
};
