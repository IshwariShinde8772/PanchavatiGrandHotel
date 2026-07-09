export const HOTEL_TIME_ZONE = "Asia/Kolkata";

export const DATE_FILTER_OPTIONS = [
  { label: "All Dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Week", value: "this_week" },
  { label: "Next Week", value: "next_week" },
  { label: "This Month", value: "this_month" },
];

function dateParts(value = new Date(), timeZone = HOTEL_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function dateTimeParts(value = new Date(), timeZone = HOTEL_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getHotelDate(value = new Date()) {
  const parts = dateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

export function getHotelTimeInput(value = new Date()) {
  const parts = dateTimeParts(value);
  return parts ? `${parts.hour}:${parts.minute}` : "";
}

export function formatHotelTime(value) {
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(value || ""));
  if (timeMatch) {
    const date = new Date(Date.UTC(2000, 0, 1, Number(timeMatch[1]), Number(timeMatch[2])));
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOTEL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatHotelDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOTEL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatted.replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())} IST`;
}

export function formatToIST(value) {
  return formatHotelDateTime(value);
}

export function getCurrentISTDateTime(value = new Date()) {
  return formatHotelDateTime(value);
}

export function formatISTDateTimeForReport(value) {
  return formatHotelDateTime(value);
}

export function formatISTDateForUI(value) {
  return formatBookedDate(value);
}

export function isNoShowCancellation(booking) {
  return booking?.cancellation_type === "no_show_auto_cancel"
    || Boolean(booking?.auto_cancelled_at);
}

export function formatBookingStatus(booking) {
  if (isNoShowCancellation(booking)) return "Cancelled - No Show";
  if (booking?.status === "checked_out" && booking?.is_early_checkout) {
    return "Early Checked Out";
  }
  return String(booking?.status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function canMarkBookingNoShow(booking, now = new Date()) {
  if (
    !booking?.auto_cancel_at
    || !["confirmed", "reserved"].includes(String(booking.status))
    || booking.actual_checkin_time
    || booking.cancelled_at
  ) {
    return false;
  }
  const deadline = new Date(booking.auto_cancel_at);
  return !Number.isNaN(deadline.getTime()) && now.getTime() >= deadline.getTime();
}

export function formatBookedDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return "Not available";

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function isHotelDateToday(value) {
  return String(value || "").slice(0, 10) === getHotelDate();
}

export function getBookingActionState(booking) {
  if (!booking) {
    return {
      label: "Unavailable",
      canCheckIn: false,
      canCheckOut: false,
      canEarlyCheckOut: false,
      reason: "",
    };
  }

  const status = String(booking.status || "").toLowerCase();
  const paymentComplete = booking.payment_status === "paid"
    && Number(booking.remaining_amount || 0) <= 0;
  const checkInToday = isHotelDateToday(booking.check_in);
  const checkOutToday = isHotelDateToday(booking.check_out);
  const today = getHotelDate();

  if (status === "cancelled") {
    return {
      label: isNoShowCancellation(booking) ? "Cancelled - No Show" : "Cancelled",
      canCheckIn: false,
      canCheckOut: false,
      canEarlyCheckOut: false,
      reason: isNoShowCancellation(booking)
        ? "Booking has been cancelled due to no-show."
        : "This booking was cancelled.",
    };
  }
  if (status === "checked_out") {
    return {
      label: booking.is_early_checkout ? "Early Checked Out" : "Checked Out",
      canCheckIn: false,
      canCheckOut: false,
      canEarlyCheckOut: false,
      reason: "",
    };
  }
  if (status === "checked_in") {
    const earlyEligible = Boolean(booking.actual_checkin_time) && booking.check_out > today;
    return {
      label: checkOutToday ? "Ready for Check Out" : earlyEligible ? "Ready for Early Check-Out" : "Already Checked In",
      canCheckIn: false,
      canCheckOut: checkOutToday,
      canEarlyCheckOut: earlyEligible,
      reason: checkOutToday
        ? ""
        : earlyEligible
          ? `Early check-out is available before the booked date of ${formatBookedDate(booking.check_out)}.`
          : `Booked check-out date was ${formatBookedDate(booking.check_out)}.`,
    };
  }
  if (canMarkBookingNoShow(booking)) {
    return {
      label: "No-Show Deadline Passed",
      canCheckIn: false,
      canCheckOut: false,
      reason: "The 1 hour check-in grace period has ended.",
    };
  }
  if (!checkInToday) {
    return {
      label: booking.check_in > today ? "Upcoming" : "Check-In Date Passed",
      canCheckIn: false,
      canCheckOut: false,
      reason: booking.check_in > today
        ? `Check-in available on ${formatBookedDate(booking.check_in)}.`
        : `Booked check-in date was ${formatBookedDate(booking.check_in)}.`,
    };
  }
  if (!paymentComplete) {
    return {
      label: "Payment Pending",
      canCheckIn: false,
      canCheckOut: false,
      reason: "Confirm the exact remaining payment before check-in.",
    };
  }
  if (status !== "confirmed") {
    return {
      label: "Awaiting Confirmation",
      canCheckIn: false,
      canCheckOut: false,
      reason: "Booking must be confirmed before check-in.",
    };
  }

  return {
    label: "Ready for Check In",
    canCheckIn: true,
    canCheckOut: false,
    canEarlyCheckOut: false,
    reason: "",
  };
}
