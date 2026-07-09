import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import StarRating from "../../components/forms/StarRating";
import { useDebounce } from "../../hooks/useDebounce";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  canMarkBookingNoShow,
  DATE_FILTER_OPTIONS,
  formatBookedDate,
  formatHotelDateTime,
  formatHotelTime,
  getBookingActionState,
  getCurrentISTDateTime,
  isNoShowCancellation,
} from "../../utils/hotelDate";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { openSecurePhoto } from "../../utils/securePhoto";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import {
  bookingActionLabel,
  bookingActionReasonLabel,
  bookingStatusLabel,
  paymentStatusLabel,
  roomCategoryLabel,
} from "../../utils/i18nLabels";

const statusOptions = [
  { label: "Actionable + Completed + Cancelled", value: "pending,reserved,confirmed,checked_in,checked_out,cancelled" },
  { label: "Confirmed + Checked In", value: "confirmed,checked_in" },
  { label: "Payment Pending", value: "pending,reserved" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "All Statuses", value: "" },
];

const paymentMethodOptions = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "UPI", value: "upi" },
  { label: "Online", value: "online" },
  { label: "Pay Later", value: "pay_later" },
];

const checkoutPaymentOptions = [
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
];

const emptyCheckoutForm = {
  payment_method: "cash",
  payment_status: "paid",
  extras: [{ label: "", amount: "" }],
  rating: 0,
  feedback_text: "",
  internal_note: "",
  reason: "",
};

function formatStatus(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(label) {
  if (["Ready for Check In", "Ready for Check Out", "Ready for Early Check-Out"].includes(label)) return "bg-green-50 text-green-700";
  if (["Payment Pending", "Upcoming", "Already Checked In"].includes(label)) return "bg-amber-50 text-amber-700";
  if (["Checked Out", "Early Checked Out"].includes(label)) return "bg-blue-50 text-blue-700";
  if (["Cancelled", "Cancelled - No Show", "Check-In Date Passed", "No-Show Deadline Passed"].includes(label)) return "bg-red-50 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function CheckInOut() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get("ref") || "",
    status: "pending,reserved,confirmed,checked_in,checked_out,cancelled",
    date_filter: searchParams.get("dateFilter") || "today",
  });
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState("normal");
  const [checkInForm, setCheckInForm] = useState({
    id_verified: true,
    payment_method: "cash",
    id_verification_note: "",
  });
  const [checkOutForm, setCheckOutForm] = useState(emptyCheckoutForm);
  const [paymentConfirmation, setPaymentConfirmation] = useState({
    amount: "",
    payment_mode: "hotel_qr",
    transaction_reference: "",
  });
  const debouncedSearch = useDebounce(filters.q, 300);

  const { data, isLoading } = useQuery({
    queryKey: [
      "receptionist-checkinout-bookings",
      debouncedSearch,
      filters.status,
      filters.date_filter,
      page,
    ],
    queryFn: () => bookingAPI.receptionistList({
      q: debouncedSearch || undefined,
      status: filters.status || undefined,
      date_filter: filters.date_filter === "all" ? undefined : filters.date_filter,
      date_scope: "check_in_out",
      page,
      limit: DEFAULT_PAGE_SIZE,
    }),
  });

  const bookings = data?.data || [];
  const pagination = getPaginationMeta(data, bookings.length);
  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedId) || bookings[0] || null,
    [bookings, selectedId]
  );
  const actionState = getBookingActionState(selectedBooking);
  const actionLabel = bookingActionLabel(t, actionState.label);
  const localizedPaymentMethodOptions = paymentMethodOptions.map((option) => ({
    ...option,
    label: {
      cash: t("reception.cash"),
      card: t("reception.card"),
      upi: "UPI",
      online: t("reception.online"),
      pay_later: t("reception.payLater"),
    }[option.value],
  }));
  const localizedCheckoutPaymentOptions = checkoutPaymentOptions.map((option) => ({
    ...option,
    label: paymentStatusLabel(t, option.value),
  }));
  const canMarkNoShow = canMarkBookingNoShow(selectedBooking);
  const remainingAmount = Number(selectedBooking?.remaining_amount || 0);
  const paymentPending = Boolean(selectedBooking)
    && selectedBooking.status !== "checked_in"
    && selectedBooking.status !== "checked_out"
    && selectedBooking.status !== "cancelled"
    && (selectedBooking.payment_status !== "paid" || remainingAmount > 0);
  const pendingExtension = (selectedBooking?.extensionRequests || []).find((extension) => {
    const payable = Number(extension.extension_payable_amount ?? extension.extra_amount ?? 0);
    const remaining = Number(
      extension.extension_remaining_amount
      ?? Math.max(payable - Number(extension.extension_paid_amount || 0), 0)
    );
    return extension.status !== "rejected"
      && payable > 0
      && (extension.payment_status !== "paid" || remaining > 0);
  });

  const updateCachedBooking = (id, responseBooking) => {
    if (!responseBooking) return;
    queryClient.setQueriesData(
      { queryKey: ["receptionist-checkinout-bookings"] },
      (current) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: current.data.map((booking) => (
            booking.id === id ? { ...booking, ...responseBooking } : booking
          )),
        };
      }
    );
  };

  const invalidateAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-checkinout-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["admin-feedbacks"] });
  };

  const checkInMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.checkIn(id, payload),
    onSuccess: (response, variables) => {
      updateCachedBooking(variables.id, response?.data);
      invalidateAfterMutation();
      toast.success(t("reception.checkInSuccess"));
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("shared.actionFailed"))),
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, payload, early }) => (
      early ? bookingAPI.earlyCheckOut(id, payload) : bookingAPI.checkOut(id, payload)
    ),
    onSuccess: (response, variables) => {
      updateCachedBooking(variables.id, response?.data?.booking);
      setCheckoutOpen(false);
      setCheckOutForm(emptyCheckoutForm);
      invalidateAfterMutation();
      toast.success(variables.early
        ? t("reception.earlyCheckoutSuccess")
        : t("reception.checkoutSuccess"));
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("shared.actionFailed"))),
  });

  const verifyIdMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.verifyId(id, payload),
    onSuccess: (response, variables) => {
      updateCachedBooking(variables.id, response?.data);
      invalidateAfterMutation();
      toast.success(response?.data?.id_verification_status === "rejected"
        ? t("reception.rejectId")
        : t("reception.verifyId"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.confirmReservation(id, payload),
    onSuccess: (response, variables) => {
      updateCachedBooking(variables.id, response?.data);
      invalidateAfterMutation();
      toast.success(t("reception.confirmPayment"));
      setPaymentConfirmation({ amount: "", payment_mode: "hotel_qr", transaction_reference: "" });
    },
    onError: () => toast.error(t("bookingUi.paymentFailed")),
  });

  const markNoShowMutation = useMutation({
    mutationFn: (id) => bookingAPI.receptionistMarkNoShow(id),
    onSuccess: () => {
      invalidateAfterMutation();
      toast.success(t("bookingUi.noShowCancelled"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const submitPayment = () => {
    const amount = Number(paymentConfirmation.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("shared.actionFailed"));
      return;
    }
    if (Math.round(amount * 100) !== Math.round(remainingAmount * 100)) {
      toast.error(t("reception.exactAmountRequired", { amount: formatCurrency(remainingAmount) }));
      return;
    }
    if (paymentConfirmation.payment_mode === "hotel_qr" && !paymentConfirmation.transaction_reference.trim()) {
      toast.error(t("reception.transactionReference"));
      return;
    }

    confirmPaymentMutation.mutate({
      id: selectedBooking.id,
      payload: {
        ...paymentConfirmation,
        amount,
        transaction_reference: paymentConfirmation.transaction_reference.trim() || undefined,
      },
    });
  };

  const submitCheckIn = () => {
    if (!selectedBooking || !actionState.canCheckIn) {
      toast.error(bookingActionReasonLabel(t, actionState.reason, selectedBooking) || t("shared.actionFailed"));
      return;
    }

    checkInMutation.mutate({
      id: selectedBooking.id,
      payload: {
        id_verified: Boolean(checkInForm.id_verified),
        id_verification_note: checkInForm.id_verification_note,
        payment_method: checkInForm.payment_method,
      },
    });
  };

  const submitCheckOut = () => {
    const isEarly = checkoutMode === "early";
    const eligible = isEarly ? actionState.canEarlyCheckOut : actionState.canCheckOut;
    if (!selectedBooking || !eligible) {
      toast.error(bookingActionReasonLabel(t, actionState.reason, selectedBooking) || t("shared.actionFailed"));
      return;
    }
    if (pendingExtension) {
      toast.error("Extension payment must be confirmed before generating final bill.");
      return;
    }
    if (isEarly && checkOutForm.reason.trim().length < 3) {
      toast.error(t("reception.reasonRequired"));
      return;
    }
    if (!checkOutForm.rating) {
      toast.error(t("reception.feedbackRequired"));
      return;
    }
    if (checkOutForm.feedback_text.trim().length < 3) {
      toast.error(t("reception.feedbackRequired"));
      return;
    }

    const extras = checkOutForm.extras
      .filter((item) => item.label.trim() && item.amount !== "")
      .map((item) => ({ label: item.label.trim(), amount: Number(item.amount) }));
    if (extras.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) {
      toast.error("Extra charge amounts must be valid decimal values.");
      return;
    }

    checkOutMutation.mutate({
      id: selectedBooking.id,
      early: isEarly,
      payload: {
        extras,
        payment_method: checkOutForm.payment_method,
        payment_status: checkOutForm.payment_status,
        ...(isEarly ? {
          reason: checkOutForm.reason.trim(),
          internal_note: checkOutForm.internal_note.trim() || undefined,
        } : {}),
        feedback: {
          rating: checkOutForm.rating,
          feedback_text: checkOutForm.feedback_text.trim(),
          internal_note: checkOutForm.internal_note.trim() || undefined,
        },
      },
    });
  };

  const openCheckout = (mode) => {
    setCheckoutMode(mode);
    setCheckOutForm(emptyCheckoutForm);
    setCheckoutOpen(true);
  };

  const setFilter = (field, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("reception.checkInOutEyebrow")}
        title={t("reception.checkInOutTitle")}
        description={t("reception.checkInOutDescription")}
        actions={<Button as={Link} to="/receptionist/walk-in">{t("reception.createManualBooking")}</Button>}
      />

      <div className="section-card grid gap-4 p-5 md:grid-cols-3">
        <InputField
          label={t("reception.searchBooking")}
          value={filters.q}
          onChange={(event) => setFilter("q", event.target.value)}
          placeholder={t("reception.searchBooking")}
        />
        <SelectField
          label={t("reception.dateRange")}
          value={filters.date_filter}
          onChange={(event) => setFilter("date_filter", event.target.value)}
          options={DATE_FILTER_OPTIONS.map((option) => ({
            ...option,
            label: t({
              all: "shared.allDates",
              today: "shared.today",
              tomorrow: "shared.tomorrow",
              this_week: "shared.thisWeek",
              next_week: "shared.nextWeek",
              this_month: "shared.thisMonth",
            }[option.value] || "shared.allDates"),
          }))}
        />
        <SelectField
          label={t("common.status")}
          value={filters.status}
          onChange={(event) => setFilter("status", event.target.value)}
          options={[
            { label: t("shared.allStatuses"), value: statusOptions[0].value },
            { label: `${t("statuses.booking.confirmed")} + ${t("statuses.booking.checked_in")}`, value: statusOptions[1].value },
            { label: t("statuses.booking.payment_pending"), value: statusOptions[2].value },
            { label: t("statuses.booking.checked_in"), value: "checked_in" },
            { label: t("statuses.booking.checked_out"), value: "checked_out" },
            { label: t("shared.allStatuses"), value: "" },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="section-card divide-y divide-divider overflow-hidden">
          {isLoading ? (
            <p className="p-5 text-sm text-mutedText">{t("common.loading")}</p>
          ) : bookings.length === 0 ? (
            <p className="p-5 text-sm text-mutedText">{t("shared.noResults")}</p>
          ) : bookings.map((booking) => {
            const state = getBookingActionState(booking);
            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedId(booking.id)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedBooking?.id === booking.id ? "bg-green-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{booking.booking_ref || `Booking #${booking.id}`}</p>
                    <p className="text-sm text-mutedText">
                      {booking.customer?.full_name || "Guest"} - Room {booking.room?.room_number || "N/A"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusTone(state.label)}`}>
                    {bookingActionLabel(t, state.label)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-mutedText">
                  {formatBookedDate(booking.check_in)} at {formatHotelTime(booking.check_in_time)} to {formatBookedDate(booking.check_out)}
                </p>
                <p className="text-xs text-mutedText">{t("bookingUi.autoCancelDeadline")}: {formatHotelDateTime(booking.auto_cancel_at)}</p>
                <p className="text-xs text-mutedText">
                  {t("common.payment")}: {paymentStatusLabel(t, booking.payment_status)} - {t("shared.remainingAmount")}: {formatCurrency(booking.remaining_amount)}
                </p>
                {booking.status === "checked_in" ? (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    {state.canEarlyCheckOut ? t("reception.eligible") : bookingActionLabel(t, state.label)}
                  </p>
                ) : booking.status === "checked_out" && booking.is_early_checkout ? (
                  <p className="mt-1 text-xs font-semibold text-blue-700">{t("statuses.booking.early_checked_out")}</p>
                ) : null}
              </button>
            );
          })}
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>

        <div className="space-y-6">
          {!selectedBooking ? (
            <div className="section-card p-5 text-sm text-mutedText">{t("shared.select")}</div>
          ) : (
            <>
              <div className="section-card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedBooking.booking_ref || `Booking #${selectedBooking.id}`}</p>
                    <p className="text-sm text-mutedText">
                      {selectedBooking.customer?.full_name || t("shared.notAvailable")} - {t("ops.room")} {selectedBooking.room?.room_number || t("shared.notAvailable")} ({selectedBooking.room?.name || roomCategoryLabel(t, selectedBooking.room?.category) || t("shared.notAvailable")})
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(actionState.label)}`}>
                    {actionLabel}
                  </span>
                </div>
                <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                  <p className="text-sm"><span className="text-mutedText">{t("customer.checkIn")}:</span><br /><strong>{formatBookedDate(selectedBooking.check_in)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("bookingUi.checkInTime")}:</span><br /><strong>{formatHotelTime(selectedBooking.check_in_time)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("bookingUi.autoCancelDeadline")}:</span><br /><strong>{formatHotelDateTime(selectedBooking.auto_cancel_at)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("reception.originalCheckout")}:</span><br /><strong>{formatBookedDate(selectedBooking.check_out)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("reception.actualCheckIn")}:</span><br /><strong>{formatHotelDateTime(selectedBooking.actual_checkin_time)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("reception.bookingStatus")}:</span><br /><strong>{bookingStatusLabel(t, selectedBooking)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("shared.paymentStatus")}:</span><br /><strong>{paymentStatusLabel(t, selectedBooking.payment_status)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("shared.remainingAmount")}:</span><br /><strong>{formatCurrency(selectedBooking.remaining_amount)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("shared.details")}:</span><br /><strong>{formatStatus(selectedBooking.booking_type || selectedBooking.booked_by)}</strong></p>
                  <p className="text-sm"><span className="text-mutedText">{t("reception.earlyCheckoutEligibility")}:</span><br /><strong>{actionState.canEarlyCheckOut ? t("reception.eligible") : t("reception.notEligible")}</strong></p>
                </div>
                {selectedBooking.status === "checked_in" ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">{t("statuses.booking.already_checked_in")}</p>
                ) : null}
                {actionState.reason ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">{bookingActionReasonLabel(t, actionState.reason, selectedBooking)}</p>
                ) : null}
                {selectedBooking.bill && !pendingExtension ? (
                  <Button as={Link} to={`/receptionist/bill-generator?ref=${selectedBooking.booking_ref}`} variant="outline">
                    {t("shared.print")} {t("bookingUi.downloadBill")}
                  </Button>
                ) : null}
                {(selectedBooking.extensionRequests || []).length ? (
                  <div className={`rounded-xl p-4 text-sm ${
                    pendingExtension ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"
                  }`}>
                    <p className="font-semibold">
                      {pendingExtension ? "Extension Payment Pending" : "Extension Payment Paid"}
                    </p>
                    {(selectedBooking.extensionRequests || []).map((extension) => (
                      <p key={extension.id} className="mt-1">
                        {extension.original_checkout_date || extension.requested_from}
                        {" → "}
                        {extension.extended_checkout_date || extension.requested_to}
                        {" · "}
                        {formatCurrency(extension.extension_payable_amount ?? extension.extra_amount)}
                        {" · "}
                        {extension.payment_status}
                      </p>
                    ))}
                    {pendingExtension ? (
                      <p className="mt-2 font-semibold">
                        Extension payment must be confirmed before generating final bill.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {selectedBooking.status === "checked_out" ? (
                <div className="section-card p-5 text-blue-700">
                  <p className="font-semibold">{selectedBooking.is_early_checkout ? t("statuses.booking.early_checked_out") : t("statuses.booking.checked_out")}</p>
                  <p className="mt-1 text-sm">{t("reception.actualCheckout")}: {formatHotelDateTime(selectedBooking.actual_checkout_time)}</p>
                  {selectedBooking.is_early_checkout ? (
                    <>
                      <p className="mt-1 text-sm">{t("reception.originalCheckout")}: {formatBookedDate(selectedBooking.original_checkout_date || selectedBooking.check_out)}</p>
                      <p className="mt-1 text-sm">{t("shared.reason")}: {selectedBooking.early_checkout_reason}</p>
                    </>
                  ) : null}
                  <p className="mt-1 text-sm">{t("ops.noFurtherBookingAction")}</p>
                </div>
              ) : null}

              {selectedBooking.status === "cancelled" && isNoShowCancellation(selectedBooking) ? (
                <div className="section-card border border-red-200 bg-red-50 p-5 text-red-800">
                  <p className="font-semibold">{t("statuses.booking.cancelled_no_show")}</p>
                  <p className="mt-1 text-sm">{selectedBooking.cancellation_reason}</p>
                  <p className="mt-1 text-sm">{t("ops.autoCancelledAt")}: {formatHotelDateTime(selectedBooking.auto_cancelled_at)}</p>
                  <p className="mt-1 text-sm">{t("refunds.refundStatus")}: {t(`statuses.refund.${selectedBooking.refund_status || "not_applicable"}`)}</p>
                </div>
              ) : null}

              {selectedBooking.status === "checked_in" ? (
                <div className="section-card space-y-4 p-5">
                  <h3 className="font-semibold">
                    {actionState.canEarlyCheckOut ? t("reception.earlyCheckout") : t("reception.checkOut")}
                  </h3>
                  <p className="text-sm text-mutedText">
                    Checkout feedback is collected before the room moves to cleaning.
                  </p>
                  {actionState.canEarlyCheckOut ? (
                    <Button
                      onClick={() => openCheckout("early")}
                      disabled={checkOutMutation.isPending || Boolean(pendingExtension)}
                    >
                      {t("reception.earlyCheckout")}
                    </Button>
                  ) : actionState.canCheckOut ? (
                    <Button
                      onClick={() => openCheckout("normal")}
                      disabled={checkOutMutation.isPending || Boolean(pendingExtension)}
                    >
                      {t("reception.checkOut")}
                    </Button>
                  ) : null}
                  {!actionState.canCheckOut && !actionState.canEarlyCheckOut && actionState.reason ? (
                    <p className="text-sm text-amber-700">{bookingActionReasonLabel(t, actionState.reason, selectedBooking)}</p>
                  ) : null}
                </div>
              ) : null}

              {!["checked_in", "checked_out", "cancelled"].includes(selectedBooking.status) ? (
                <div className="section-card space-y-4 p-5">
                  <h3 className="font-semibold">{t("reception.checkIn")}</h3>
                  <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                    <p className="text-sm font-semibold text-red-800">{t("reception.markNoShow")}</p>
                    <p className="mt-1 text-xs text-red-700">
                      {t("ops.gracePeriodHint")}: {formatHotelDateTime(selectedBooking.auto_cancel_at)}.
                    </p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      disabled={!canMarkNoShow || markNoShowMutation.isPending}
                      onClick={() => markNoShowMutation.mutate(selectedBooking.id)}
                    >
                      {markNoShowMutation.isPending ? t("shared.processing") : t("reception.markNoShow")}
                    </Button>
                  </div>

                  {paymentPending && !canMarkNoShow ? (
                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h4 className="font-semibold">{t("reception.confirmRemainingPayment")}</h4>
                      <p className="text-sm text-mutedText">
                        {t("reception.exactAmountRequired", { amount: formatCurrency(remainingAmount) })}
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        <InputField
                          label={`${t("reception.amount")} (${formatCurrency(remainingAmount)})`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentConfirmation.amount}
                          onChange={(event) => setPaymentConfirmation({ ...paymentConfirmation, amount: event.target.value })}
                          placeholder={remainingAmount.toFixed(2)}
                        />
                        <SelectField
                          label={t("shared.paymentMethod")}
                          value={paymentConfirmation.payment_mode}
                          onChange={(event) => setPaymentConfirmation({ ...paymentConfirmation, payment_mode: event.target.value })}
                          options={[{ label: t("reception.hotelQr"), value: "hotel_qr" }, { label: t("reception.cash"), value: "cash" }]}
                        />
                        <InputField
                          label={t("reception.transactionReference")}
                          value={paymentConfirmation.transaction_reference}
                          onChange={(event) => setPaymentConfirmation({ ...paymentConfirmation, transaction_reference: event.target.value })}
                        />
                      </div>
                      <Button disabled={confirmPaymentMutation.isPending} onClick={submitPayment}>
                        {confirmPaymentMutation.isPending ? t("shared.processing") : `${t("shared.confirm")} ${formatCurrency(remainingAmount)}`}
                      </Button>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold">{t("reception.idVerification")}</p>
                      {selectedBooking.customer?.id_doc_url || selectedBooking.customer?.id_doc_public_id ? (
                        <Button
                          variant="outline"
                          onClick={() => openSecurePhoto({ type: "customer-id", id: selectedBooking.customer.id }).catch(() => toast.error(t("shared.actionFailed")))}
                        >
                          {t("shared.view")}
                        </Button>
                      ) : <p className="text-sm text-mutedText">{t("shared.notAvailable")}</p>}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">{t("shared.customer")}</p>
                      {selectedBooking.customer?.live_photo_url || selectedBooking.customer?.live_photo_public_id ? (
                        <Button
                          variant="outline"
                          onClick={() => openSecurePhoto({ type: "customer-live", id: selectedBooking.customer.id }).catch(() => toast.error(t("shared.actionFailed")))}
                        >
                          {t("shared.view")}
                        </Button>
                      ) : <p className="text-sm text-mutedText">{t("shared.notAvailable")}</p>}
                    </div>
                  </div>

                  <p className="text-sm">
                    {t("ops.idVerification")}: <strong>{selectedBooking.id_verified || selectedBooking.id_verification_status === "verified" ? t("ops.verified") : t("statuses.booking.pending")}</strong>
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checkInForm.id_verified}
                      onChange={(event) => setCheckInForm((current) => ({ ...current, id_verified: event.target.checked }))}
                    />
                    ID verified
                  </label>
                  <InputField
                    label="Verification Note (optional)"
                    value={checkInForm.id_verification_note}
                    onChange={(event) => setCheckInForm((current) => ({ ...current, id_verification_note: event.target.value }))}
                  />
                  {(selectedBooking.id_verification_status || (selectedBooking.id_verified ? "verified" : "pending")) === "pending" ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => verifyIdMutation.mutate({ id: selectedBooking.id, payload: { status: "verified", note: checkInForm.id_verification_note } })}
                        disabled={verifyIdMutation.isPending}
                      >
                        {t("reception.verifyId")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => verifyIdMutation.mutate({ id: selectedBooking.id, payload: { status: "rejected", note: checkInForm.id_verification_note } })}
                        disabled={verifyIdMutation.isPending}
                      >
                        {t("reception.rejectId")}
                      </Button>
                    </div>
                  ) : null}
                  <SelectField
                    label={t("shared.paymentMethod")}
                    value={checkInForm.payment_method}
                    onChange={(event) => setCheckInForm((current) => ({ ...current, payment_method: event.target.value }))}
                    options={localizedPaymentMethodOptions}
                  />
                  <Button
                    onClick={submitCheckIn}
                    disabled={checkInMutation.isPending || !actionState.canCheckIn}
                    className={!actionState.canCheckIn ? "cursor-not-allowed opacity-50" : ""}
                  >
                    {checkInMutation.isPending ? t("shared.processing") : t("reception.checkIn")}
                  </Button>
                  {!actionState.canCheckIn && actionState.reason ? (
                    <p className="text-sm text-amber-700">{bookingActionReasonLabel(t, actionState.reason, selectedBooking)}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Modal
        open={checkoutOpen}
        onClose={() => !checkOutMutation.isPending && setCheckoutOpen(false)}
        title={`${checkoutMode === "early" ? t("reception.earlyCheckout") : t("reception.checkOut")} ${selectedBooking?.customer?.full_name || t("shared.customer")}`}
      >
        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p><strong>{t("shared.bookingId")}:</strong> {selectedBooking?.booking_ref}</p>
            <p><strong>{t("shared.customer")}:</strong> {selectedBooking?.customer?.full_name}</p>
            <p><strong>{t("common.room")}:</strong> {selectedBooking?.room?.room_number} ({selectedBooking?.room?.name || roomCategoryLabel(t, selectedBooking?.room?.category)})</p>
            <p><strong>{t("reception.actualCheckIn")}:</strong> {formatHotelDateTime(selectedBooking?.actual_checkin_time)}</p>
            <p><strong>{t("reception.originalCheckout")}:</strong> {formatBookedDate(selectedBooking?.original_checkout_date || selectedBooking?.check_out)}</p>
            <p><strong>{checkoutMode === "early" ? t("reception.earlyCheckoutTime") : t("reception.actualCheckout")}:</strong> {getCurrentISTDateTime()}</p>
          </div>

          {checkoutMode === "early" ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  {t("reception.earlyCheckoutReason")} <span className="text-red-600">*</span>
                </span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-divider p-3 text-sm outline-none focus:border-saffron"
                  value={checkOutForm.reason}
                  onChange={(event) => setCheckOutForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder={t("reception.earlyCheckoutReason")}
                  maxLength={2000}
                  required
                />
              </label>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                {t("reception.earlyCheckoutWarning")}
              </div>
            </>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-semibold">{t("reception.customerRating")} <span className="text-red-600">*</span></p>
            <StarRating
              value={checkOutForm.rating}
              onChange={(rating) => setCheckOutForm((current) => ({ ...current, rating }))}
            />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">{t("reception.customerFeedback")} <span className="text-red-600">*</span></span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-divider p-3 text-sm outline-none focus:border-saffron"
              value={checkOutForm.feedback_text}
              onChange={(event) => setCheckOutForm((current) => ({ ...current, feedback_text: event.target.value }))}
              placeholder={t("reception.feedbackPlaceholder")}
              maxLength={2000}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">{t("reception.internalNote")} ({t("shared.optional")})</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-divider p-3 text-sm outline-none focus:border-saffron"
              value={checkOutForm.internal_note}
              onChange={(event) => setCheckOutForm((current) => ({ ...current, internal_note: event.target.value }))}
              placeholder={t("reception.internalNotePlaceholder")}
              maxLength={2000}
            />
          </label>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("reception.extraCharges")} ({t("shared.optional")})</p>
            {checkOutForm.extras.map((item, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
                <InputField
                  label={index === 0 ? t("reception.label") : undefined}
                  value={item.label}
                  onChange={(event) => setCheckOutForm((current) => {
                    const extras = [...current.extras];
                    extras[index] = { ...extras[index], label: event.target.value };
                    return { ...current, extras };
                  })}
                  placeholder="Laundry, minibar, etc."
                />
                <InputField
                  label={index === 0 ? t("reception.amount") : undefined}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(event) => setCheckOutForm((current) => {
                    const extras = [...current.extras];
                    extras[index] = { ...extras[index], amount: event.target.value };
                    return { ...current, extras };
                  })}
                  placeholder="0.00"
                />
                <Button
                  variant="outline"
                  onClick={() => setCheckOutForm((current) => ({
                    ...current,
                    extras: current.extras.filter((_, extraIndex) => extraIndex !== index),
                  }))}
                  disabled={checkOutForm.extras.length === 1}
                >
                  {t("reception.remove")}
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setCheckOutForm((current) => ({
                ...current,
                extras: [...current.extras, { label: "", amount: "" }],
              }))}
            >
              {t("reception.addExtra")}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label={t("shared.paymentMethod")}
              value={checkOutForm.payment_method}
              onChange={(event) => setCheckOutForm((current) => ({ ...current, payment_method: event.target.value }))}
              options={localizedPaymentMethodOptions}
            />
            {checkoutMode === "early" ? (
              <div>
                <p className="mb-2 text-sm font-semibold">{t("shared.paymentStatus")}</p>
                <p className="rounded-xl border border-divider bg-gray-50 px-4 py-3 text-sm font-semibold">
                  {t("statuses.payment.paid")}
                </p>
              </div>
            ) : (
              <SelectField
                label={t("shared.paymentStatus")}
                value={checkOutForm.payment_status}
                onChange={(event) => setCheckOutForm((current) => ({ ...current, payment_status: event.target.value }))}
                options={localizedCheckoutPaymentOptions}
              />
            )}
          </div>

          <div className="rounded-xl border border-divider bg-gray-50 p-4">
            <p className="mb-3 text-sm font-semibold">{t("bookingUi.paymentSummary")}</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>{t("shared.totalAmount")}: <strong>{formatCurrency(selectedBooking?.total_amount)}</strong></p>
              <p>{t("shared.paidAmount")}: <strong>{formatCurrency(selectedBooking?.amount_paid)}</strong></p>
              <p>{t("shared.remainingAmount")}: <strong>{formatCurrency(selectedBooking?.remaining_amount)}</strong></p>
              <p>{t("reception.refundAdjustment")}: <strong>{formatCurrency(0)}</strong></p>
              <p>{t("reception.finalSettlement")}: <strong>{selectedBooking?.payment_status === "paid" && Number(selectedBooking?.remaining_amount || 0) <= 0 ? t("reception.settled") : t("reception.outstanding")}</strong></p>
            </div>
            {checkoutMode === "early" ? (
              <p className="mt-3 text-xs font-semibold text-amber-800">
                {t("reception.noAutomaticRefund")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={checkOutMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submitCheckOut} disabled={checkOutMutation.isPending || Boolean(pendingExtension)}>
              {checkOutMutation.isPending
                ? t("shared.processing")
                : checkoutMode === "early" ? t("reception.confirmEarlyCheckout") : t("reception.checkOut")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
