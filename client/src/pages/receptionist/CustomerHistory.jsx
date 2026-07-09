import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { bookingAPI } from "../../api/bookingAPI";
import { bookingStatusLabel, paymentStatusLabel, roomCategoryLabel } from "../../utils/i18nLabels";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatHotelDateTime } from "../../utils/hotelDate";

export default function CustomerHistory() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch history
  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-customer-history"],
    queryFn: () => bookingAPI.receptionistList({ status: "checked_out" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => bookingAPI.delete(id),
    onSuccess: () => {
      toast.success(t("ops.deleted"));
      queryClient.invalidateQueries({ queryKey: ["receptionist-customer-history"] });
      setShowDeleteConfirm(false);
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const trips = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.guestHistory")}
        title={t("ops.historyTitle")}
        description={t("ops.historyDescription")}
      />

      {selectedTrip && (
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">{t("ops.tripDetails")} - {selectedTrip.booking_ref}</h3>
            <button onClick={() => setSelectedTrip(null)} className="text-mutedText hover:text-black">✕</button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-mutedText">{t("ops.guestName")}</p>
                <p className="font-semibold">{selectedTrip.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("shared.phone")}</p>
                <p className="font-semibold">{selectedTrip.customer?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("shared.email")}</p>
                <p className="font-semibold break-all">{selectedTrip.customer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("ops.nationality")}</p>
                <p className="font-semibold">{selectedTrip.customer?.nationality}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-mutedText">{t("ops.room")}</p>
                <p className="font-semibold">{selectedTrip.room?.name} (#{selectedTrip.room?.room_number})</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("ops.dates")}</p>
                <p className="font-semibold">{selectedTrip.check_in} → {selectedTrip.check_out}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("shared.paymentStatus")}</p>
                <p className="font-semibold capitalize">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedTrip.payment_status === "paid" ? "bg-green-100 text-green-700" :
                    selectedTrip.payment_status === "paid_at_hotel" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {paymentStatusLabel(t, selectedTrip.payment_status)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("common.amount")}</p>
                <p className="font-semibold">INR {selectedTrip.total_amount}</p>
              </div>
            </div>
          </div>

          {selectedTrip.payment_proof_url && (
            <div className="mt-6 pt-6 border-t border-divider">
              <h4 className="font-semibold mb-3">{t("ops.paymentProof")}</h4>
              <a 
                href={selectedTrip.payment_proof_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img 
                  src={selectedTrip.payment_proof_url} 
                  alt={t("ops.paymentProof")}
                  className="max-w-xs max-h-64 rounded-lg border border-divider"
                />
              </a>
            </div>
          )}

          {(selectedTrip.extensionRequests || []).length ? (
            <div className="mt-6 border-t border-divider pt-6">
              <h4 className="mb-3 font-semibold">Extension & Payment History</h4>
              <div className="space-y-3">
                {selectedTrip.extensionRequests.map((extension) => (
                  <div key={extension.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                    <p className="font-semibold">
                      {extension.original_checkout_date || extension.requested_from}
                      {" → "}
                      {extension.extended_checkout_date || extension.requested_to}
                    </p>
                    <p>Extension amount: {formatCurrency(extension.extension_payable_amount ?? extension.extra_amount)}</p>
                    <p>Payment: {extension.payment_status}{extension.payment_method ? ` · ${extension.payment_method}` : ""}</p>
                    {extension.payment_reference ? <p>Reference: {extension.payment_reference}</p> : null}
                    {extension.payment_confirmed_at ? <p>Confirmed: {formatHotelDateTime(extension.payment_confirmed_at)}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">{t("ops.loadingHistory")}</p>
        ) : trips.length === 0 ? (
          <p className="p-5 text-mutedText">{t("ops.noHistory")}</p>
        ) : (
          trips.map((trip) => (
            <div key={trip.id} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="font-semibold">{trip.booking_ref}</p>
                    <p className="text-sm text-mutedText">{trip.customer?.full_name}</p>
                  </div>
                  <div>
                    <p>{trip.room?.room_number}</p>
                    <p className="text-xs text-mutedText">{roomCategoryLabel(t, trip.room?.category)}</p>
                  </div>
                  <p className="text-sm">{trip.check_in}</p>
                  <p className="text-sm">{trip.check_out}</p>
                  <p className="text-sm capitalize">{bookingStatusLabel(t, trip)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedTrip(trip)}
                  >
                    {t("shared.view")}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleDelete(trip.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm">
            <h3 className="font-heading text-xl mb-2">{t("ops.deleteRecord")}</h3>
            <p className="text-mutedText mb-6">
              {t("ops.deleteHistoryConfirm")}
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button 
                variant="secondary"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t("ops.deleting") : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
