const {
  Admin,
  Booking,
  Customer,
  HotelSetting,
  RefundRequest,
  Room,
  sequelize,
} = require("../../../models");
const { refundPayment } = require("../../services/paymentService");
const { sendRefundEmail } = require("../../services/emailService");
const { updateCouponUsageForBooking } = require("../../services/couponService");
const { writeAudit } = require("../../services/auditService");
const { formatToIST } = require("../../utils/dateHelpers");

const include = [
  { model: Booking, as: "booking", include: [{ model: Room, as: "room" }] },
  { model: Customer, as: "customer", attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] } },
  {
    model: Admin,
    as: "processedByAdmin",
    attributes: ["id", "full_name", "email"],
    required: false,
  },
];

const PENDING_STATUSES = ["pending_admin_approval", "pending"];

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function requireAdmin(req) {
  if (req.user?.role !== "admin") {
    throw httpError(403, "Only an admin can process refund requests");
  }
}

function failureMessage(error) {
  return String(
    error?.error?.description
    || error?.description
    || error?.message
    || "Razorpay refund initiation failed"
  );
}

async function sendRefundUpdate(kind, item, settings) {
  try {
    await sendRefundEmail(kind, item, item.booking, item.customer, settings);
  } catch (error) {
    console.warn("Refund email failed", {
      refundRequestId: item.id,
      kind,
      message: error.message,
    });
  }
}

async function listRefunds(req, res) {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const items = await RefundRequest.findAll({ where, include, order: [["requested_at", "DESC"]] });
  return res.json({ success: true, data: items, total: items.length });
}

async function getRefund(req, res) {
  const item = await RefundRequest.findByPk(req.params.id, { include });
  if (!item) return res.status(404).json({ success: false, error: "Refund request not found" });
  return res.json({ success: true, data: item });
}

async function approveRefund(req, res) {
  requireAdmin(req);

  const transaction = await sequelize.transaction();
  let refundRequestId;
  let bookingId;
  let paymentId;
  let refundAmount;

  try {
    const item = await RefundRequest.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw httpError(404, "Refund request not found");

    const booking = await Booking.findByPk(item.booking_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw httpError(404, "Booking not found");
    if (booking.status !== "cancelled") {
      throw httpError(409, "The booking must be cancelled before its refund can be processed");
    }
    if (booking.payment_status === "refunded" || booking.refund_status === "completed") {
      throw httpError(409, "This booking has already been refunded");
    }
    if (!PENDING_STATUSES.includes(item.status)) {
      throw httpError(409, `Refund cannot be processed from ${item.status} status`);
    }
    if (item.razorpay_refund_id || item.refund_transaction_id) {
      throw httpError(409, "A Razorpay refund has already been created for this request");
    }

    refundAmount = Number(item.refund_amount);
    const paidAmount = Number(item.amount_paid);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw httpError(400, "Refund amount must be greater than zero");
    }
    if (!Number.isFinite(paidAmount) || refundAmount > paidAmount + 0.005) {
      throw httpError(400, "Refund amount cannot exceed the paid amount");
    }

    paymentId = item.razorpay_payment_id
      || item.payment_reference_id
      || booking.razorpay_payment_id;
    if (!paymentId) {
      throw httpError(400, "Original Razorpay payment ID is required");
    }

    const processedAt = new Date();
    const priorRefundStatus = item.status;
    await item.update({
      status: "processing",
      processed_by_admin_id: req.user.id,
      processed_at: processedAt,
      approved_at: processedAt,
      razorpay_payment_id: paymentId,
      failure_reason: null,
      updated_at: processedAt,
    }, { transaction });
    await booking.update({ refund_status: "processing" }, { transaction });
    await writeAudit({
      action: "REFUND_APPROVED",
      entityType: "refund",
      entityId: item.id,
      actor: req.user,
      module: "refund",
      message: `Admin approved refund request #${item.id}`,
      metadata: {
        refundRequestId: item.id,
        bookingId: booking.id,
        refundAmount,
        razorpayPaymentId: paymentId,
        performedBy: req.user.id,
        role: req.user.role,
        timestampUTC: processedAt.toISOString(),
        timestampIST: formatToIST(processedAt),
        ipAddress: req.ip || req.headers?.["x-forwarded-for"] || null,
        userAgent: req.headers?.["user-agent"] || null,
        oldValue: { status: priorRefundStatus },
        newValue: { status: "processing" },
      },
      transaction,
    });

    refundRequestId = item.id;
    bookingId = booking.id;
    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }

  let settings = {};
  try {
    settings = await HotelSetting.findByPk(1) || {};
  } catch (error) {
    console.warn("Hotel settings lookup failed during refund processing", {
      refundRequestId,
      message: error.message,
    });
  }

  try {
    const gatewayRefund = await refundPayment(
      paymentId,
      Math.round(refundAmount * 100)
    );
    if (gatewayRefund?.mocked) {
      throw new Error("Razorpay is not configured for actual refunds");
    }
    if (!gatewayRefund?.id) {
      throw new Error("Razorpay did not return a refund reference");
    }

    const gatewayStatus = String(gatewayRefund.status || "pending").toLowerCase();
    const status = gatewayStatus === "processed"
      ? "completed"
      : gatewayStatus === "failed"
        ? "failed"
        : "processing";
    const completedAt = status === "completed" ? new Date() : null;
    const failedReason = status === "failed"
      ? String(gatewayRefund.error_description || "Razorpay marked the refund as failed")
      : null;

    await RefundRequest.update({
      status,
      razorpay_payment_id: paymentId,
      razorpay_refund_id: gatewayRefund.id,
      refund_transaction_id: gatewayRefund.id,
      completed_at: completedAt,
      refunded_at: completedAt,
      failure_reason: failedReason,
      updated_at: new Date(),
    }, { where: { id: refundRequestId } });
    await Booking.update({
      refund_status: status,
      ...(status === "completed" ? { payment_status: "refunded" } : {}),
    }, { where: { id: bookingId } });
    if (status === "completed") {
      await updateCouponUsageForBooking(bookingId, {
        payment_status: "refunded",
        booking_status: "refunded",
      });
    }

    const item = await RefundRequest.findByPk(refundRequestId, { include });
    if (status === "failed") {
      await sendRefundUpdate("failed", item, settings);
      return res.status(502).json({
        success: false,
        data: item,
        error: "Razorpay refund failed",
      });
    }

    await sendRefundUpdate("processing", item, settings);
    if (status === "completed") {
      await sendRefundUpdate("completed", item, settings);
    }

    return res.json({
      success: true,
      data: item,
      message: status === "completed"
        ? "Razorpay refund completed"
        : "Razorpay refund initiated and is processing",
    });
  } catch (error) {
    const reason = failureMessage(error);
    await RefundRequest.update({
      status: "failed",
      failure_reason: reason,
      updated_at: new Date(),
    }, { where: { id: refundRequestId } });
    await Booking.update(
      { refund_status: "failed" },
      { where: { id: bookingId } }
    );

    const item = await RefundRequest.findByPk(refundRequestId, { include });
    if (item) await sendRefundUpdate("failed", item, settings);
    return res.status(502).json({
      success: false,
      data: item,
      error: "Refund initiation failed",
      message: reason,
    });
  }
}

async function rejectRefund(req, res) {
  requireAdmin(req);

  const reason = String(req.body.reason || "").trim();
  if (reason.length < 3) {
    return res.status(400).json({ success: false, error: "Rejection reason is required" });
  }

  const transaction = await sequelize.transaction();
  let refundRequestId;
  try {
    const item = await RefundRequest.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw httpError(404, "Refund request not found");
    if (!PENDING_STATUSES.includes(item.status)) {
      throw httpError(409, `Refund cannot be rejected from ${item.status} status`);
    }

    const processedAt = new Date();
    await item.update({
      status: "rejected",
      rejection_reason: reason,
      rejected_at: processedAt,
      processed_by_admin_id: req.user.id,
      processed_at: processedAt,
      updated_at: processedAt,
    }, { transaction });
    await Booking.update(
      { refund_status: "rejected" },
      { where: { id: item.booking_id }, transaction }
    );
    refundRequestId = item.id;
    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }

  const item = await RefundRequest.findByPk(refundRequestId, { include });
  await sendRefundUpdate("rejected", item, await HotelSetting.findByPk(1));
  return res.json({ success: true, data: item, message: "Refund request rejected" });
}

module.exports = { approveRefund, getRefund, listRefunds, rejectRefund };
