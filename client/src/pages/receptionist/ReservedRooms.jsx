import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { bookingAPI } from "../../api/bookingAPI";

export default function ReservedRooms() {
  const queryClient = useQueryClient();
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [approvePayment, setApprovePayment] = useState(false);

  // Fetch pending/confirmed bookings (reserved rooms)
  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-reserved-rooms"],
    queryFn: () => bookingAPI.receptionistList({ 
      status: "confirmed,pending"
    }),
  });

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: (bookingId) => bookingAPI.checkIn(bookingId, {
      id_verified: true,
      payment_status: "paid",
      payment_method: "qr",
    }),
    onSuccess: () => {
      toast.success("Payment verified and booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["receptionist-reserved-rooms"] });
      setApprovePayment(false);
      setSelectedReservation(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to approve payment");
    },
  });

  const reservations = data?.data || [];
  const pendingApproval = reservations.filter(r => r.payment_status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow="Reserved Rooms" 
        title="Upcoming room reservations" 
        description="Manage room allocations, verify payments, and track reservation requests." 
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">Total Reserved</p>
          <p className="font-heading text-3xl mt-2">{reservations.length}</p>
        </div>
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">Pending Payment</p>
          <p className="font-heading text-3xl mt-2 text-amber-600">{pendingApproval.length}</p>
        </div>
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">Confirmed</p>
          <p className="font-heading text-3xl mt-2 text-green-600">{reservations.filter(r => r.payment_status === "paid").length}</p>
        </div>
      </div>

      {selectedReservation && (
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">Reservation - {selectedReservation.booking_ref}</h3>
            <button onClick={() => setSelectedReservation(null)} className="text-mutedText hover:text-black">✕</button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Guest Details */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-mutedText">Guest Name</p>
                <p className="font-semibold text-lg">{selectedReservation.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Phone</p>
                <p className="font-semibold">{selectedReservation.customer?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Email</p>
                <p className="font-semibold break-all">{selectedReservation.customer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">ID Verification</p>
                <p className={`font-semibold ${selectedReservation.id_verified ? "text-green-600" : "text-red-600"}`}>
                  {selectedReservation.id_verified ? "✓ Verified" : "✗ Not Verified"}
                </p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-mutedText">Room</p>
                <p className="font-semibold text-lg">{selectedReservation.room?.name} (#{selectedReservation.room?.room_number})</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Check-in to Check-out</p>
                <p className="font-semibold">{selectedReservation.check_in} to {selectedReservation.check_out}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Guests</p>
                <p className="font-semibold">{selectedReservation.guests} guest(s)</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">Special Requests</p>
                <p className="font-semibold">{selectedReservation.special_requests || "None"}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-divider pt-6">
            <h4 className="font-semibold mb-4">Payment Details</h4>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="section-card p-4 bg-blue-50">
                <p className="text-sm text-mutedText">Total Amount</p>
                <p className="font-heading text-2xl mt-2">INR {selectedReservation.total_amount}</p>
              </div>
              <div className={`section-card p-4 ${selectedReservation.payment_status === "paid" ? "bg-green-50" : "bg-amber-50"}`}>
                <p className="text-sm text-mutedText">Payment Status</p>
                <p className={`font-heading text-2xl mt-2 capitalize ${selectedReservation.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                  {selectedReservation.payment_status}
                </p>
              </div>
            </div>

            {/* Payment Proof */}
            {selectedReservation.payment_proof_url && (
              <div className="mb-6">
                <h5 className="font-semibold mb-3">Payment Proof Received</h5>
                <a 
                  href={selectedReservation.payment_proof_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <img 
                    src={selectedReservation.payment_proof_url} 
                    alt="Payment Proof" 
                    className="max-w-xs max-h-64 rounded-lg border border-divider hover:shadow-lg transition-shadow"
                  />
                </a>
              </div>
            )}

            {/* Actions */}
            {selectedReservation.payment_status === "pending" && !approvePayment && (
              <div className="flex gap-3">
                <Button 
                  onClick={() => setApprovePayment(true)}
                  variant="gold"
                >
                  Verify & Approve Payment
                </Button>
              </div>
            )}

            {approvePayment && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3">
                <p className="font-semibold">Confirm payment verification?</p>
                <p className="text-sm text-mutedText">
                  This will mark the payment as received and confirm the room booking.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => approveMutation.mutate(selectedReservation.id)}
                    disabled={approveMutation.isPending}
                    variant="secondary"
                  >
                    {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
                  </Button>
                  <Button 
                    onClick={() => setApprovePayment(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reservations List */}
      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">Loading reservations...</p>
        ) : reservations.length === 0 ? (
          <p className="p-5 text-mutedText">No reserved rooms at this time.</p>
        ) : (
          reservations.map((reservation) => (
            <div 
              key={reservation.id} 
              className="p-5 hover:bg-gray-50 cursor-pointer transition-colors border-l-4"
              style={{
                borderLeftColor: reservation.payment_status === "paid" ? "#10b981" : "#f59e0b"
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-lg">{reservation.booking_ref}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      reservation.payment_status === "paid" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {reservation.payment_status === "paid" ? "✓ Paid" : "⏱ Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-mutedText mb-2">{reservation.customer?.full_name} • {reservation.customer?.phone}</p>
                  <div className="grid gap-2 text-sm md:grid-cols-4">
                    <span>Room: {reservation.room?.room_number}</span>
                    <span>Check-in: {reservation.check_in}</span>
                    <span>Guests: {reservation.guests}</span>
                    <span>Amount: INR {reservation.total_amount}</span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedReservation(reservation)}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
