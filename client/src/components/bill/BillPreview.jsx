import { formatCurrency } from "../../utils/formatCurrency";

export default function BillPreview({ booking }) {
  if (!booking) return null;
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">Bill Preview</h3>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>Booking Ref</span><span>{booking.booking_ref}</span></div>
        <div className="flex justify-between"><span>Room</span><span>{booking.room_name || booking.room?.name}</span></div>
        <div className="flex justify-between"><span>Total</span><span>{formatCurrency(booking.total_amount)}</span></div>
      </div>
    </div>
  );
}

