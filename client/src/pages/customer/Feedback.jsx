import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import StarRating from "../../components/forms/StarRating";
import Button from "../../components/common/Button";
import { useMyBookings } from "../../hooks/useBookings";
import { feedbackAPI } from "../../api/feedbackAPI";
import { useAuthStore } from "../../store/authStore";

export default function Feedback() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { data } = useMyBookings();
  const [forms, setForms] = useState({});

  const submitMutation = useMutation({
    mutationFn: feedbackAPI.submit,
    onSuccess: (_, variables) => {
      toast.success(t("customer.feedbackSuccess"));
      setForms((prev) => ({
        ...prev,
        [variables.booking_id]: { rating: 0, title: "", comment: "" },
      }));
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || t("customer.feedbackFailed"));
    },
  });

  const eligibleBookings = (data?.data || []).filter(
    (booking) => booking.status === "checked_out" && !booking.history?.feedback_given
  );

  const updateForm = (bookingId, updates) => {
    setForms((prev) => ({
      ...prev,
      [bookingId]: {
        rating: prev[bookingId]?.rating || 0,
        title: prev[bookingId]?.title || "",
        comment: prev[bookingId]?.comment || "",
        ...updates,
      },
    }));
  };

  const handleSubmit = (booking) => {
    const form = forms[booking.id] || { rating: 0, title: "", comment: "" };

    if (!form.rating) {
      toast.error(t("customer.selectRating"));
      return;
    }

    if (!form.comment.trim()) {
      toast.error(t("customer.addReview"));
      return;
    }

    submitMutation.mutate({
      booking_id: booking.id,
      cust_name: user?.full_name || user?.name || "Guest",
      rating: form.rating,
      title: form.title.trim(),
      comment: form.comment.trim(),
      room_category: booking.room?.category,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.feedback")} title={t("customer.feedbackTitle")} description={t("customer.feedbackDescription")} />
      <div className="space-y-5">
        {eligibleBookings.map((booking) => {
          const form = forms[booking.id] || { rating: 0, title: "", comment: "" };

          return (
            <div key={booking.id} className="section-card p-6">
              <div className="flex items-center gap-4">
                <img src={booking.room?.images?.[0] || "/assets/images/placeholder-room.svg"} alt={booking.room?.name || booking.booking_ref} className="h-20 w-24 rounded-2xl object-cover" />
                <div>
                  <p className="font-heading text-2xl">{booking.room?.name || t("customer.completedStay")}</p>
                  <p className="text-sm text-mutedText">{booking.booking_ref}</p>
                </div>
              </div>
              <div className="mt-5">
                <StarRating value={form.rating} onChange={(value) => updateForm(booking.id, { rating: value })} />
              </div>
              <input
                className="mt-4 w-full rounded-[24px] border border-divider px-4 py-3"
                placeholder={t("customer.reviewTitle")}
                value={form.title}
                onChange={(event) => updateForm(booking.id, { title: event.target.value })}
              />
              <textarea
                className="mt-4 min-h-28 w-full rounded-[24px] border border-divider px-4 py-3"
                placeholder={t("customer.reviewPlaceholder")}
                value={form.comment}
                onChange={(event) => updateForm(booking.id, { comment: event.target.value })}
              />
              <Button className="mt-4" onClick={() => handleSubmit(booking)} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? t("common.submitting") : t("customer.submitReview")}
              </Button>
            </div>
          );
        })}
        {eligibleBookings.length === 0 ? <p className="text-mutedText">{t("customer.noFeedback")}</p> : null}
      </div>
    </div>
  );
}

/*
import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StarRating from "../../components/forms/StarRating";
import Button from "../../components/common/Button";
import { mockTrips } from "../../utils/mockData";

export default function Feedback() {
  const [ratings, setRatings] = useState({});

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Feedback" title="Share your stay experience" description="Your review helps future travelers and helps us refine the stay experience." />
      <div className="space-y-5">
        {mockTrips.filter((item) => item.status === "checked_out").map((booking) => (
          <div key={booking.id} className="section-card p-6">
            <div className="flex items-center gap-4">
              <img src={booking.image} alt={booking.room_name} className="h-20 w-24 rounded-2xl object-cover" />
              <div>
                <p className="font-heading text-2xl">{booking.room_name}</p>
                <p className="text-sm text-mutedText">{booking.booking_ref}</p>
              </div>
            </div>
            <div className="mt-5">
              <StarRating value={ratings[booking.id] || 0} onChange={(value) => setRatings({ ...ratings, [booking.id]: value })} />
            </div>
            <textarea className="mt-4 min-h-28 w-full rounded-[24px] border border-divider px-4 py-3" placeholder="What stood out about your stay?" />
            <Button className="mt-4">Submit Review</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
*/
