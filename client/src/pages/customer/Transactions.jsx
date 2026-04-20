import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import QrPaymentPanel from "../../components/booking/QrPaymentPanel";
import { transactionAPI } from "../../api/transactionAPI";

export default function Transactions() {
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
      toast.success("Payment marked as completed");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to confirm payment"),
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ id }) => transactionAPI.regenerateQr(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setActiveId(result?.data?.transaction?.id || null);
      toast.success("New QR generated");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to generate a new QR"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => transactionAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      setSelectedIds(new Set());
      toast.success("Transaction deleted");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to delete transaction"),
  });

  const clearMutation = useMutation({
    mutationFn: () => transactionAPI.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-transactions"] });
      setSelectedIds(new Set());
      toast.success("All transactions cleared");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to clear transactions"),
  });

  const rows = response?.data || [];
  const activeTransaction = useMemo(() => {
    if (activeId) {
      return rows.find((item) => item.id === activeId) || null;
    }

    return rows.find((item) => item.status === "pending") || rows[0] || null;
  }, [activeId, rows]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} transaction(s)? This action cannot be undone.`)) return;

    for (const id of selectedIds) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all transactions? This action cannot be undone.")) return;
    await clearMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Payment history and pending QR payments"
        description="Track paid and pending bookings, reopen a QR, and keep a full payment log inside your account."
      />

      {activeTransaction && activeTransaction.status === "pending" ? (
        <QrPaymentPanel
          transaction={activeTransaction}
          title="Pending QR Payment"
          subtitle={`Booking ${activeTransaction.booking_ref || ""}`}
          busy={confirmMutation.isPending || regenerateMutation.isPending}
          onConfirm={() => confirmMutation.mutate({ id: activeTransaction.id })}
          onRegenerate={() => regenerateMutation.mutate({ id: activeTransaction.id })}
        />
      ) : activeTransaction ? (
        <div className="section-card p-6">
          <h3 className="font-heading text-2xl">Transaction Summary</h3>
          <div className="mt-4 grid gap-3 text-sm text-mutedText md:grid-cols-2">
            <p>Booking: {activeTransaction.booking_ref || "-"}</p>
            <p>Amount: INR {activeTransaction.amount}</p>
            <p>Status: {activeTransaction.status}</p>
            <p>Method: {activeTransaction.payment_method}</p>
            <p>Room: {activeTransaction.room_name || "-"}</p>
            <p>Reference: {activeTransaction.payment_reference || "-"}</p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="p-6 text-mutedText">Loading transactions...</p>
      ) : (
        <div className="space-y-4">
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0 || deleteMutation.isPending}
              >
                Delete Selected ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAll}
                disabled={deleteMutation.isPending || clearMutation.isPending}
                className="text-red-600 hover:bg-red-50"
              >
                Clear All
              </Button>
            </div>
          )}

          <div className="section-card divide-y divide-divider overflow-hidden">
            {rows.length > 0 && (
              <div className="grid gap-4 p-5 md:grid-cols-[40px_1.1fr_0.8fr_0.8fr_180px] md:items-center border-b border-divider">
                <input
                  type="checkbox"
                  checked={selectedIds.size === rows.length && rows.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <div className="font-semibold text-sm">Booking/Reference</div>
                <div className="font-semibold text-sm">Amount</div>
                <div className="font-semibold text-sm">Status</div>
                <div className="font-semibold text-sm">Actions</div>
              </div>
            )}
            {rows.map((item) => (
              <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[40px_1.1fr_0.8fr_0.8fr_180px] md:items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => handleSelectOne(item.id)}
                  className="rounded"
                />
                <div>
                  <p className="font-semibold">{item.booking_ref || `Transaction #${item.id}`}</p>
                  <p className="text-sm text-mutedText">{item.room_name || "Room booking"} {item.room_number ? `• Room ${item.room_number}` : ""}</p>
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
                  {item.status === "pending" ? (
                    <Button variant="outline" size="sm" onClick={() => setActiveId(item.id)}>Open QR</Button>
                  ) : null}
                  {item.status !== "pending" ? (
                    <Button variant="outline" size="sm" onClick={() => setActiveId(item.id)}>View</Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this transaction?")) {
                        deleteMutation.mutate({ id: item.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 ? <p className="p-6 text-center text-mutedText">No transactions found yet.</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
