import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import CancellationModal from "../../components/booking/CancellationModal";
import { useCancelBooking, useMyBookings } from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getCustomerRefundStatusLabel,
  getRefundStatusStyle,
} from "../../utils/refundStatus";
import { bookingAPI } from "../../api/bookingAPI";
import toast from "react-hot-toast";
import { openRazorpayCheckout } from "../../utils/razorpayCheckout";
import {
  formatBookingStatus,
  formatHotelDateTime,
  formatHotelTime,
  isNoShowCancellation,
} from "../../utils/hotelDate";
import { bookingStatusLabel, paymentStatusLabel, roomCategoryLabel } from "../../utils/i18nLabels";

export default function MyBookings() {
  const { t } = useTranslation();
  const { data, error, refetch } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const payReservedBooking = async (booking) => {
    let order = null;
    let checkoutCompleted = false;
    try {
      setPayingId(booking.id);
      order = (await bookingAPI.createReservedPaymentOrder(booking.id)).data;
      const response = await openRazorpayCheckout({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "Panchavati Grand",
        description: `${t("bookingUi.paymentSummary")} ${booking.booking_ref}`,
        notes: {
          booking_id: String(booking.id),
          payment_type: order.payment_type,
        },
        theme: { color: "#0A4D34" },
      });
      checkoutCompleted = true;
      await bookingAPI.verifyReservedPayment(booking.id, response);
      toast.success(t("bookingUi.bookingConfirmed"));
      await refetch();
    } catch (error) {
      if (order && !checkoutCompleted) {
        bookingAPI.markPaymentFailed(booking.id, {
          razorpay_order_id: order.order_id,
          reason: error.message,
        }).catch(() => {});
      }
      toast.error(t("bookingUi.paymentFailed"));
    } finally {
      setPayingId(null);
    }
  };

  const rows = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("nav.myTrips")}
        title={t("customer.tripsTitle")}
        description={t("customer.tripsDescription")}
      />

      <div className="space-y-5">
        {rows.map((booking) => (
          <div key={booking.id} className="section-card overflow-hidden md:grid md:grid-cols-[220px_minmax(0,1fr)]">
            <img
              src={booking.room?.images?.[0] || "/assets/images/placeholder-room.svg"}
              alt={booking.room?.name || booking.booking_ref}
              className="h-48 w-full object-cover md:h-full"
            />

            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl">{booking.room?.name || t("customer.roomBooking")}</p>
                  <p className="text-sm text-mutedText">{booking.booking_ref} - {roomCategoryLabel(t, booking.room?.category)}</p>
                </div>
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  booking.status === "cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-goldLight text-godavari"
                }`}>
                  {bookingStatusLabel(t, booking)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-5">
                <p>{booking.check_in} - {booking.check_out}</p>
                <p>{t("bookingUi.checkInTime")}: {formatHotelTime(booking.check_in_time)}</p>
                <p>{t("bookingUi.autoCancelDeadline")}: {formatHotelDateTime(booking.auto_cancel_at)}</p>
                <p>{booking.nights} {t("customer.nights")}</p>
                <p>{booking.guests} {t("common.guests")}</p>
                <p>{formatCurrency(booking.total_amount)}</p>
                <p>{t("customer.paymentLabel", { status: paymentStatusLabel(t, booking.payment_status) })}</p>
                <p>{t("layout.coupons")}: {booking.applied_coupon_code || t("shared.notAvailable")}</p>
              </div>
              {booking.reservation_type === "reserved_booking" || Number(booking.advance_paid || 0) > 0 ? (
                <div className="mt-3 grid gap-2 rounded-xl bg-saffronLight/40 p-3 text-sm md:grid-cols-3">
                  <p>{t("shared.paidAmount")}: {formatCurrency(booking.advance_paid || 0)}</p>
                  <p>{t("shared.paidAmount")}: {formatCurrency(booking.amount_paid || 0)}</p>
                  <p>{t("shared.remainingAmount")}: {formatCurrency(booking.remaining_amount ?? Number(booking.total_amount) - Number(booking.amount_paid || 0))}</p>
                </div>
              ) : null}
              {booking.status === "cancelled" ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-red-700">
                      {isNoShowCancellation(booking) ? t("statuses.booking.cancelled_no_show") : t("statuses.booking.cancelled")}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRefundStatusStyle(booking.refundRequest?.status || booking.refund_status)}`}>
                      {getCustomerRefundStatusLabel(booking.refundRequest?.status || booking.refund_status, t)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <p>{t("shared.reason")}: <strong>{booking.cancellation_reason || t("shared.notAvailable")}</strong></p>
                    {isNoShowCancellation(booking) ? (
                      <p>{t("bookingUi.autoCancelDeadline")}: <strong>{formatHotelDateTime(booking.auto_cancelled_at)}</strong></p>
                    ) : null}
                    <p>{t("bookingUi.refundAmount")}: <strong>{formatCurrency(booking.refundRequest?.refund_amount ?? booking.refund_amount)}</strong></p>
                    <p>{t("bookingUi.cancellationCharge")}: <strong>{formatCurrency(booking.refundRequest?.cancellation_charge ?? booking.cancellation_charge)}</strong></p>
                    <p>{t("bookingUi.policyApplied")}: <strong>{booking.refundRequest?.cancellation_policy_applied || booking.cancellation_policy_applied || t("shared.notAvailable")}</strong></p>
                  </div>
                </div>
              ) : null}
              {booking.is_early_checkout ? (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-semibold">{t("statuses.booking.early_checked_out")}</p>
                  <p className="mt-2">{t("reception.actualCheckout")}: <strong>{formatHotelDateTime(booking.early_checkout_at || booking.actual_checkout_time)}</strong></p>
                  <p>{t("shared.reason")}: <strong>{booking.early_checkout_reason || t("shared.notAvailable")}</strong></p>
                  <p>{t("reception.noAutomaticRefund")}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button as={Link} to={`/customer/my-bookings/${booking.id}`} variant="outline">{t("common.viewDetails")}</Button>
                {booking.reservation_type === "reserved_booking"
                  && ["pending", "reserved"].includes(booking.status)
                  && ["pending", "failed", "partially_paid", "pay_at_hotel"].includes(booking.payment_status) ? (
                  <Button variant="secondary" disabled={payingId === booking.id} onClick={() => payReservedBooking(booking)}>
                    {payingId === booking.id ? t("shared.processing") : t("customer.payNow")}
                  </Button>
                ) : booking.status !== "cancelled" && booking.payment_status === "pending" ? (
                  <Button as={Link} to="/customer/transactions" variant="secondary">{t("customer.payNow")}</Button>
                ) : null}
                {booking.status === "checked_out" ? <Button variant="gold">{t("customer.downloadBill")}</Button> : null}
                {["confirmed", "reserved"].includes(booking.status) ? (
                  <Button variant="secondary" onClick={async () => {
                    setSelectedId(booking.id);
                    setPreview(null);
                    try {
                      const result = await bookingAPI.cancellationPreview(booking.id);
                      setPreview(result.data);
                    } catch (error) {
                      toast.error(t("shared.actionFailed"));
                      setSelectedId(null);
                    }
                  }}>{t("common.cancel")}</Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && !error ? (
          <div className="section-card p-6 text-sm text-mutedText">{t("ops.noBookings")}</div>
        ) : null}
      </div>

      <CancellationModal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        reason={reason}
        setReason={setReason}
        preview={preview}
        busy={cancelBooking.isPending}
        onConfirm={async () => {
          if (!selectedId) return;
          if (reason.trim().length < 3) {
            toast.error(t("bookingUi.cancellationReason"));
            return;
          }
          const result = await cancelBooking.mutateAsync({ id: selectedId, payload: { reason } });
          const summary = result.data;
          toast.success(t("shared.actionCompleted"), { duration: 8000 });
          setSelectedId(null);
          setReason("");
          setPreview(null);
        }}
      />
    </div>
  );
}
