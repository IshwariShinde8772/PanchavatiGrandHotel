import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  useConfirmExtensionPayment,
  useProcessExtensionRequest,
  useReceptionistExtensionRequests,
} from "../../hooks/useBookings";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatHotelDateTime } from "../../utils/hotelDate";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { paymentStatusLabel } from "../../utils/i18nLabels";

function requestAmount(request, camelName, snakeName, fallback = 0) {
  return Number(request[camelName] ?? request[snakeName] ?? fallback);
}

export default function ExtensionRequests() {
  const { t } = useTranslation();
  const { data: response, isLoading } = useReceptionistExtensionRequests();
  const processRequest = useProcessExtensionRequest();
  const confirmPayment = useConfirmExtensionPayment();
  const [paymentRequestId, setPaymentRequestId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_mode: "cash",
    transaction_reference: "",
    note: "",
  });
  const requests = response?.data || [];

  const handleAction = async (requestId, payload) => {
    try {
      await processRequest.mutateAsync({ requestId, payload });
      toast.success(t("shared.actionCompleted"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("shared.actionFailed")));
    }
  };

  const openPaymentForm = (request) => {
    const remaining = requestAmount(
      request,
      "extensionRemainingAmount",
      "extension_remaining_amount",
      request.extra_amount
    );
    setPaymentRequestId(request.id);
    setPaymentForm({
      amount: remaining.toFixed(2),
      payment_mode: "cash",
      transaction_reference: "",
      note: "",
    });
  };

  const submitPayment = async (request) => {
    const required = requestAmount(
      request,
      "extensionRemainingAmount",
      "extension_remaining_amount",
      request.extra_amount
    );
    const received = Number(paymentForm.amount);
    if (!Number.isFinite(received) || Math.round(received * 100) !== Math.round(required * 100)) {
      toast.error(`Exact extension payment of ${formatCurrency(required)} is required.`);
      return;
    }
    if (paymentForm.payment_mode !== "cash" && !paymentForm.transaction_reference.trim()) {
      toast.error("Transaction/reference number is required for this payment mode.");
      return;
    }

    try {
      await confirmPayment.mutateAsync({
        requestId: request.id,
        payload: {
          amount: received,
          payment_mode: paymentForm.payment_mode,
          transaction_reference: paymentForm.transaction_reference.trim() || undefined,
          note: paymentForm.note.trim() || undefined,
        },
      });
      setPaymentRequestId(null);
      toast.success("Extension payment confirmed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Extension payment could not be confirmed."));
    }
  };

  const groupedRequests = useMemo(() => requests.reduce((groups, request) => {
    groups[request.status] = groups[request.status] || [];
    groups[request.status].push(request);
    return groups;
  }, {}), [requests]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow={t("layout.extensions")}
        title={t("ops.extensionTitle")}
        description="Approve stay extensions, validate their manual payment, then generate the final bill."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="section-card p-6">
          <h2 className="mb-4 font-heading text-2xl">{t("ops.incomingRequests")}</h2>
          {isLoading ? (
            <p className="text-mutedText">{t("ops.loadingRequests")}</p>
          ) : requests.length === 0 ? (
            <p className="text-mutedText">{t("ops.noExtensionRequests")}</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const payable = requestAmount(request, "extensionPayableAmount", "extension_payable_amount", request.extra_amount);
                const paid = requestAmount(request, "extensionPaidAmount", "extension_paid_amount", 0);
                const remaining = requestAmount(request, "extensionRemainingAmount", "extension_remaining_amount", payable - paid);
                return (
                  <div key={request.id} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-vineyard">{request.booking?.booking_ref}</p>
                        <p className="text-sm text-mutedText">
                          {request.customer?.full_name} · Room {request.booking?.room?.room_number}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                          {request.status}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          request.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          Extension Payment {paymentStatusLabel(t, request.payment_status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-mutedText">Original stay</p>
                        <p className="font-semibold">
                          {request.booking?.check_in} → {request.originalCheckoutDate || request.original_checkout_date || request.requested_from}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-mutedText">Extended stay</p>
                        <p className="font-semibold">
                          {request.originalCheckoutDate || request.original_checkout_date || request.requested_from}
                          {" → "}
                          {request.extendedCheckoutDate || request.extended_checkout_date || request.requested_to}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-mutedText">Extension payable</p>
                        <p className="font-semibold text-saffron">{formatCurrency(payable)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-mutedText">{t("shared.reason")}</p>
                        <p className="font-semibold">{request.reason}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                      <p>Extra nights: <strong>{request.extensionNights ?? request.extension_nights ?? request.nights}</strong></p>
                      <p>Base: <strong>{formatCurrency(requestAmount(request, "extensionBaseAmount", "extension_base_amount", request.extra_fare))}</strong></p>
                      <p>Discount: <strong>-{formatCurrency(requestAmount(request, "extensionDiscountAmount", "extension_discount_amount", 0))}</strong></p>
                      <p>Tax: <strong>{formatCurrency(requestAmount(request, "extensionTaxAmount", "extension_tax_amount", request.extra_gst))}</strong></p>
                      <p>Paid: <strong>{formatCurrency(paid)}</strong></p>
                      <p>Remaining: <strong>{formatCurrency(remaining)}</strong></p>
                    </div>

                    {request.status === "pending" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processRequest.isPending}
                          onClick={() => handleAction(request.id, { action: "approve" })}
                        >
                          Approve Extension
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          disabled={processRequest.isPending}
                          onClick={() => handleAction(request.id, {
                            action: "reject",
                            response_text: "Room unavailable for requested dates.",
                          })}
                        >
                          {t("shared.reject")}
                        </Button>
                      </div>
                    ) : null}

                    {request.status === "approved" && request.payment_status === "pending" ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-semibold">Extension Payment Pending</p>
                        <p>Extension payment must be confirmed before generating final bill.</p>
                        {paymentRequestId !== request.id ? (
                          <Button onClick={() => openPaymentForm(request)}>Confirm Extension Payment</Button>
                        ) : (
                          <div className="grid gap-3 rounded-xl bg-white p-4 md:grid-cols-2">
                            <label>
                              <span className="mb-1 block font-medium">Amount received</span>
                              <input
                                className="w-full rounded-lg border border-divider p-2"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={paymentForm.amount}
                                onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                              />
                            </label>
                            <label>
                              <span className="mb-1 block font-medium">Payment mode</span>
                              <select
                                className="w-full rounded-lg border border-divider p-2"
                                value={paymentForm.payment_mode}
                                onChange={(event) => setPaymentForm({ ...paymentForm, payment_mode: event.target.value })}
                              >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                            <label>
                              <span className="mb-1 block font-medium">
                                Transaction/reference {paymentForm.payment_mode === "cash" ? "(optional)" : ""}
                              </span>
                              <input
                                className="w-full rounded-lg border border-divider p-2"
                                value={paymentForm.transaction_reference}
                                onChange={(event) => setPaymentForm({ ...paymentForm, transaction_reference: event.target.value })}
                              />
                            </label>
                            <label>
                              <span className="mb-1 block font-medium">Payment note (optional)</span>
                              <input
                                className="w-full rounded-lg border border-divider p-2"
                                value={paymentForm.note}
                                onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })}
                              />
                            </label>
                            <div className="flex gap-2 md:col-span-2">
                              <Button disabled={confirmPayment.isPending} onClick={() => submitPayment(request)}>
                                {confirmPayment.isPending ? t("shared.processing") : "Confirm Extension Payment"}
                              </Button>
                              <Button variant="outline" onClick={() => setPaymentRequestId(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {request.status === "completed" ? (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <p className="font-semibold">Extension Payment Paid</p>
                        <p>
                          Mode: {request.payment_method || "N/A"}
                          {request.payment_reference ? ` · Ref: ${request.payment_reference}` : ""}
                        </p>
                        <p>Confirmed: {formatHotelDateTime(request.payment_confirmed_at)}</p>
                        <Button
                          as={Link}
                          to={`/receptionist/bill-generator?ref=${encodeURIComponent(request.booking?.booking_ref || "")}`}
                          className="mt-3"
                        >
                          Generate Final Bill
                        </Button>
                      </div>
                    ) : null}

                    {request.status === "rejected" ? (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                        {t("ops.requestRejected")} {request.response_text}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="section-card bg-slate-50 p-6">
          <h3 className="mb-4 font-heading text-xl">{t("ops.requestStatusOverview")}</h3>
          <ul className="space-y-3 text-sm text-mutedText">
            <li><strong>Pending:</strong> Awaiting approval.</li>
            <li><strong>Approved:</strong> Stay extended; manual payment pending.</li>
            <li><strong>Completed:</strong> Payment confirmed; bill generation enabled.</li>
            <li><strong>Rejected:</strong> Extension was declined.</li>
          </ul>
          <div className="mt-6 rounded-xl border border-divider bg-white p-4">
            <p className="mb-2 text-sm font-medium text-vineyard">{t("ops.totalRequests")}</p>
            <p className="text-3xl font-bold">{requests.length}</p>
            <div className="mt-4 space-y-2">
              {Object.entries(groupedRequests).map(([status, list]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="font-semibold">{list.length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
