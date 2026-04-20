const { Op } = require("sequelize");
const env = require("../config/env");

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

function serializeTransaction(record) {
  const plain = typeof record?.get === "function" ? record.get({ plain: true }) : { ...record };
  const now = Date.now();
  const expiry = plain.qr_expires_at ? new Date(plain.qr_expires_at).getTime() : null;
  const isExpired = plain.status === "expired" || (plain.status === "pending" && expiry && expiry <= now);
  const secondsRemaining = expiry && !isExpired ? Math.max(Math.floor((expiry - now) / 1000), 0) : 0;

  return {
    ...plain,
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

async function createQrTransaction({ PaymentTransaction, booking, customer, hotelSettings, transaction, amount, description }) {
  const expiresAt = getQrExpiryDate();
  const upiId = hotelSettings?.upi_id || "panchavatgrand@okaxis";
  const qrAmount = Number(amount ?? booking.total_amount).toFixed(2);
  const qrPayload = buildQrPayload({
    upiId,
    amount: qrAmount,
    bookingRef: booking.booking_ref,
    hotelName: hotelSettings?.hotel_name || "Panchavati Grand",
  });

  return PaymentTransaction.create(
    {
      booking_id: booking.id,
      customer_id: customer.id,
      amount: qrAmount,
      currency: "INR",
      payment_method: "qr",
      status: "pending",
      upi_id: upiId,
      qr_payload: qrPayload,
      qr_image_url: buildQrImageUrl(qrPayload),
      qr_expires_at: expiresAt,
      payment_reference: description ? `EXT-${Date.now()}` : undefined,
      remarks: description,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );
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
