import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import StarRating from "../../components/forms/StarRating";
import Button from "../../components/common/Button";
import { feedbackAPI } from "../../api/feedbackAPI";
import { useDebounce } from "../../hooks/useDebounce";
import { formatBookedDate, formatISTDateTimeForReport } from "../../utils/hotelDate";

function formatDateTime(value) {
  return formatISTDateTimeForReport(value);
}

function StatusBadge({ status, t }) {
  const tones = {
    pending: "bg-amber-50 text-amber-700",
    published: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${tones[status] || tones.pending}`}>
      {t(`statuses.feedback.${status}`, { defaultValue: status })}
    </span>
  );
}

export default function FeedbackAdmin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: "", source: "" });
  const debouncedSearch = useDebounce(filters.q, 300);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-feedbacks", debouncedSearch, filters.source],
    queryFn: () => feedbackAPI.adminList({
      q: debouncedSearch || undefined,
      source: filters.source || undefined,
    }),
  });

  const feedbacks = res?.data || [];

  const moderateMutation = useMutation({
    mutationFn: ({ id, payload }) => feedbackAPI.moderate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      toast.success(t("ops.updated"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: feedbackAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedbacks"] });
      toast.success(t("ops.deleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleDelete = (id) => {
    if (window.confirm(t("ops.deleteFeedback"))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("ops.feedbackManagement")}
        title={t("admin.feedbackTitle")}
        description={t("ops.feedbackDescription")}
      />

      <div className="section-card grid gap-4 p-5 md:grid-cols-2">
        <InputField
          label={t("ops.searchFeedback")}
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          placeholder={t("shared.search")}
        />
        <SelectField
          label={t("ops.feedbackSource")}
          value={filters.source}
          onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}
          options={[
            { label: t("ops.allFeedback"), value: "" },
            { label: t("ops.checkoutFeedback"), value: "receptionist_checkout" },
            { label: t("ops.customerSubmitted"), value: "customer" },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="p-5 text-sm text-mutedText">{t("ops.loadingFeedback")}</p>
      ) : feedbacks.length === 0 ? (
        <div className="section-card p-12 text-center text-mutedText">
          <p className="text-lg font-semibold">{t("ops.noCheckoutFeedback")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((item) => {
            const booking = item.booking;
            const room = booking?.room;
            const receptionistName = item.collected_by_receptionist_name
              || item.collectedByReceptionist?.full_name;
            const isCheckoutFeedback = item.source === "receptionist_checkout";

            return (
              <article key={item.id} className="section-card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">{item.cust_name || t("ops.guest")}</h3>
                      <StarRating value={Number(item.rating || 0)} readOnly />
                      <StatusBadge status={item.status} t={t} />
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {isCheckoutFeedback ? t("ops.receptionCheckout") : t("ops.customerSubmitted")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-darkText">{item.comment}</p>
                    {item.internal_note ? (
                      <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        <strong>{t("ops.internalNote")}:</strong> {item.internal_note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status !== "published" ? (
                      <Button
                        onClick={() => moderateMutation.mutate({ id: item.id, payload: { status: "published" } })}
                        disabled={moderateMutation.isPending}
                      >
                        {t("shared.approve")}
                      </Button>
                    ) : null}
                    {item.status !== "rejected" ? (
                      <Button
                        variant="outline"
                        onClick={() => moderateMutation.mutate({ id: item.id, payload: { status: "rejected" } })}
                        disabled={moderateMutation.isPending}
                      >
                        {t("shared.reject")}
                      </Button>
                    ) : null}
                    <Button variant="outline" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>

                <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-mutedText">{t("shared.bookingId")}</dt>
                    <dd className="font-semibold">{booking?.booking_ref || (item.booking_id ? `#${item.booking_id}` : t("shared.notAvailable"))}</dd>
                  </div>
                  <div>
                    <dt className="text-mutedText">{t("ops.room")}</dt>
                    <dd className="font-semibold">
                      {item.room_number || room?.room_number || "N/A"}
                      {(item.room_name || room?.name || item.room_category || room?.category)
                        ? ` - ${item.room_name || room?.name || item.room_category || room?.category}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mutedText">{t("customer.checkIn")}</dt>
                    <dd className="font-semibold">{formatBookedDate(item.check_in_date || booking?.check_in)}</dd>
                  </div>
                  <div>
                    <dt className="text-mutedText">{t("customer.checkOut")}</dt>
                    <dd className="font-semibold">{formatBookedDate(item.check_out_date || booking?.check_out)}</dd>
                  </div>
                  <div>
                    <dt className="text-mutedText">{t("ops.collectedBy")}</dt>
                    <dd className="font-semibold">{receptionistName || (isCheckoutFeedback ? t("layout.receptionTitle") : t("shared.customer"))}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-mutedText">{t("ops.collectedAt")}</dt>
                    <dd className="font-semibold">{formatDateTime(item.collected_at || item.created_at)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
