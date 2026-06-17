import { formatCurrency } from "../../utils/formatCurrency";
import { calcGST } from "../../utils/calcGST";

export default function PriceBreakdown({
  pricePerNight,
  nights,
  gstPercent = 12,
  discount = 0,
  basePrice,
  finalPrice,
  discountPct = 0,
  discountAmount = 0,
}) {
  const normalizedNights = Number(nights || 1);
  const effectiveBasePrice = Number(basePrice ?? pricePerNight ?? 0);
  const effectiveFinalPrice = Number(finalPrice ?? pricePerNight ?? 0);
  const computedDiscountAmount = Number(discountAmount || 0);
  const totalDiscount = computedDiscountAmount
    ? Number((computedDiscountAmount * normalizedNights).toFixed(2))
    : Number(discount || 0);
  const subtotal = Number((effectiveFinalPrice * normalizedNights).toFixed(2));
  const gst = calcGST(subtotal, gstPercent);

  return (
    <div className="rounded-[24px] bg-goldLight p-4 text-sm">
      <div className="flex items-center justify-between">
        <span>Base Fare</span>
        <span>{formatCurrency(effectiveBasePrice)} x {normalizedNights}</span>
      </div>
      {totalDiscount > 0 ? (
        <div className="mt-2 flex items-center justify-between text-success">
          <span>Discount{discountPct ? ` (${discountPct}%)` : ""}</span>
          <span>-{formatCurrency(totalDiscount)}</span>
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span>GST ({gstPercent}%)</span>
        <span>{formatCurrency(gst.gstAmount)}</span>
      </div>
      <div className="mt-3 border-t border-divider pt-3 text-base font-semibold">
        <div className="flex items-center justify-between">
          <span>Total</span>
          <span>{formatCurrency(gst.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
