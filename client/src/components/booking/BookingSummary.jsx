import { formatCurrency } from "../../utils/formatCurrency";
import PriceBreakdown from "../room/PriceBreakdown";

export default function BookingSummary({ room, selection }) {
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
          <p className="text-sm text-mutedText">{room.category} • {selection.guests} guests</p>
        </div>
      </div>
      <div className="mt-4 text-sm text-mutedText">
        <p>{selection.checkIn} to {selection.checkOut}</p>
        <p className="mt-1">Special requests: {selection.specialRequests || "None"}</p>
      </div>
      <div className="mt-4">
        <PriceBreakdown
          pricePerNight={finalPrice}
          basePrice={basePrice}
          finalPrice={finalPrice}
          discountPct={pricing.discountPct}
          discountAmount={pricing.discountAmount}
          nights={selection.nights || 1}
        />
      </div>
      <p className="mt-4 text-sm text-success">Free cancellation before 48 hours of arrival.</p>
      {hasDiscount ? (
        <p className="mt-2 text-sm text-mutedText line-through">Base: {formatCurrency(basePrice)}</p>
      ) : null}
      <p className="mt-1 text-lg font-semibold text-saffron">From {formatCurrency(finalPrice)}</p>
    </div>
  );
}

