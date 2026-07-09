import { formatCurrency } from "../../utils/formatCurrency";
import { useTranslation } from "react-i18next";

export default function BillPreview({ booking }) {
  const { t } = useTranslation();
  if (!booking) return null;
  const extensions = Array.isArray(booking.bill?.extension_json)
    ? booking.bill.extension_json
    : (booking.extensionRequests || []).filter((extension) => extension.payment_status === "paid");
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">{t("ops.billPreview")}</h3>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>{t("common.reference")}</span><span>{booking.booking_ref}</span></div>
        <div className="flex justify-between"><span>{t("ops.room")}</span><span>{booking.room_name || booking.room?.name}</span></div>
        <div className="flex justify-between"><span>{t("bookingUi.baseAmount")}</span><span>{formatCurrency(booking.base_amount || 0)}</span></div>
        <div className="flex justify-between text-success"><span>{t("bookingUi.offerDiscount")}</span><span>-{formatCurrency(booking.offer_discount_amount ?? booking.discount_amount ?? 0)}</span></div>
        <div className="flex justify-between"><span>{t("bookingUi.amountAfterOffer")}</span><span>{formatCurrency(booking.amount_after_offer ?? booking.total_fare ?? 0)}</span></div>
        <div className="flex justify-between text-success">
          <span>Coupon {booking.applied_coupon_code ? `(${booking.applied_coupon_code})` : ""}</span>
          <span>-{formatCurrency(booking.coupon_discount_amount || 0)}</span>
        </div>
        <div className="flex justify-between"><span>{t("bookingUi.gst")}</span><span>{formatCurrency(booking.gst_amount || 0)}</span></div>
        {extensions.length ? (
          <div className="my-3 space-y-2 border-y border-divider py-3">
            <div className="flex justify-between">
              <span>Original Stay Amount</span>
              <span>{formatCurrency(booking.bill?.original_stay_amount ?? extensions[0]?.original_booking_amount)}</span>
            </div>
            {extensions.map((extension) => (
              <div key={extension.id}>
                <div className="flex justify-between">
                  <span>Extension Stay ({extension.extensionNights ?? extension.extension_nights ?? extension.nights} night(s))</span>
                  <span>{formatCurrency(extension.extensionPayableAmount ?? extension.extension_payable_amount ?? extension.extra_amount)}</span>
                </div>
                <p className="text-xs text-mutedText">
                  Payment: {extension.extensionPaymentStatus || extension.payment_status}
                  {extension.payment_method ? ` · ${extension.payment_method}` : ""}
                  {extension.payment_reference ? ` · Ref ${extension.payment_reference}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex justify-between border-t border-divider pt-2 font-semibold"><span>{t("ops.total")}</span><span>{formatCurrency(booking.final_payable_amount || booking.total_amount)}</span></div>
        <div className="flex justify-between"><span>Total Paid</span><span>{formatCurrency(booking.bill?.total_paid_amount ?? booking.amount_paid)}</span></div>
        <div className="flex justify-between"><span>Remaining</span><span>{formatCurrency(booking.bill?.remaining_amount ?? booking.remaining_amount)}</span></div>
      </div>
    </div>
  );
}

