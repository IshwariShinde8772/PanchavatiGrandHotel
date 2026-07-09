import Button from "../common/Button";
import { formatCurrency } from "../../utils/formatCurrency";
import { useTranslation } from "react-i18next";

export default function PaymentWidget({
  room,
  selection,
  quote,
  onPayOnline,
  busy = false,
  couponCode = "",
  setCouponCode,
  appliedCouponCode,
  onApplyCoupon,
  onRemoveCoupon,
  couponBusy = false,
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-divider bg-white p-5">
      <h3 className="font-heading text-2xl">{t("bookingUi.securePayment")}</h3>
      <p className="mt-2 text-sm text-mutedText">
        {t("bookingUi.securePaymentHint")}
      </p>

      <div className="mt-5 space-y-3 rounded-2xl bg-saffronLight/50 p-4 text-sm">
        <div className="flex justify-between gap-4"><span>{t("common.room")}</span><strong>{room?.name}</strong></div>
        <div className="flex justify-between gap-4"><span>{t("bookingUi.stayDetails")}</span><strong>{selection.checkIn} - {selection.checkOut}</strong></div>
        <div className="flex justify-between gap-4"><span>{t("customer.nights")}</span><strong>{quote?.nights || selection.nights}</strong></div>
        <div className="flex justify-between gap-4"><span>{t("bookingUi.baseAmount")}</span><strong>{formatCurrency(quote?.base_amount || 0)}</strong></div>
        <div className="flex justify-between gap-4 text-success"><span>{t("bookingUi.offerDiscount")}</span><strong>-{formatCurrency(quote?.offer_discount_amount ?? quote?.discount_amount ?? 0)}</strong></div>
        <div className="flex justify-between gap-4"><span>{t("bookingUi.amountAfterOffer")}</span><strong>{formatCurrency(quote?.amount_after_offer ?? quote?.total_fare ?? 0)}</strong></div>
        <div className="flex justify-between gap-4 text-success"><span>{t("bookingUi.couponDiscount")}</span><strong>-{formatCurrency(quote?.coupon_discount_amount || 0)}</strong></div>
        <div className="flex justify-between gap-4"><span>GST ({Number(quote?.gst_percent || 0)}%)</span><strong>{formatCurrency(quote?.gst_amount || 0)}</strong></div>
        <div className="flex justify-between gap-4 border-t border-divider pt-3 text-base">
          <span>{t("bookingUi.payable")}</span><strong>{formatCurrency(quote?.final_payable_amount ?? quote?.total_amount ?? 0)}</strong>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-divider p-4">
        <label className="block text-xs font-bold uppercase tracking-widest text-mutedText" htmlFor="booking-coupon">
          {t("bookingUi.couponCode")}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="booking-coupon"
            className="min-h-11 flex-1 rounded-xl border border-divider px-4 text-sm uppercase outline-none focus:border-primary"
            value={couponCode}
            onChange={(event) => setCouponCode?.(event.target.value.toUpperCase())}
            placeholder={t("bookingUi.enterCoupon")}
            disabled={couponBusy || Boolean(appliedCouponCode)}
          />
          {appliedCouponCode ? (
            <Button variant="outline" onClick={onRemoveCoupon} disabled={couponBusy || busy}>
              {couponBusy ? t("shared.processing") : t("bookingUi.removeCoupon")}
            </Button>
          ) : (
            <Button variant="outline" onClick={onApplyCoupon} disabled={couponBusy || busy || !couponCode.trim()}>
              {couponBusy ? t("shared.processing") : t("bookingUi.applyCoupon")}
            </Button>
          )}
        </div>
        {appliedCouponCode ? (
          <p className="mt-2 text-sm font-semibold text-success">
            {appliedCouponCode} is applied. The server will validate it again before payment.
          </p>
        ) : null}
      </div>

      <Button className="mt-5 w-full" onClick={onPayOnline} disabled={busy || !quote?.total_amount}>
        {busy ? t("shared.processing") : t("bookingUi.payAndBook")}
      </Button>
    </div>
  );
}
