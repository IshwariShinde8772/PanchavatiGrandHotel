import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import QrPaymentPanel from "../../components/booking/QrPaymentPanel";
import { transactionAPI } from "../../api/transactionAPI";

export default function Transactions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: response, isLoading } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: transactionAPI.mine,
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id }) => transactionAPI.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success(t("customer.paymentCompleted"));
    },
    onError: () => toast.error(t("customer.paymentConfirmFailed")),
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ id }) => transactionAPI.regenerateQr(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setActiveId(result?.data?.transaction?.id || null);
      toast.success(t("customer.qrGenerated"));
    },
    onError: () => toast.error(t("customer.qrGenerateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => transactionAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      setSelectedIds(new Set());
      toast.success(t("customer.transactionDeleted"));
    },
    onError: () => toast.error(t("customer.transactionDeleteFailed")),
  });

  const clearMutation = useMutation({
    mutationFn: () => transactionAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      setSelectedIds(new Set());
      toast.success(t("customer.transactionsCleared"));
    },
    onError: () => toast.error(t("customer.transactionsClearFailed")),
  });

  const rows = response?.data || [];
  const deletableRows = useMemo(
    () => rows.filter((item) => item.payment_method !== "online"),
    [rows]
  );
  const activeTransaction = useMemo(() => {
    if (activeId) return rows.find((item) => item.id === activeId) || null;
    return rows.find((item) => item.status === "pending" && item.payment_method === "qr") || rows[0] || null;
  }, [activeId, rows]);

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? new Set(deletableRows.map((row) => row.id)) : new Set());
  };

  const handleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t("customer.deleteTransactionsConfirm", { count: selectedIds.size }))) return;

    for (const id of selectedIds) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t("customer.clearTransactionsConfirm"))) return;
    await clearMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.transactions")} title={t("customer.transactionsTitle")} description={t("customer.transactionsDescription")} />

      {activeTransaction && activeTransaction.status === "pending" && activeTransaction.payment_method === "qr" ? (
        <QrPaymentPanel
          transaction={activeTransaction}
          title={t("customer.pendingQrPayment")}
          subtitle={t("customer.bookingReference", { ref: activeTransaction.booking_ref || "" })}
          busy={confirmMutation.isPending || regenerateMutation.isPending}
          onConfirm={() => confirmMutation.mutate({ id: activeTransaction.id })}
          onRegenerate={() => regenerateMutation.mutate({ id: activeTransaction.id })}
        />
      ) : activeTransaction ? (
        <div className="section-card p-6">
          <h3 className="font-heading text-2xl">{t("customer.transactionSummary")}</h3>
          <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-2">
            <p>{t("common.booking")}: {activeTransaction.booking_ref || "-"}</p>
            <p>{t("common.amount")}: INR {activeTransaction.amount}</p>
            <p>{t("common.status")}: {activeTransaction.status}</p>
            <p>{t("common.method")}: {activeTransaction.payment_method}</p>
            <p>{t("common.room")}: {activeTransaction.room_name || "-"}</p>
            <p>{t("common.reference")}: {activeTransaction.payment_reference || "-"}</p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="p-6 text-mutedText">{t("customer.loadingTransactions")}</p>
      ) : (
        <div className="space-y-4">
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDeleteSelected} disabled={selectedIds.size === 0 || deleteMutation.isPending}>
                {t("customer.deleteSelected", { count: selectedIds.size })}
              </Button>
              <Button variant="outline" onClick={handleClearAll} disabled={deleteMutation.isPending || clearMutation.isPending} className="text-red-600 hover:bg-red-50">
                {t("common.clearAll")}
              </Button>
            </div>
          )}

          <div className="section-card divide-y divide-divider overflow-hidden">
            {rows.length > 0 && (
              <div className="grid gap-4 border-b border-divider p-5 md:grid-cols-[40px_1.1fr_0.8fr_0.8fr_180px] md:items-center">
                <input type="checkbox" checked={selectedIds.size === deletableRows.length && deletableRows.length > 0} onChange={handleSelectAll} className="rounded" />
                <div className="text-sm font-semibold">{t("customer.bookingReferenceHeader")}</div>
                <div className="text-sm font-semibold">{t("common.amount")}</div>
                <div className="text-sm font-semibold">{t("common.status")}</div>
                <div className="text-sm font-semibold">{t("common.actions")}</div>
              </div>
            )}
            {rows.map((item) => (
              <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[40px_1.1fr_0.8fr_0.8fr_180px] md:items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  disabled={item.payment_method === "online"}
                  onChange={() => handleSelectOne(item.id)}
                  className="rounded disabled:opacity-40"
                />
                <div>
                  <p className="font-semibold">{item.booking_ref || t("customer.transactionNumber", { id: item.id })}</p>
                  <p className="text-sm text-mutedText">
                    {item.room_name || t("customer.roomBookingLabel")} {item.room_number ? `• ${t("customer.roomNumber", { number: item.room_number })}` : ""}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">INR {item.amount}</p>
                  <p className="text-sm text-mutedText">{item.payment_method}</p>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.status === "paid"
                      ? "bg-green-50 text-green-700"
                      : item.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {item.status === "pending" && item.payment_method === "qr" ? <Button variant="outline" size="sm" onClick={() => setActiveId(item.id)}>{t("customer.openQr")}</Button> : null}
                  {item.status !== "pending" ? <Button variant="outline" size="sm" onClick={() => setActiveId(item.id)}>{t("customer.view")}</Button> : null}
                  {item.payment_method !== "online" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(t("customer.deleteTransactionConfirm"))) {
                          deleteMutation.mutate({ id: item.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="flex-shrink-0 text-red-600 hover:bg-red-50"
                    >
                      {t("common.delete")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {rows.length === 0 ? <p className="p-6 text-center text-mutedText">{t("customer.noTransactions")}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
