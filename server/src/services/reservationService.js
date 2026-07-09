const { Op } = require("sequelize");
const {
  Booking,
  Customer,
  HotelSetting,
  Notification,
  PaymentTransaction,
  RefundRequest,
  Room,
  sequelize,
} = require("../../models");
const { calculateCancellationSummary } = require("./cancellationService");
const { updateCouponUsageForBooking } = require("./couponService");
const { sendNoShowCancellationEmail } = require("./emailService");
const { writeAudit } = require("./auditService");
const { formatToIST } = require("../utils/dateHelpers");

const NO_SHOW_GRACE_MINUTES = 60;
const NO_SHOW_CANCELLATION_TYPE = "no_show_auto_cancel";
const NO_SHOW_REASON = "Auto-cancelled due to no-show after 1 hour grace period";
const ACTIVE_NO_SHOW_STATUSES = ["confirmed", "reserved"];

function getAutoCancelDeadline(booking) {
  if (!booking?.autoCancelAt) return null;
  const deadline = new Date(booking.autoCancelAt);
  return Number.isNaN(deadline.getTime()) ? null : deadline;
}

function getNoShowEligibility(booking, now = new Date()) {
  if (!booking) return { eligible: false, reason: "not_found" };
  if (booking.cancellationType === NO_SHOW_CANCELLATION_TYPE || booking.autoCancelledAt) {
    return { eligible: false, reason: "already_auto_cancelled" };
  }
  if (!ACTIVE_NO_SHOW_STATUSES.includes(String(booking.status))) {
    return { eligible: false, reason: `status_${booking.status || "unknown"}` };
  }
  if (booking.actual_checkin_time) {
    return { eligible: false, reason: "already_checked_in" };
  }
  if (booking.cancelled_at) {
    return { eligible: false, reason: "already_cancelled" };
  }

  const deadline = getAutoCancelDeadline(booking);
  if (!deadline) {
    return { eligible: false, reason: "deadline_missing" };
  }
  if (now.getTime() < deadline.getTime()) {
    return { eligible: false, reason: "grace_period_active", deadline };
  }

  return { eligible: true, reason: "deadline_passed", deadline };
}

function cancelledByValue(actor) {
  if (!actor || actor.role === "system") return "system";
  return `${actor.role}:${actor.id}`;
}

async function processNoShowBooking(
  bookingId,
  { now = new Date(), actor = { role: "system", id: null } } = {}
) {
  const preflight = await Booking.findByPk(bookingId);
  const preflightEligibility = getNoShowEligibility(preflight, now);
  if (!preflightEligibility.eligible) {
    return {
      bookingId: Number(bookingId),
      cancelled: false,
      ...preflightEligibility,
    };
  }

  const transaction = await sequelize.transaction();
  let emailPayload = null;

  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: "customer", required: false },
        { model: Room, as: "room", required: false },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const eligibility = getNoShowEligibility(booking, now);
    if (!eligibility.eligible) {
      await transaction.commit();
      return {
        bookingId: Number(bookingId),
        cancelled: false,
        ...eligibility,
      };
    }

    const settings = await HotelSetting.findByPk(1, { transaction });
    const summary = calculateCancellationSummary(booking, settings, now);
    let refundRequest = null;
    let refundRequestCreated = false;

    if (summary.refundAmount > 0) {
      [refundRequest, refundRequestCreated] = await RefundRequest.findOrCreate({
        where: { booking_id: booking.id },
        defaults: {
          booking_id: booking.id,
          customer_id: booking.customer_id,
          customer_name: booking.customer?.full_name || "Customer",
          customer_email: booking.customer?.email || null,
          customer_phone: booking.customer?.phone || null,
          total_booking_amount: summary.totalAmount,
          amount_paid: summary.paidAmount,
          cancellation_charge: summary.cancellationCharge,
          refund_amount: summary.refundAmount,
          refund_reason: "No-show auto-cancellation",
          cancellation_policy_applied: summary.policyApplied,
          status: "pending_admin_approval",
          payment_reference_id: booking.razorpay_payment_id || null,
          razorpay_payment_id: booking.razorpay_payment_id || null,
          hotel_upi_id: settings?.upi_id || null,
          requested_at: now,
          created_at: now,
          updated_at: now,
        },
        transaction,
      });
    }

    const refundStatus = refundRequest?.status || (
      summary.refundAmount > 0 ? "pending_admin_approval" : "not_applicable"
    );
    await booking.update({
      status: "cancelled",
      cancelled_at: now,
      cancellation_reason: NO_SHOW_REASON,
      cancellationType: NO_SHOW_CANCELLATION_TYPE,
      autoCancellationReason: NO_SHOW_REASON,
      autoCancelledAt: now,
      cancellation_charge: summary.cancellationCharge,
      refund_amount: summary.refundAmount,
      refund_status: refundStatus,
      refundRequestCreatedAt: refundRequest?.requested_at || (refundRequestCreated ? now : null),
      cancellation_policy_applied: summary.policyApplied,
      cancelled_by: cancelledByValue(actor),
    }, { transaction });

    await updateCouponUsageForBooking(
      booking.id,
      { booking_status: "cancelled" },
      transaction
    );
    await PaymentTransaction.update({
      status: "cancelled",
      updated_at: now,
      remarks: NO_SHOW_REASON,
    }, {
      where: {
        booking_id: booking.id,
        status: "pending",
      },
      transaction,
    });

    if (booking.room?.status === "occupied") {
      const activeCheckedInCount = await Booking.count({
        where: {
          room_id: booking.room_id,
          status: "checked_in",
          id: { [Op.ne]: booking.id },
        },
        transaction,
      });
      if (activeCheckedInCount === 0) {
        await booking.room.update({ status: "available" }, { transaction });
      }
    }

    await Notification.bulkCreate([
      {
        target_role: "customer",
        target_id: booking.customer_id,
        title: "Booking Cancelled - No Show",
        message: `${booking.booking_ref} was auto-cancelled after the 1 hour check-in grace period. Refund status: ${refundStatus}.`,
        type: "booking",
      },
      {
        target_role: "receptionist",
        title: "No-show Booking Auto-cancelled",
        message: `${booking.booking_ref} was cancelled as a no-show and no longer blocks room availability.`,
        type: "booking",
      },
      {
        target_role: "admin",
        title: summary.refundAmount > 0 ? "No-show Refund Review Required" : "No-show Booking Cancelled",
        message: summary.refundAmount > 0
          ? `${booking.booking_ref} has a no-show refund request pending admin approval.`
          : `${booking.booking_ref} was cancelled as a no-show with no refund applicable.`,
        type: "booking",
      },
    ], { transaction });

    await writeAudit({
      action: "booking_auto_cancelled_no_show",
      entityType: "booking",
      entityId: booking.id,
      actor,
      metadata: {
        autoCancelAt: eligibility.deadline.toISOString(),
        autoCancelledAt: now.toISOString(),
        timestampUTC: now.toISOString(),
        timestampIST: formatToIST(now),
        refundAmount: summary.refundAmount,
        refundRequestId: refundRequest?.id || null,
        refundRequestCreated,
        policy: summary.policyApplied,
      },
      transaction,
      level: "warning",
      message: NO_SHOW_REASON,
    });

    await transaction.commit();
    emailPayload = {
      booking,
      customer: booking.customer,
      settings,
      summary,
      refundStatus,
    };

    if (emailPayload.customer?.email) {
      try {
        await sendNoShowCancellationEmail(emailPayload);
      } catch (error) {
        console.warn("No-show cancellation email failed", {
          bookingId: booking.id,
          message: error.message,
        });
      }
    }

    return {
      bookingId: booking.id,
      booking,
      cancelled: true,
      cancellationType: NO_SHOW_CANCELLATION_TYPE,
      refundRequest,
      refundRequestCreated,
      refundStatus,
      summary,
    };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
}

async function autoCancelOverdueBookings(now = new Date()) {
  const candidates = await Booking.findAll({
    where: {
      status: { [Op.in]: ACTIVE_NO_SHOW_STATUSES },
      actual_checkin_time: null,
      cancelled_at: null,
      autoCancelAt: { [Op.lte]: now },
    },
    attributes: ["id"],
    order: [["autoCancelAt", "ASC"]],
  });

  const results = [];
  for (const candidate of candidates) {
    try {
      results.push(await processNoShowBooking(candidate.id, { now }));
    } catch (error) {
      results.push({
        bookingId: candidate.id,
        cancelled: false,
        reason: "processing_error",
        error: error.message,
      });
    }
  }

  return results;
}

// Backward-compatible export for the existing scheduler/controller imports.
async function autoCancelOverdueReservations(now = new Date()) {
  const results = await autoCancelOverdueBookings(now);
  return results.filter((item) => item.cancelled).map((item) => item.bookingId);
}

module.exports = {
  ACTIVE_NO_SHOW_STATUSES,
  NO_SHOW_CANCELLATION_TYPE,
  NO_SHOW_GRACE_MINUTES,
  NO_SHOW_REASON,
  autoCancelOverdueBookings,
  autoCancelOverdueReservations,
  getNoShowEligibility,
  processNoShowBooking,
};
