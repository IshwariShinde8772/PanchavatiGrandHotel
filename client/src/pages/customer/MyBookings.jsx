import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import CancellationModal from "../../components/booking/CancellationModal";
import { useCancelBooking, useMyBookings } from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";

export default function MyBookings() {
  const { data } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");

  const rows = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Trips" title="Your current and past stays" description="Upcoming, completed, cancelled, and pay-at-hotel bookings all in one place." />
      <div className="space-y-5">
        {rows.map((booking) => (
          <div key={booking.id} className="section-card overflow-hidden md:grid md:grid-cols-[220px_minmax(0,1fr)]">
            <img src={booking.room?.images?.[0] || "/assets/images/placeholder-room.svg"} alt={booking.room?.name || booking.booking_ref} className="h-48 w-full object-cover md:h-full" />
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl">{booking.room?.name || "Room booking"}</p>
                  <p className="text-sm text-mutedText">{booking.booking_ref} • {booking.room?.category}</p>
                </div>
                <span className="rounded-full bg-goldLight px-4 py-2 text-sm font-semibold text-godavari">{booking.status}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-5">
                <p>{booking.check_in} to {booking.check_out}</p>
                <p>{booking.nights} nights</p>
                <p>{booking.guests} guests</p>
                <p>{formatCurrency(booking.total_amount)}</p>
                <p>Payment: {booking.payment_status}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button as={Link} to={`/customer/my-bookings/${booking.id}`} variant="outline">View Details</Button>
                {booking.payment_status === "pending" ? <Button as={Link} to="/customer/transactions" variant="secondary">Pay Now</Button> : null}
                {booking.status === "checked_out" ? <Button variant="gold">Download Bill</Button> : null}
                {["confirmed", "pending"].includes(booking.status) ? <Button variant="secondary" onClick={() => setSelectedId(booking.id)}>Cancel</Button> : null}
              </div>
            </div>
          </div>
        ))}
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

/*
import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import CancellationModal from "../../components/booking/CancellationModal";
import { useCancelBooking, useMyBookings } from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";

export default function MyBookings() {
  const { data } = useMyBookings();
  const cancelBooking = useCancelBooking();
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState("");

  const rows = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Trips" title="Your current and past stays" description="Upcoming, completed, cancelled, and pay-at-hotel bookings all in one place." />
      <div className="space-y-5">
        {rows.map((booking) => (
          <div key={booking.id} className="section-card overflow-hidden md:grid md:grid-cols-[220px_minmax(0,1fr)]">
            <img src={booking.room?.images?.[0] || "/assets/images/placeholder-room.svg"} alt={booking.room?.name || booking.booking_ref} className="h-48 w-full object-cover md:h-full" />
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl">{booking.room?.name || "Room booking"}</p>
                  <p className="text-sm text-mutedText">{booking.booking_ref} • {booking.category}</p>
                </div>
                <span className="rounded-full bg-goldLight px-4 py-2 text-sm font-semibold text-godavari">{booking.status}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-4">
                <p>{booking.check_in} to {booking.check_out}</p>
                <p>{booking.nights} nights</p>
                <p>{booking.guests} guests</p>
                <p>{formatCurrency(booking.total_amount)}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button as={Link} to={`/customer/my-bookings/${booking.id}`} variant="outline">View Details</Button>
                {booking.status === "checked_out" ? <Button variant="gold">Download Bill</Button> : null}
                {["confirmed", "pending"].includes(booking.status) ? <Button variant="secondary" onClick={() => setSelectedId(booking.id)}>Cancel</Button> : null}
              </div>
            </div>
          </div>
        ))}
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
*/
