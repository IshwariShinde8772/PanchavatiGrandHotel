import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import BookingStepIndicator from "../../components/booking/BookingStepIndicator";
import GuestDetailsForm from "../../components/booking/GuestDetailsForm";
import NationalityIDForm from "../../components/booking/NationalityIDForm";
import BookingSummary from "../../components/booking/BookingSummary";
import PaymentWidget from "../../components/booking/PaymentWidget";
import PostponePaymentOption from "../../components/booking/PostponePaymentOption";
import QrPaymentPanel from "../../components/booking/QrPaymentPanel";
import InputField from "../../components/forms/InputField";
import { useRoomDetail } from "../../hooks/useRooms";
import { useBookingStore } from "../../store/bookingStore";
import { calcNights } from "../../utils/calcNights";
import { useCreateBooking } from "../../hooks/useBookings";
import { useAuthStore } from "../../store/authStore";
import { transactionAPI } from "../../api/transactionAPI";

export default function BookingFlow() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { data: room } = useRoomDetail(roomId);
  const { selection, setSelection, guestInfo, setGuestInfo, resetBooking } = useBookingStore();
  const [step, setStep] = useState(0);
  const createBooking = useCreateBooking();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setBookingRedirect = useAuthStore((state) => state.setBookingRedirect);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const mergedSelection = useMemo(
    () => ({
      ...selection,
      nights: calcNights(selection.checkIn, selection.checkOut) || 1,
    }),
    [selection]
  );

  const submitBooking = async (payment_method) => {
    if (!isAuthenticated) {
      // Store booking state before redirecting to login
      const bookingState = {
        roomId,
        selection: mergedSelection,
        guestInfo,
        step,
      };
      
      setBookingRedirect(`/book/${roomId}`, bookingState);
      toast.error("Please login to complete your booking");
      navigate("/login", { state: { redirectTo: `/book/${roomId}` } });
      return;
    }

    if (!mergedSelection.checkIn || !mergedSelection.checkOut) {
      toast.error("Please choose both check-in and check-out dates.");
      return;
    }

    if (!guestInfo.full_name || !guestInfo.phone) {
      toast.error("Please complete the guest details before continuing.");
      return;
    }

    try {
      const response = await createBooking.mutateAsync({
        room_id: Number(roomId),
        check_in: mergedSelection.checkIn,
        check_out: mergedSelection.checkOut,
        guests: Number(mergedSelection.guests || 2),
        special_requests: mergedSelection.specialRequests,
        payment_method,
        guest: {
          full_name: guestInfo.full_name,
          email: guestInfo.email || "",
          phone: guestInfo.phone,
          nationality: guestInfo.nationality,
          id_type: guestInfo.id_type,
          id_number: guestInfo.id_number,
          id_expiry: guestInfo.id_expiry,
        },
      });

      if (payment_method === "qr" && response.data.transaction) {
        setPendingTransaction(response.data.transaction);
        toast.success("QR generated. Pay before the timer ends.");
        return;
      }

      resetBooking();
      navigate(`/booking/confirmed/${response.data.booking.booking_ref}`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to create booking right now.");
    }
  };

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Book Your Stay" title={`Reserve ${room?.name || "your room"}`} description="A guided 4-step booking flow with transparent pricing, ID capture, and pay-later support." />
      <div className="mt-8 space-y-6">
        <BookingStepIndicator currentStep={step} />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="section-card p-6">
            {step === 0 ? (
              <div className="space-y-4">
                <InputField label="Check-in" type="date" value={selection.checkIn || ""} onChange={(event) => setSelection({ checkIn: event.target.value })} />
                <InputField label="Check-out" type="date" value={selection.checkOut || ""} onChange={(event) => setSelection({ checkOut: event.target.value })} />
                <InputField label="Guests" type="number" min="1" value={selection.guests || 2} onChange={(event) => setSelection({ guests: event.target.value })} />
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Special Requests</span>
                  <textarea className="min-h-32 w-full rounded-[24px] border border-divider px-4 py-3" value={selection.specialRequests || ""} onChange={(event) => setSelection({ specialRequests: event.target.value })} />
                </label>
              </div>
            ) : null}

            {step === 1 ? <GuestDetailsForm form={guestInfo} setForm={setGuestInfo} /> : null}
            {step === 2 ? <NationalityIDForm form={guestInfo} setForm={setGuestInfo} /> : null}
            {step === 3 ? (
              <div className="space-y-6">
                {pendingTransaction ? (
                  <QrPaymentPanel
                    transaction={pendingTransaction}
                    busy={paymentBusy}
                    onConfirm={async () => {
                      try {
                        setPaymentBusy(true);
                        const result = await transactionAPI.confirm(pendingTransaction.id);
                        resetBooking();
                        navigate(`/booking/confirmed/${result.data.booking.booking_ref}`);
                      } catch (error) {
                        toast.error(error.response?.data?.error || "Unable to confirm payment.");
                      } finally {
                        setPaymentBusy(false);
                      }
                    }}
                    onRegenerate={async () => {
                      try {
                        setPaymentBusy(true);
                        const result = await transactionAPI.regenerateQr(pendingTransaction.id);
                        setPendingTransaction(result.data.transaction);
                      } catch (error) {
                        toast.error(error.response?.data?.error || "Unable to generate a new QR.");
                      } finally {
                        setPaymentBusy(false);
                      }
                    }}
                  />
                ) : (
                  <PaymentWidget onPayOnline={() => submitBooking("qr")} />
                )}
                {!pendingTransaction ? <PostponePaymentOption onReserve={() => submitBooking("pay_later")} /> : null}
              </div>
            ) : null}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep((prev) => Math.max(prev - 1, 0))}>Back</Button>
              {step < 3 ? <Button onClick={() => setStep((prev) => Math.min(prev + 1, 3))}>Continue</Button> : null}
            </div>
          </div>
          <BookingSummary room={room} selection={mergedSelection} />
        </div>
      </div>
    </div>
  );
}
