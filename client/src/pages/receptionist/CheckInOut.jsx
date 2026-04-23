import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { useDebounce } from "../../hooks/useDebounce";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";

const statusOptions = [
  { label: "Confirmed + Checked In", value: "confirmed,checked_in" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "All", value: "" },
];

const paymentMethodOptions = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "UPI", value: "upi" },
  { label: "Online", value: "online" },
  { label: "Pay Later", value: "pay_later" },
];

const paymentStatusOptions = [
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Pay At Hotel", value: "pay_at_hotel" },
];

function formatStatus(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CheckInOut() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    q: "",
    status: "confirmed,checked_in",
  });
  const [selectedId, setSelectedId] = useState(null);
  const debouncedSearch = useDebounce(filters.q, 300);

  const [checkInForm, setCheckInForm] = useState({
    id_verified: true,
    payment_method: "cash",
    payment_status: "paid",
  });

  const [checkOutForm, setCheckOutForm] = useState({
    payment_method: "cash",
    payment_status: "paid",
    extras: [{ label: "", amount: "" }],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-checkinout-bookings", debouncedSearch, filters.status],
    queryFn: () => bookingAPI.receptionistList({
      q: debouncedSearch || undefined,
      status: filters.status || undefined,
      limit: 50,
    }),
  });

  const bookings = data?.data || [];
  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedId) || bookings[0] || null,
    [bookings, selectedId]
  );

  const invalidateAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-checkinout-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-cleaning-queue"] });
    queryClient.invalidateQueries({ queryKey: ["receptionist-tasks"] });
  };

  const checkInMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.checkIn(id, payload),
    onSuccess: () => {
      invalidateAfterMutation();
      toast.success("Check-in completed successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Check-in failed");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.checkOut(id, payload),
    onSuccess: () => {
      invalidateAfterMutation();
      toast.success("Check-out completed successfully");
      setCheckOutForm((current) => ({
        ...current,
        extras: [{ label: "", amount: "" }],
      }));
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Check-out failed");
    },
  });

  const submitCheckIn = () => {
    if (!selectedBooking) {
      toast.error("Please select a booking first");
      return;
    }

    checkInMutation.mutate({
      id: selectedBooking.id,
      payload: {
        id_verified: Boolean(checkInForm.id_verified),
        payment_method: checkInForm.payment_method,
        payment_status: checkInForm.payment_status,
      },
    });
  };

  const submitCheckOut = () => {
    if (!selectedBooking) {
      toast.error("Please select a booking first");
      return;
    }

    const extras = checkOutForm.extras
      .filter((item) => item.label.trim() && item.amount !== "")
      .map((item) => ({
        label: item.label.trim(),
        amount: Number(item.amount),
      }));

    checkOutMutation.mutate({
      id: selectedBooking.id,
      payload: {
        extras,
        payment_method: checkOutForm.payment_method,
        payment_status: checkOutForm.payment_status,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Check-In / Check-Out"
        title="Process arrivals and departures"
        description="Search bookings by ref, guest, or room and complete live check-in/check-out actions."
      />

      <div className="section-card p-5 grid gap-4 md:grid-cols-2">
        <InputField
          label="Search booking ref / guest / room"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder="e.g. BKG, guest name, room number"
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          options={statusOptions}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="section-card divide-y divide-divider overflow-hidden">
          {isLoading ? (
            <p className="p-5 text-sm text-mutedText">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="p-5 text-sm text-mutedText">No bookings found for selected filters.</p>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedId(booking.id)}
                className={`p-4 text-left transition-colors ${
                  selectedBooking?.id === booking.id ? "bg-green-50" : "hover:bg-gray-50"
                }`}
              >
                <p className="font-semibold">{booking.booking_ref || `Booking #${booking.id}`}</p>
                <p className="text-sm text-mutedText">
                  {booking.customer?.full_name || "Guest"} • Room {booking.room?.room_number || "N/A"}
                </p>
                <p className="text-xs text-mutedText">
                  {formatStatus(booking.status)} • {formatCurrency(booking.total_amount || 0)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="space-y-6">
          {!selectedBooking ? (
            <div className="section-card p-5 text-sm text-mutedText">Select a booking to continue.</div>
          ) : (
            <>
              <div className="section-card p-5 space-y-2">
                <p className="font-semibold">{selectedBooking.booking_ref || `Booking #${selectedBooking.id}`}</p>
                <p className="text-sm text-mutedText">
                  Guest: {selectedBooking.customer?.full_name || "N/A"} • Phone: {selectedBooking.customer?.phone || "N/A"}
                </p>
                <p className="text-sm text-mutedText">
                  Room: {selectedBooking.room?.room_number || "N/A"} ({selectedBooking.room?.category || "N/A"})
                </p>
                <p className="text-sm text-mutedText">
                  Status: {formatStatus(selectedBooking.status)} • Payment: {formatStatus(selectedBooking.payment_status)}
                </p>
              </div>

              <div className="section-card p-5 space-y-4">
                <h3 className="font-semibold">Check-In Action</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkInForm.id_verified}
                    onChange={(event) => setCheckInForm((current) => ({
                      ...current,
                      id_verified: event.target.checked,
                    }))}
                  />
                  ID verified
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Payment Method"
                    value={checkInForm.payment_method}
                    onChange={(event) => setCheckInForm((current) => ({
                      ...current,
                      payment_method: event.target.value,
                    }))}
                    options={paymentMethodOptions}
                  />
                  <SelectField
                    label="Payment Status"
                    value={checkInForm.payment_status}
                    onChange={(event) => setCheckInForm((current) => ({
                      ...current,
                      payment_status: event.target.value,
                    }))}
                    options={paymentStatusOptions}
                  />
                </div>
                <Button onClick={submitCheckIn} disabled={checkInMutation.isPending}>
                  {checkInMutation.isPending ? "Processing..." : "Complete Check-In"}
                </Button>
              </div>

              <div className="section-card p-5 space-y-4">
                <h3 className="font-semibold">Check-Out Action</h3>
                <div className="space-y-3">
                  {checkOutForm.extras.map((item, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                      <InputField
                        label={index === 0 ? "Extra Label" : undefined}
                        value={item.label}
                        onChange={(event) => setCheckOutForm((current) => {
                          const extras = [...current.extras];
                          extras[index] = { ...extras[index], label: event.target.value };
                          return { ...current, extras };
                        })}
                        placeholder="Laundry, minibar, etc."
                      />
                      <InputField
                        label={index === 0 ? "Amount" : undefined}
                        type="number"
                        min="0"
                        value={item.amount}
                        onChange={(event) => setCheckOutForm((current) => {
                          const extras = [...current.extras];
                          extras[index] = { ...extras[index], amount: event.target.value };
                          return { ...current, extras };
                        })}
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setCheckOutForm((current) => ({
                          ...current,
                          extras: current.extras.filter((_, extraIndex) => extraIndex !== index),
                        }))}
                        disabled={checkOutForm.extras.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCheckOutForm((current) => ({
                    ...current,
                    extras: [...current.extras, { label: "", amount: "" }],
                  }))}
                >
                  Add Extra
                </Button>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Payment Method"
                    value={checkOutForm.payment_method}
                    onChange={(event) => setCheckOutForm((current) => ({
                      ...current,
                      payment_method: event.target.value,
                    }))}
                    options={paymentMethodOptions}
                  />
                  <SelectField
                    label="Payment Status"
                    value={checkOutForm.payment_status}
                    onChange={(event) => setCheckOutForm((current) => ({
                      ...current,
                      payment_status: event.target.value,
                    }))}
                    options={paymentStatusOptions}
                  />
                </div>

                <Button onClick={submitCheckOut} disabled={checkOutMutation.isPending}>
                  {checkOutMutation.isPending ? "Processing..." : "Complete Check-Out"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

