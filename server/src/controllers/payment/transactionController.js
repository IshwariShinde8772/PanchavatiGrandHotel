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

  await item.booking.update({
    payment_status: "paid",
    payment_method: "qr",
    status: "confirmed",
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

  await transaction.destroy();

  return res.json({ success: true, message: "Transaction removed" });
}

async function clearCustomerTransactions(req, res) {
  await PaymentTransaction.destroy({
    where: { customer_id: req.user.id },
  });

  return res.json({ success: true, message: "All transactions cleared" });
}

module.exports = {
  confirmCustomerTransaction,
  listCustomerTransactions,
  regenerateCustomerTransactionQr,
  deleteCustomerTransaction,
  clearCustomerTransactions,
};
