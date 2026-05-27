import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import BillPreview from "../../components/bill/BillPreview";
import Button from "../../components/common/Button";
import QrPaymentPanel from "../../components/booking/QrPaymentPanel";
import { 
  useBookingDetail, 
  useBookingExtensions, 
  useCreateExtensionRequest, 
  usePayExtensionRequest,
  useExtensionTransactions,
  useConfirmExtensionTransaction,
  useDeleteExtensionTransaction,
} from "../../hooks/useBookings";
import { formatCurrency } from "../../utils/formatCurrency";

export default function BookingDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: booking } = useBookingDetail(id);
  const { data: extensionsResponse } = useBookingExtensions(id);
  const { data: transactionsResponse } = useExtensionTransactions(id);
  const createExtension = useCreateExtensionRequest();
  const payExtension = usePayExtensionRequest();
  const confirmTransaction = useConfirmExtensionTransaction();
  const deleteTransaction = useDeleteExtensionTransaction();

  const extensionRequests = extensionsResponse?.data || [];
  const extensionTransactions = transactionsResponse?.data || [];
  const activeRequest = extensionRequests.find((request) => request.status === "pending" || request.status === "approved") || null;
  const pendingExtensionTransaction = extensionTransactions.find((t) => t.status === "pending" && t.payment_method === "qr");
  const [activeTransactionId, setActiveTransactionId] = useState(null);
  const [expandPayments, setExpandPayments] = useState(false);

  const [form, setForm] = useState({
    requested_from: "",
    requested_to: "",
    reason: "",
  });

  useEffect(() => {
    if (booking?.check_out) {
      setForm(prev => ({
        ...prev,
        requested_from: booking.check_out,
        requested_to: booking.check_out,
      }));
    }
  }, [booking]);

  if (!booking) return null;

  const canRequestExtension = !["cancelled", "checked_out"].includes(booking.status);

  const handleCreateRequest = async () => {
    if (!form.requested_from || !form.requested_to || !form.reason.trim()) {
      toast.error(t("customer.fillExtension"));
      return;
    }

    try {
      await createExtension.mutateAsync({
        bookingId: id,
        payload: {
          requested_from: form.requested_from,
          requested_to: form.requested_to,
          reason: form.reason.trim(),
        },
      });
      toast.success(t("customer.extensionSubmitted"));
    } catch (error) {
      toast.error(error.response?.data?.error || t("customer.extensionFailed"));
    }
  };

  const handleConfirmPayment = async () => {
    if (!activeRequest) {
      return;
    }

    try {
      await payExtension.mutateAsync({ bookingId: id, requestId: activeRequest.id });
      toast.success(t("customer.extensionPaymentConfirmed"));
    } catch (error) {
      toast.error(error.response?.data?.error || t("customer.extensionPaymentFailed"));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow={t("customer.bookingDetail")}
        title={booking.booking_ref}
        description={`${booking.room_name || booking.room?.name} • ${booking.status}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="section-card p-6 space-y-6">
          <div className="grid gap-3 text-sm text-mutedText md:grid-cols-2">
            <div>
              <p className="font-semibold">{t("customer.checkIn")}</p>
              <p>{booking.check_in}</p>
            </div>
            <div>
              <p className="font-semibold">{t("customer.checkOut")}</p>
              <p>{booking.check_out}</p>
            </div>
            <div>
              <p className="font-semibold">{t("common.guests")}</p>
              <p>{booking.guests}</p>
            </div>
            <div>
              <p className="font-semibold">{t("common.status")}</p>
              <p>{booking.status}</p>
            </div>
            <div>
              <p className="font-semibold">{t("customer.paymentStatus")}</p>
              <p>{booking.payment_status}</p>
            </div>
            <div>
              <p className="font-semibold">{t("customer.paymentMethod")}</p>
              <p>{booking.payment_method || t("customer.notSelected")}</p>
            </div>
          </div>

          {activeRequest ? (
            <div className="border rounded-2xl border-saffron/20 bg-saffron/5 p-6">
              <h3 className="text-xl font-semibold text-vineyard mb-3">{t("customer.extensionStatus")}</h3>
              <div className="grid gap-3 text-sm text-mutedText md:grid-cols-2">
                <div>
                  <p className="font-medium">{t("common.status")}</p>
                  <p>{activeRequest.status}</p>
                </div>
                <div>
                  <p className="font-medium">{t("common.payment")}</p>
                  <p>{activeRequest.payment_status}</p>
                </div>
                <div>
                  <p className="font-medium">{t("customer.requestedStay")}</p>
                  <p>{activeRequest.requested_from} → {activeRequest.requested_to}</p>
                </div>
                <div>
                  <p className="font-medium">{t("customer.extraAmount")}</p>
                  <p>{formatCurrency(activeRequest.extra_amount)}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-mutedText">
                <p><strong>{t("customer.reason")}</strong> {activeRequest.reason}</p>
                {activeRequest.response_text && <p className="mt-2"><strong>{t("customer.staffNote")}</strong> {activeRequest.response_text}</p>}
              </div>
              {activeRequest.status === "approved" && activeRequest.payment_status === "pending" && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={handleConfirmPayment} disabled={payExtension.isLoading}>
                    {payExtension.isLoading ? t("customer.confirmingPayment") : t("customer.confirmPayment")}
                  </Button>
                  <p className="text-sm text-mutedText">{t("customer.extensionPaymentHint")}</p>
                </div>
              )}
            </div>
          ) : null}

          {pendingExtensionTransaction && (
            <QrPaymentPanel
              transaction={pendingExtensionTransaction}
              title={t("customer.extensionPaymentQr")}
              subtitle={t("customer.extensionPaymentSubtitle", { date: activeRequest?.requested_to || t("customer.extensionDate") })}
              busy={confirmTransaction.isPending}
              onConfirm={() => confirmTransaction.mutate({ id: pendingExtensionTransaction.id })}
              onRegenerate={() => {
                // If regenerate is available for extension transactions
                toast.info(t("customer.contactReceptionQr"));
              }}
            />
          )}

          {extensionTransactions.length > 0 && (
            <div className="border rounded-2xl border-divider p-6">
              <button
                onClick={() => setExpandPayments(!expandPayments)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="text-xl font-semibold text-vineyard">{t("customer.extensionPaymentHistory")}</h3>
                <span className={`transform transition-transform ${expandPayments ? "rotate-180" : ""}`}>▼</span>
              </button>
              
              {expandPayments && (
                <div className="mt-4 space-y-3">
                  {extensionTransactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-xl border border-divider bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{t("customer.paymentNumber", { id: transaction.id })}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              transaction.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : transaction.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-200 text-slate-700"
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-mutedText">{t("common.amount")}: {formatCurrency(transaction.amount)}</p>
                          <p className="text-sm text-mutedText">{t("common.method")}: {transaction.payment_method}</p>
                          {transaction.payment_reference && <p className="text-sm text-mutedText">Ref: {transaction.payment_reference}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {transaction.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // View QR
                                toast.info(t("customer.openingPayment"));
                              }}
                            >
                              {t("customer.view")}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(t("customer.deletePaymentConfirm"))) {
                                deleteTransaction.mutate({ id: transaction.id });
                              }
                            }}
                            disabled={deleteTransaction.isPending}
                            className="text-red-600 hover:bg-red-50"
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {canRequestExtension && !activeRequest && (
            <div className="border rounded-2xl border-divider p-6 bg-white">
              <h3 className="text-xl font-semibold text-vineyard mb-4">{t("customer.requestExtensionTitle")}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("customer.requestedStart")}</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border p-3 text-sm"
                    value={form.requested_from}
                    min={booking.check_in}
                    onChange={(e) => setForm({ ...form, requested_from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t("customer.requestedEnd")}</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border p-3 text-sm"
                    value={form.requested_to}
                    min={form.requested_from || booking.check_in}
                    onChange={(e) => setForm({ ...form, requested_to: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">{t("customer.reason")}</label>
                <textarea
                  className="w-full rounded-xl border p-3 text-sm"
                  rows={4}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder={t("customer.extensionPlaceholder")}
                />
              </div>
              <div className="mt-6">
                <Button onClick={handleCreateRequest} disabled={createExtension.isLoading}>
                  {createExtension.isLoading ? t("customer.submittingRequest") : t("customer.submitExtension")}
                </Button>
              </div>
            </div>
          )}

          {extensionRequests.length > 0 && (
            <div className="rounded-2xl border border-divider bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-vineyard mb-4">{t("customer.requestHistory")}</h3>
              <div className="space-y-4">
                {extensionRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-divider bg-white p-4">
                    <div className="flex items-center justify-between gap-2 text-sm text-mutedText">
                      <span>{request.requested_from} → {request.requested_to}</span>
                      <span className="font-semibold">{request.status}</span>
                    </div>
                    <p className="mt-2 text-sm"><strong>{t("common.amount")}:</strong> {formatCurrency(request.extra_amount)}</p>
                    <p className="mt-1 text-sm text-mutedText">{request.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <BillPreview booking={booking} />
      </div>
    </div>
  );
}
