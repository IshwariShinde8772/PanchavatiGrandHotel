const { Booking, Customer, HotelSetting, Notification, PaymentTransaction, Room } = require("../../../models");
const {
  createQrTransaction,
  expirePendingTransactions,
  expireTransactionIfNeeded,
  serializeTransaction,
} = require("../../services/transactionService");

const transactionInclude = [
  {
    model: Booking,
    as: "booking",
    include: [{ model: Room, as: "room", attributes: ["id", "room_number", "name", "category"] }],
  },
];

async function listCustomerTransactions(req, res) {
  await expirePendingTransactions(PaymentTransaction, { customer_id: req.user.id });

  const items = await PaymentTransaction.findAll({
    where: { customer_id: req.user.id },
    include: transactionInclude,
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: items.map((item) => serializeTransaction(item)),
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function confirmCustomerTransaction(req, res) {
  const item = await PaymentTransaction.findOne({
    where: { id: req.params.id, customer_id: req.user.id },
    include: transactionInclude,
  });

  if (!item) {
    return res.status(404).json({ success: false, error: "Transaction not found" });
  }

  if (item.payment_type === "extension_payment" || item.extension_request_id) {
    return res.status(403).json({
      success: false,
      error: "Extension payments can only be confirmed manually by hotel reception",
    });
  }

  if (item.payment_method !== "qr") {
    return res.status(400).json({
      success: false,
      error: "Online Razorpay payments must be completed through verified Razorpay Checkout",
    });
  }

  await expireTransactionIfNeeded(item);

  if (item.booking?.status === "cancelled") {
    return res.status(400).json({ success: false, error: "This booking has already been cancelled" });
  }

  if (item.status === "expired") {
    return res.status(410).json({ success: false, error: "QR expired. Generate a new QR to continue." });
  }

  if (item.status === "paid") {
    return res.json({
      success: true,
      data: {
        transaction: serializeTransaction(item),
        booking: item.booking,
      },
      message: "Payment already confirmed",
    });
  }

  await item.update({
    status: "paid",
    payment_reference: req.body?.payment_reference || `QRPAY-${Date.now()}`,
    paid_at: new Date(),
    updated_at: new Date(),
  });

  const isReservation = item.booking.reservation_type === "reserved_booking";
  await item.booking.update(isReservation ? {
    payment_status: "pay_at_hotel",
    payment_method: "qr",
    status: "reserved",
    advance_paid: item.amount,
    amount_paid: item.amount,
    remaining_amount: Math.max(Number(item.booking.total_amount) - Number(item.amount), 0),
  } : {
    payment_status: "paid",
    payment_method: "qr",
    status: "confirmed",
    advance_paid: item.amount,
    amount_paid: item.amount,
    remaining_amount: 0,
  });

  await Notification.create({
    target_role: "customer",
    target_id: req.user.id,
    title: "Payment Received",
    message: `Your payment for ${item.booking.booking_ref} has been marked as paid.`,
    type: "payment",
  });

  const updated = await PaymentTransaction.findByPk(item.id, { include: transactionInclude });

  return res.json({
    success: true,
    data: {
      transaction: serializeTransaction(updated),
      booking: updated.booking,
    },
    message: "Payment confirmed successfully",
  });
}

async function regenerateCustomerTransactionQr(req, res) {
  const item = await PaymentTransaction.findOne({
    where: { id: req.params.id, customer_id: req.user.id },
    include: transactionInclude,
  });

  if (!item) {
    return res.status(404).json({ success: false, error: "Transaction not found" });
  }
  if (item.payment_type === "extension_payment" || item.extension_request_id) {
    return res.status(403).json({
      success: false,
      error: "Extension payments do not use online or QR payment",
    });
  }

  if (item.payment_method !== "qr") {
    return res.status(400).json({
      success: false,
      error: "Only legacy QR transactions can be regenerated",
    });
  }

  if (item.status === "paid") {
    return res.status(400).json({ success: false, error: "Payment is already completed" });
  }

  await item.update({
    status: item.status === "pending" ? "expired" : item.status,
    updated_at: new Date(),
  });

  const booking = await Booking.findByPk(item.booking_id);
  const customer = await Customer.findByPk(item.customer_id);
  const hotelSettings = await HotelSetting.findByPk(1);

  if (booking?.status === "cancelled") {
    return res.status(400).json({ success: false, error: "Cannot generate a new QR for a cancelled booking" });
  }

  const created = await createQrTransaction({
    PaymentTransaction,
    booking,
    customer,
    hotelSettings,
    amount: booking.reservation_type === "reserved_booking" ? booking.advance_amount : booking.total_amount,
    description: booking.reservation_type === "reserved_booking" ? "Reservation 10% advance" : "Full booking payment",
    allowLocalFallback: booking.reservation_type === "reserved_booking",
  });

  const fresh = await PaymentTransaction.findByPk(created.id, { include: transactionInclude });

  return res.status(201).json({
    success: true,
    data: {
      transaction: serializeTransaction(fresh),
      booking: fresh.booking,
    },
    message: "New QR generated",
  });
}

async function deleteCustomerTransaction(req, res) {
  const transaction = await PaymentTransaction.findOne({
    where: { id: req.params.id, customer_id: req.user.id },
  });

  if (!transaction) {
    return res.status(404).json({ success: false, error: "Transaction not found" });
  }
  if (transaction.payment_type === "extension_payment" || transaction.extension_request_id) {
    return res.status(403).json({
      success: false,
      error: "Extension payment history cannot be deleted by the customer",
    });
  }

  if (transaction.payment_method === "online") {
    return res.status(400).json({
      success: false,
      error: "Razorpay payment audit records cannot be deleted",
    });
  }

  await transaction.destroy();

  return res.json({ success: true, message: "Transaction removed" });
}

async function clearCustomerTransactions(req, res) {
  await PaymentTransaction.destroy({
    where: {
      customer_id: req.user.id,
      payment_method: "qr",
    },
  });

  return res.json({ success: true, message: "Legacy QR transactions cleared" });
}

module.exports = {
  confirmCustomerTransaction,
  listCustomerTransactions,
  regenerateCustomerTransactionQr,
  deleteCustomerTransaction,
  clearCustomerTransactions,
};
