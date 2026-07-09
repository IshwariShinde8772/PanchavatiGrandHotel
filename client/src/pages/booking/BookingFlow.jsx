import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import BookingStepIndicator from "../../components/booking/BookingStepIndicator";
import GuestDetailsForm from "../../components/booking/GuestDetailsForm";
import NationalityIDForm from "../../components/booking/NationalityIDForm";
import BookingSummary from "../../components/booking/BookingSummary";
import PaymentWidget from "../../components/booking/PaymentWidget";
import PostponePaymentOption from "../../components/booking/PostponePaymentOption";
import InputField from "../../components/forms/InputField";
import { useRoomDetail } from "../../hooks/useRooms";
import { useBookingStore } from "../../store/bookingStore";
import { calcNights } from "../../utils/calcNights";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { useCreateBooking } from "../../hooks/useBookings";
import { useAuthStore } from "../../store/authStore";
import { authAPI } from "../../api/authAPI";
import { bookingAPI } from "../../api/bookingAPI";
import { couponAPI } from "../../api/couponAPI";
import { openRazorpayCheckout } from "../../utils/razorpayCheckout";
import { getHotelDate } from "../../utils/hotelDate";
import { useTranslation } from "react-i18next";

function todayDateInput() {
  return getHotelDate();
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue || todayDateInput()}T00:00:00`);
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createCheckoutToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function resolveGuestInfo(guestInfo, user) {
  return {
    full_name: normalizeText(guestInfo?.full_name || user?.full_name || user?.name),
    email: normalizeText(guestInfo?.email || user?.email),
    phone: normalizeText(guestInfo?.phone || user?.phone),
    nationality: normalizeText(guestInfo?.nationality || user?.nationality),
    id_type: guestInfo?.id_type || user?.id_type || "",
    id_number: normalizeText(guestInfo?.id_number || user?.id_number),
    id_expiry: normalizeText(guestInfo?.id_expiry || user?.id_expiry),
    id_doc_url: normalizeText(guestInfo?.id_doc_url || user?.id_doc_url),
    id_doc_public_id: normalizeText(guestInfo?.id_doc_public_id || user?.id_doc_public_id),
    live_photo_url: normalizeText(guestInfo?.live_photo_url),
    live_photo_public_id: normalizeText(guestInfo?.live_photo_public_id),
    _documents_uploading: Boolean(guestInfo?._documents_uploading),
  };
}

function validateGuestDetails(guest, t) {
  const errors = {};
  const phoneDigits = guest.phone.replace(/\D/g, "");
  if (!guest.full_name || guest.full_name.length < 2) errors.full_name = t("ops.validGuestName");
  if (!guest.phone) errors.phone = t("ops.phoneRequired");
  else if (phoneDigits.length < 10) errors.phone = t("auth.validPhone");
  if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
    errors.email = t("ops.validEmail");
  }
  if (!guest.id_type) errors.id_type = t("bookingUi.selectIdType");
  if (!guest.id_number || guest.id_number.length < 3) errors.id_number = t("ops.validIdNumber");
  return errors;
}

function validateIdentityProof(guest, t) {
  const errors = {};
  if (!guest.id_doc_url || !guest.id_doc_public_id) errors.id_doc_url = t("ops.validIdPhoto");
  if (!guest.live_photo_url || !guest.live_photo_public_id) {
    errors.live_photo_url = t("ops.freshLivePhoto");
  }
  if (guest._documents_uploading) errors.upload = t("ops.uploadFinish");
  return errors;
}

export default function BookingFlow() {
  const { t } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selection, setSelection, guestInfo, setGuestInfo, resetBooking } = useBookingStore();
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState({});
  const [quote, setQuote] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const checkoutTokens = useRef(new Map());
  const createBooking = useCreateBooking();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const checkInParam = searchParams.get("checkIn") || "";
  const checkOutParam = searchParams.get("checkOut") || "";
  const guestsParam = searchParams.get("guests") || "";
  const { data: room } = useRoomDetail(roomId, {
    checkIn: selection.checkIn || undefined,
    checkOut: selection.checkOut || undefined,
  });
  const mergedSelection = useMemo(() => ({
    ...selection,
    nights: calcNights(selection.checkIn, selection.checkOut),
  }), [selection]);

  useEffect(() => {
    const patch = {};
    if (checkInParam) patch.checkIn = checkInParam;
    if (checkOutParam) patch.checkOut = checkOutParam;
    if (guestsParam) patch.guests = guestsParam;
    if (Object.keys(patch).length) {
      setSelection(patch);
    } else {
      setSelection({ checkIn: "", checkInTime: "", checkOut: "", guests: 2, specialRequests: "" });
    }
  }, [checkInParam, checkOutParam, guestsParam, roomId, setSelection]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    authAPI.me().then((result) => {
      if (!active || !result?.data) return;
      const profile = result.data;
      setGuestInfo({
        full_name: guestInfo.full_name || profile.full_name || "",
        email: guestInfo.email || profile.email || "",
        phone: guestInfo.phone || profile.phone || "",
        nationality: guestInfo.nationality || profile.nationality || "",
        id_type: guestInfo.id_type || profile.id_type || "",
        id_number: guestInfo.id_number || profile.id_number || "",
        id_expiry: guestInfo.id_expiry || profile.id_expiry || "",
        id_doc_url: guestInfo.id_doc_url || profile.id_doc_url || "",
        id_doc_public_id: guestInfo.id_doc_public_id || profile.id_doc_public_id || "",
        live_photo_url: "",
        live_photo_public_id: "",
      });
    }).catch(() => {});
    return () => { active = false; };
    // A fresh live photo is deliberately required whenever this room flow opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, roomId]);

  const updateSelection = (patch) => {
    setSelection(patch);
    setQuote(null);
    setCouponCode("");
    setAppliedCouponCode("");
    setStepErrors({});
  };

  const validateStayStep = async () => {
    const errors = {};
    const guests = Number(mergedSelection.guests);
    if (!mergedSelection.checkIn) errors.checkIn = t("ops.checkInDateRequired");
    if (!mergedSelection.checkInTime) errors.checkInTime = t("ops.checkInTimeRequired");
    else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(mergedSelection.checkInTime)) {
      errors.checkInTime = t("ops.validCheckInTime");
    }
    if (!mergedSelection.checkOut) errors.checkOut = t("ops.checkOutDateRequired");
    if (mergedSelection.checkIn && mergedSelection.checkIn < todayDateInput()) {
      errors.checkIn = t("ops.pastCheckIn");
    }
    if (
      mergedSelection.checkIn
      && mergedSelection.checkOut
      && new Date(mergedSelection.checkOut) <= new Date(mergedSelection.checkIn)
    ) {
      errors.checkOut = t("ops.checkOutAfterCheckIn");
    }
    if (!Number.isInteger(guests) || guests < 1) errors.guests = t("ops.minimumGuest");
    if (room && guests > Number(room.capacity)) {
      errors.guests = t("ops.maximumGuests", { count: room.capacity });
    }
    if (!room) errors.availability = t("ops.roomLoading");

    if (Object.keys(errors).length) {
      setStepErrors(errors);
      return false;
    }

    try {
      const response = await bookingAPI.quote({
        room_id: Number(roomId),
        check_in: mergedSelection.checkIn,
        check_in_time: mergedSelection.checkInTime,
        check_out: mergedSelection.checkOut,
        guests,
      });
      setQuote(response.data);
      setCouponCode("");
      setAppliedCouponCode("");
      setStepErrors({});
      return true;
    } catch (error) {
      setQuote(null);
      setStepErrors({
        availability: getApiErrorMessage(error, t("bookingUi.roomUnavailable"), t),
      });
      return false;
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim() || !quote || couponBusy) return;
    try {
      setCouponBusy(true);
      const response = await couponAPI.validate({
        coupon_code: couponCode,
        room_id: Number(roomId),
        check_in: mergedSelection.checkIn,
        check_in_time: mergedSelection.checkInTime,
        check_out: mergedSelection.checkOut,
        guests: Number(mergedSelection.guests),
      });
      const normalizedCode = response.data.coupon.code;
      setQuote((current) => ({ ...current, ...response.data }));
      setCouponCode(normalizedCode);
      setAppliedCouponCode(normalizedCode);
      toast.success(t("bookingUi.couponApplied"));
    } catch (error) {
      setAppliedCouponCode("");
      toast.error(getApiErrorMessage(error, t("bookingUi.invalidCoupon"), t));
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    try {
      setCouponBusy(true);
      const response = await bookingAPI.quote({
        room_id: Number(roomId),
        check_in: mergedSelection.checkIn,
        check_in_time: mergedSelection.checkInTime,
        check_out: mergedSelection.checkOut,
        guests: Number(mergedSelection.guests),
      });
      setQuote(response.data);
      setCouponCode("");
      setAppliedCouponCode("");
      toast.success(t("shared.actionCompleted"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("apiErrors.generic"), t));
    } finally {
      setCouponBusy(false);
    }
  };

  const continueToNextStep = async () => {
    let valid = false;
    if (step === 0) valid = await validateStayStep();
    if (step === 1) {
      const errors = validateGuestDetails(resolveGuestInfo(guestInfo, user), t);
      setStepErrors(errors);
      valid = Object.keys(errors).length === 0;
    }
    if (step === 2) {
      const errors = validateIdentityProof(resolveGuestInfo(guestInfo, user), t);
      setStepErrors(errors);
      valid = Object.keys(errors).length === 0;
    }
    if (valid) {
      setStepErrors({});
      setStep((current) => Math.min(current + 1, 3));
    }
  };

  const checkoutTokenFor = (paymentMethod) => {
    const key = [
      roomId,
      mergedSelection.checkIn,
      mergedSelection.checkInTime,
      mergedSelection.checkOut,
      mergedSelection.guests,
      paymentMethod,
    ].join("|");
    if (!checkoutTokens.current.has(key)) checkoutTokens.current.set(key, createCheckoutToken());
    return checkoutTokens.current.get(key);
  };

  const submitBooking = async (paymentMethod) => {
    if (paymentBusy) return;
    if (!isAuthenticated || !token) {
      const intended = `/book/${roomId}?${searchParams.toString()}`;
      navigate(`/login?redirectTo=${encodeURIComponent(intended)}`, {
        state: { redirectTo: intended },
      });
      return;
    }

    const proofErrors = validateIdentityProof(resolveGuestInfo(guestInfo, user), t);
    if (Object.keys(proofErrors).length) {
      setStep(2);
      setStepErrors(proofErrors);
      return;
    }
    if (!quote && !(await validateStayStep())) {
      setStep(0);
      return;
    }

    const resolvedGuest = resolveGuestInfo(guestInfo, user);
    let orderData = null;
    let checkoutCompleted = false;
    try {
      setPaymentBusy(paymentMethod);
      const response = await createBooking.mutateAsync({
        room_id: Number(roomId),
        check_in: mergedSelection.checkIn,
        check_in_time: mergedSelection.checkInTime,
        check_out: mergedSelection.checkOut,
        guests: Number(mergedSelection.guests),
        special_requests: mergedSelection.specialRequests,
        payment_method: paymentMethod,
        checkout_token: checkoutTokenFor(paymentMethod),
        coupon_code: appliedCouponCode || undefined,
        guest: resolvedGuest,
      });
      orderData = response.data;

      const paymentResponse = await openRazorpayCheckout({
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: t("common.hotelName"),
        description: paymentMethod === "pay_later"
          ? `10% reservation advance for ${orderData.booking.booking_ref}`
          : `Full payment for ${orderData.booking.booking_ref}`,
        prefill: {
          name: resolvedGuest.full_name,
          email: resolvedGuest.email,
          contact: resolvedGuest.phone,
        },
        notes: {
          booking_id: String(orderData.booking_id),
          payment_type: orderData.payment_type,
        },
        theme: { color: "#0A4D34" },
      });
      checkoutCompleted = true;

      const verified = await bookingAPI.verifyPayment({
        booking_id: orderData.booking_id,
        ...paymentResponse,
      });
      resetBooking();
      if (paymentMethod === "pay_later") {
        toast.success(t("bookingUi.bookingConfirmed"));
        navigate("/customer/my-bookings");
      } else {
        toast.success(t("bookingUi.bookingConfirmed"));
        navigate(`/booking/confirmed/${verified.data.bookingRef}`);
      }
    } catch (error) {
      if (orderData && !checkoutCompleted) {
        bookingAPI.markPaymentFailed(orderData.booking_id, {
          razorpay_order_id: orderData.order_id,
          reason: error.message,
        }).catch(() => {});
      }
      toast.error(getApiErrorMessage(error, t("bookingUi.paymentFailed"), t));
    } finally {
      setPaymentBusy("");
    }
  };

  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow={t("ops.bookYourStay")}
        title={t("ops.reserveRoom", { room: room?.name || t("ops.yourRoom") })}
        description={t("ops.bookingStepsDescription")}
      />
      <div className="mt-8 space-y-6">
        <BookingStepIndicator currentStep={step} />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="section-card p-6">
            {step === 0 ? (
              <div className="space-y-4">
                <InputField
                  error={stepErrors.checkIn}
                  label={t("room.checkIn")}
                  type="date"
                  min={todayDateInput()}
                  value={selection.checkIn || ""}
                  onChange={(event) => {
                    const nextCheckIn = event.target.value;
                    const patch = { checkIn: nextCheckIn };
                    if (selection.checkOut && nextCheckIn && new Date(selection.checkOut) <= new Date(nextCheckIn)) {
                      patch.checkOut = "";
                    }
                    updateSelection(patch);
                  }}
                />
                <InputField
                  error={stepErrors.checkInTime}
                  label={t("ops.expectedCheckIn")}
                  type="time"
                  value={selection.checkInTime || ""}
                  onChange={(event) => updateSelection({ checkInTime: event.target.value })}
                  required
                />
                <InputField
                  error={stepErrors.checkOut}
                  label={t("room.checkOut")}
                  type="date"
                  min={selection.checkIn ? addDays(selection.checkIn, 1) : addDays(todayDateInput(), 1)}
                  value={selection.checkOut || ""}
                  onChange={(event) => updateSelection({ checkOut: event.target.value })}
                />
                <InputField
                  error={stepErrors.guests}
                  label={t("room.guests")}
                  type="number"
                  min="1"
                  max={room?.capacity || 10}
                  value={selection.guests || ""}
                  onChange={(event) => updateSelection({ guests: event.target.value })}
                />
                {stepErrors.availability ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {stepErrors.availability}
                  </div>
                ) : null}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">{t("bookingUi.specialRequests")}</span>
                  <textarea
                    className="min-h-32 w-full rounded-[24px] border border-divider px-4 py-3"
                    value={selection.specialRequests || ""}
                    onChange={(event) => updateSelection({ specialRequests: event.target.value })}
                  />
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <GuestDetailsForm form={guestInfo} setForm={setGuestInfo} errors={stepErrors} />
            ) : null}
            {step === 2 ? (
              <NationalityIDForm form={guestInfo} setForm={setGuestInfo} errors={stepErrors} />
            ) : null}
            {step === 3 ? (
              <div className="space-y-6">
                <PaymentWidget
                  room={room}
                  selection={mergedSelection}
                  quote={quote}
                  onPayOnline={() => submitBooking("online")}
                  busy={Boolean(paymentBusy)}
                  couponCode={couponCode}
                  setCouponCode={setCouponCode}
                  appliedCouponCode={appliedCouponCode}
                  onApplyCoupon={applyCoupon}
                  onRemoveCoupon={removeCoupon}
                  couponBusy={couponBusy}
                />
                <PostponePaymentOption
                  onReserve={() => submitBooking("pay_later")}
                  busy={Boolean(paymentBusy)}
                  totalAmount={quote?.total_amount || 0}
                  advanceAmount={quote?.advance_required}
                />
              </div>
            ) : null}

            <div className="mt-6 flex justify-between">
              {step > 0 ? (
                <Button
                  variant="outline"
                  disabled={Boolean(paymentBusy)}
                  onClick={() => {
                    setStepErrors({});
                    setStep((current) => Math.max(current - 1, 0));
                  }}
                >
                  {t("shared.goBack")}
                </Button>
              ) : <span />}
              {step < 3 ? (
                <Button onClick={continueToNextStep}>
                  {t("shared.continue")}
                </Button>
              ) : null}
            </div>
          </div>
          <BookingSummary room={room} selection={mergedSelection} quote={quote} />
        </div>
      </div>
    </div>
  );
}
