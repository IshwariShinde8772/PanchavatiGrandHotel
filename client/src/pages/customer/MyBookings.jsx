import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import CancellationModal from "../../components/booking/CancellationModal";
import { useCancelBooking, useMyBookings } from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";
import { isUpcomingBooking } from "../../utils/bookingFilters";

export default function MyBookings() {
  const { data, error } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");

  const rows = Array.isArray(data?.data) ? data.data.filter((item) => item && item.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Trips"
        title="Your current and past stays"
        description="Upcoming, completed, cancelled, and pay-at-hotel bookings all in one place."
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load bookings: {error?.response?.data?.error || error.message}
        </div>
      ) : null}

      <div className="space-y-5">
        {rows.map((booking) => (
          <div key={booking.id} className="section-card overflow-hidden md:grid md:grid-cols-[220px_minmax(0,1fr)]">
            <img
              src={booking?.room?.images?.[0] || "/assets/images/placeholder-room.svg"}
              alt={booking?.room?.name || booking?.booking_ref || "Room details unavailable"}
              className="h-48 w-full object-cover md:h-full"
            />
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl">{booking?.room?.name || "Room details unavailable"}</p>
                  <p className="text-sm text-mutedText">
                    {booking?.booking_ref || "Booking reference unavailable"} • {booking?.room?.category || "Category unavailable"}
                  </p>
                </div>
                <span className="rounded-full bg-goldLight px-4 py-2 text-sm font-semibold text-godavari">{booking?.status || "-"}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-5">
                <p>{booking?.check_in || "-"} to {booking?.check_out || "-"}</p>
                <p>{booking?.nights ?? "-"} nights</p>
                <p>{booking?.guests ?? "-"} guests</p>
                <p>{formatCurrency(booking?.total_amount || 0)}</p>
                <p>Payment: {booking?.payment_status || "-"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button as={Link} to={`/customer/my-bookings/${booking.id}`} variant="outline">View Details</Button>
                {booking?.payment_status === "pending" ? <Button as={Link} to="/customer/transactions" variant="secondary">Pay Now</Button> : null}
                {booking?.status === "checked_out" ? <Button variant="gold">Download Bill</Button> : null}
                {booking?.status === "confirmed" && isUpcomingBooking(booking) ? (
                  <Button variant="secondary" onClick={() => setSelectedId(booking.id)}>Cancel</Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && !error ? (
          <div className="section-card p-6 text-sm text-mutedText">No bookings found yet.</div>
        ) : null}
      </div>

      <CancellationModal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        reason={reason}
        setReason={setReason}
        onConfirm={async () => {
          if (!selectedId) return;
          await cancelBooking.mutateAsync({ id: selectedId, payload: { reason } });
          setSelectedId(null);
          setReason("");
        }}
      />
    </div>
  );
}
