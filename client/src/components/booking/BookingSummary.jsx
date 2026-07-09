import { formatCurrency } from "../../utils/formatCurrency";
import { formatHotelDateTime, formatHotelTime } from "../../utils/hotelDate";
import PriceBreakdown from "../room/PriceBreakdown";
import { useTranslation } from "react-i18next";
import { roomCategoryLabel } from "../../utils/i18nLabels";

export default function BookingSummary({ room, selection, quote }) {
  const { t } = useTranslation();
  if (!room) return null;
  const pricing = room.pricing || {};
  const basePrice = Number(pricing.basePrice ?? room.base_price ?? 0);
  const finalPrice = Number(pricing.finalPrice ?? pricing.pricePerNight ?? room.base_price ?? 0);
  const hasDiscount = Boolean(pricing.hasDiscount && pricing.discountAmount > 0);
  return (
    <div className="section-card p-5">
      <div className="flex items-center gap-4">
        <img src={room.images?.[0] || "/assets/images/placeholder-room.svg"} alt={room.name} className="h-24 w-28 rounded-2xl object-cover" />
        <div>
          <p className="font-heading text-xl">{room.name}</p>
          <p className="text-sm text-mutedText">{roomCategoryLabel(t, room.category)} • {selection.guests} {t("common.guests")}</p>
        </div>
      </div>
      <div className="mt-4 text-sm text-mutedText">
        <p>{selection.checkIn} - {selection.checkOut}</p>
        <p className="mt-1">{t("bookingUi.checkInTime")}: {formatHotelTime(selection.checkInTime)}</p>
        {quote?.auto_cancel_at ? (
          <p className="mt-1">{t("bookingUi.autoCancelDeadline")}: {formatHotelDateTime(quote.auto_cancel_at)}</p>
        ) : null}
        <p className="mt-1">{t("bookingUi.specialRequests")}: {selection.specialRequests || t("bookingUi.none")}</p>
      </div>
      <div className="mt-4">
        <PriceBreakdown
          pricePerNight={quote
            ? Number(quote.total_fare || 0) / Number(quote.nights || 1)
            : finalPrice}
          basePrice={quote ? Number(quote.base_amount) / Number(quote.nights || 1) : basePrice}
          finalPrice={quote
            ? Number(quote.total_fare || 0) / Number(quote.nights || 1)
            : finalPrice}
          discountPct={quote ? 0 : pricing.discountPct}
          discountAmount={quote
            ? (
                Number(quote.offer_discount_amount ?? quote.discount_amount ?? 0)
                + Number(quote.coupon_discount_amount || 0)
              ) / Number(quote.nights || 1)
            : Number(pricing.discountAmount || 0)}
          nights={selection.nights || 1}
          gstPercent={Number(quote?.gst_percent ?? 12)}
        />
      </div>
      {quote ? (
        <div className="mt-4 space-y-1 rounded-xl bg-saffronLight/50 p-3 text-sm">
          <p>{t("bookingUi.baseAmount")}: {formatCurrency(quote.base_amount)}</p>
          <p>{t("bookingUi.offerDiscount")}: -{formatCurrency(quote.offer_discount_amount ?? quote.discount_amount ?? 0)}</p>
          <p>{t("bookingUi.amountAfterOffer")}: {formatCurrency(quote.amount_after_offer ?? quote.total_fare)}</p>
          <p>{t("bookingUi.couponDiscount")}: -{formatCurrency(quote.coupon_discount_amount || 0)}</p>
          <p>GST: {formatCurrency(quote.gst_amount)}</p>
          <p className="font-semibold">{t("bookingUi.payable")}: {formatCurrency(quote.final_payable_amount ?? quote.total_amount)}</p>
        </div>
      ) : null}
      <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        <p className="font-semibold">{t("bookingUi.cancellationPolicyShort")}</p>
      </div>
      {hasDiscount ? (
        <p className="mt-2 text-sm text-mutedText line-through">Base: {formatCurrency(basePrice)}</p>
      ) : null}
      <p className="mt-1 text-lg font-semibold text-saffron">{t("common.from")} {formatCurrency(finalPrice)}</p>
    </div>
  );
}

