const BOOKING_STATUS_KEYS = {
  pending: "statuses.booking.pending",
  upcoming: "statuses.booking.upcoming",
  confirmed: "statuses.booking.confirmed",
  reserved: "statuses.booking.reserved",
  checked_in: "statuses.booking.checked_in",
  checked_out: "statuses.booking.checked_out",
  early_checked_out: "statuses.booking.early_checked_out",
  cancelled: "statuses.booking.cancelled",
  cancelled_no_show: "statuses.booking.cancelled_no_show",
  completed: "statuses.booking.completed",
  payment_pending: "statuses.booking.payment_pending",
};

const ACTION_LABEL_KEYS = {
  "Ready for Check In": "statuses.booking.ready_check_in",
  "Ready for Check Out": "statuses.booking.ready_check_out",
  "Ready for Early Check-Out": "statuses.booking.ready_early_checkout",
  "Already Checked In": "statuses.booking.already_checked_in",
  "Checked Out": "statuses.booking.checked_out",
  "Early Checked Out": "statuses.booking.early_checked_out",
  "Cancelled": "statuses.booking.cancelled",
  "Cancelled - No Show": "statuses.booking.cancelled_no_show",
  "Payment Pending": "statuses.booking.payment_pending",
  "Upcoming": "statuses.booking.upcoming",
  "Check-In Date Passed": "statuses.booking.check_in_passed",
  "No-Show Deadline Passed": "statuses.booking.no_show_deadline",
  "Awaiting Confirmation": "statuses.booking.awaiting_confirmation",
};

export function bookingStatusLabel(t, booking) {
  if (booking?.status === "checked_out" && booking?.is_early_checkout) {
    return t("statuses.booking.early_checked_out");
  }
  if (booking?.cancellation_type === "no_show_auto_cancel" || booking?.auto_cancelled_at) {
    return t("statuses.booking.cancelled_no_show");
  }
  const key = BOOKING_STATUS_KEYS[String(booking?.status || "").toLowerCase()];
  return key ? t(key) : String(booking?.status || "").replaceAll("_", " ");
}

export function bookingActionLabel(t, label) {
  const key = ACTION_LABEL_KEYS[label];
  return key ? t(key) : label;
}

export function bookingActionReasonLabel(t, reason, booking) {
  const value = String(reason || "");
  if (!value) return "";
  if (value === "Booking has been cancelled due to no-show.") return t("bookingUi.noShowCancelled");
  if (value === "This booking was cancelled.") return t("ops.bookingCancelled");
  if (value.startsWith("Early check-out is available")) {
    return t("ops.earlyCheckoutAvailable", { date: booking?.check_out || "" });
  }
  if (value.startsWith("Booked check-out date was")) {
    return t("ops.bookedCheckoutWas", { date: booking?.check_out || "" });
  }
  if (value.includes("check-in grace period has ended")) return t("ops.gracePeriodEnded");
  if (value.startsWith("Check-in available on")) {
    return t("ops.checkInAvailable", { date: booking?.check_in || "" });
  }
  if (value.startsWith("Booked check-in date was")) {
    return t("ops.bookedCheckInWas", { date: booking?.check_in || "" });
  }
  if (value === "Confirm the exact remaining payment before check-in.") return t("ops.confirmExactPayment");
  if (value === "Booking must be confirmed before check-in.") return t("ops.confirmBeforeCheckIn");
  return t("shared.actionFailed");
}

export function roomStatusLabel(t, status) {
  const normalized = String(status || "").toLowerCase();
  const key = `statuses.room.${normalized}`;
  return ["available", "occupied", "cleaning", "maintenance"].includes(normalized)
    ? t(key)
    : String(status || "");
}

export function paymentStatusLabel(t, status) {
  const normalized = String(status || "").toLowerCase();
  const supported = ["paid", "pending", "partially_paid", "failed", "refunded", "pay_at_hotel"];
  return supported.includes(normalized)
    ? t(`statuses.payment.${normalized}`)
    : String(status || "").replaceAll("_", " ");
}

export function feedbackStatusLabel(t, status) {
  const normalized = String(status || "").toLowerCase();
  return ["pending", "published", "approved", "rejected"].includes(normalized)
    ? t(`statuses.feedback.${normalized}`)
    : String(status || "");
}

export function roomCategoryLabel(t, category) {
  const normalized = String(category || "").trim().toLowerCase();
  const supported = ["standard", "deluxe", "regular", "family", "presidential", "economy", "suite"];
  return supported.includes(normalized) ? t(`room.${normalized}`) : String(category || "");
}
