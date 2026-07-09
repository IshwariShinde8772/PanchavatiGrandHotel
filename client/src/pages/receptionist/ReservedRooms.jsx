import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import { bookingAPI } from "../../api/bookingAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { formatCurrency } from "../../utils/formatCurrency";
import { bookingStatusLabel, paymentStatusLabel } from "../../utils/i18nLabels";

export default function ReservedRooms() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [approvePayment, setApprovePayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_mode: "hotel_qr", transaction_reference: "" });
  const [page, setPage] = useState(1);

  // Fetch pending/confirmed bookings (reserved rooms)
  const { data, isLoading } = useQuery({
    queryKey: ["receptionist-reserved-rooms", page],
    queryFn: () => bookingAPI.receptionistList({ 
      status: "reserved,pending",
      reservation_type: "reserved_booking",
      page,
      limit: DEFAULT_PAGE_SIZE,
    }),
  });

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: (bookingId) => bookingAPI.confirmReservation(bookingId, {
      amount: Number(paymentForm.amount),
      payment_mode: paymentForm.payment_mode,
      transaction_reference: paymentForm.transaction_reference || undefined,
    }),
    onSuccess: (response) => {
      toast.success(t("shared.actionCompleted"));
      queryClient.invalidateQueries({ queryKey: ["receptionist-reserved-rooms"] });
      setApprovePayment(false);
      setPaymentForm({ amount: "", payment_mode: "hotel_qr", transaction_reference: "" });
      setSelectedReservation(response?.data || null);
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const reservations = data?.data || [];
  const pagination = getPaginationMeta(data, reservations.length);
  const pendingApproval = reservations.filter(r => ["pending", "partially_paid", "pay_at_hotel"].includes(r.payment_status));
  const confirmSelectedPayment = () => {
    const amount = Number(paymentForm.amount);
    const remaining = Number(selectedReservation?.remaining_amount || 0);
    if (!Number.isFinite(amount) || Math.round(amount * 100) !== Math.round(remaining * 100)) {
      toast.error(t("reception.exactAmountRequired", { amount: formatCurrency(remaining) }));
      return;
    }
    if (paymentForm.payment_mode === "hotel_qr" && !paymentForm.transaction_reference.trim()) {
      toast.error(t("reception.transactionReference"));
      return;
    }
    approveMutation.mutate(selectedReservation.id);
  };
  const cancelReservation = async () => {
    try {
      const preview = (await bookingAPI.receptionistCancellationPreview(selectedReservation.id)).data;
      const reason = window.prompt(`Charge: INR ${Number(preview.cancellationCharge).toFixed(2)} | Refund: INR ${Number(preview.refundAmount).toFixed(2)}\nEnter cancellation reason:`);
      if (!reason?.trim()) return;
      await bookingAPI.receptionistCancel(selectedReservation.id, { reason });
      toast.success(t("shared.actionCompleted"));
      setSelectedReservation(null);
      queryClient.invalidateQueries({ queryKey: ["receptionist-reserved-rooms"] });
    } catch (error) {
      toast.error(t("shared.actionFailed"));
    }
  };

  const exportColumns = [
    { header: t("common.reference"), value: (row) => row.booking_ref },
    { header: t("ops.guest"), value: (row) => row.customer?.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.customer?.phone || "" },
    { header: t("ops.room"), value: (row) => row.room?.room_number || "" },
    { header: t("customer.checkIn"), value: (row) => row.check_in },
    { header: t("customer.checkOut"), value: (row) => row.check_out },
    { header: t("common.amount"), value: (row) => row.total_amount },
    { header: t("common.payment"), value: (row) => paymentStatusLabel(t, row.payment_status) },
    { header: t("common.status"), value: (row) => bookingStatusLabel(t, row) },
  ];

  const exportReservations = async (format) => {
    const response = await bookingAPI.receptionistList({ status: "reserved,pending", reservation_type: "reserved_booking", page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Reserved Rooms List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `reserved-rooms-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.reservedRooms")}
        title={t("ops.reservedTitle")}
        description={t("ops.reservedDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportReservations("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportReservations("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">{t("ops.totalReserved")}</p>
          <p className="font-heading text-3xl mt-2">{reservations.length}</p>
        </div>
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">{t("ops.pendingPayment")}</p>
          <p className="font-heading text-3xl mt-2 text-amber-600">{pendingApproval.length}</p>
        </div>
        <div className="section-card p-5">
          <p className="text-sm text-mutedText">{t("statuses.booking.confirmed")}</p>
          <p className="font-heading text-3xl mt-2 text-green-600">{reservations.filter(r => r.payment_status === "paid").length}</p>
        </div>
      </div>

      {selectedReservation && (
        <div className="section-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-xl">{t("ops.reservation")} - {selectedReservation.booking_ref}</h3>
            <button onClick={() => setSelectedReservation(null)} className="text-mutedText hover:text-black">✕</button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Guest Details */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-mutedText">{t("ops.guestName")}</p>
                <p className="font-semibold text-lg">{selectedReservation.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("shared.phone")}</p>
                <p className="font-semibold">{selectedReservation.customer?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("shared.email")}</p>
                <p className="font-semibold break-all">{selectedReservation.customer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("ops.idVerification")}</p>
                <p className={`font-semibold ${selectedReservation.id_verified ? "text-green-600" : "text-red-600"}`}>
                  {selectedReservation.id_verified ? `✓ ${t("ops.verified")}` : `✗ ${t("ops.notVerified")}`}
                </p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-mutedText">{t("ops.room")}</p>
                <p className="font-semibold text-lg">{selectedReservation.room?.name} (#{selectedReservation.room?.room_number})</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("ops.checkInToOut")}</p>
                <p className="font-semibold">{selectedReservation.check_in} → {selectedReservation.check_out}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("common.guests")}</p>
                <p className="font-semibold">{selectedReservation.guests} {t("common.guests")}</p>
              </div>
              <div>
                <p className="text-sm text-mutedText">{t("ops.specialRequests")}</p>
                <p className="font-semibold">{selectedReservation.special_requests || t("bookingUi.none")}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t border-divider pt-6">
            <h4 className="font-semibold mb-4">{t("ops.paymentDetails")}</h4>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="section-card p-4 bg-blue-50">
                <p className="text-sm text-mutedText">{t("shared.totalAmount")}</p>
                <p className="font-heading text-2xl mt-2">INR {selectedReservation.total_amount}</p>
              </div>
              <div className="section-card p-4 bg-green-50">
                <p className="text-sm text-mutedText">{t("ops.advancePaid")}</p>
                <p className="font-heading text-xl mt-2">
                  INR {Number(selectedReservation.advance_amount || Number(selectedReservation.total_amount || 0) * 0.1).toFixed(2)}
                  {" / "}INR {Number(selectedReservation.advance_paid || 0).toFixed(2)}
                </p>
                <p className="text-xs text-mutedText">{t("ops.reservationAdvance")}</p>
              </div>
              <div className="section-card p-4 bg-white">
                <p className="text-sm text-mutedText">{t("shared.remainingAmount")}</p>
                <p className="font-heading text-2xl mt-2">{formatCurrency(selectedReservation.remaining_amount)}</p>
              </div>
              <div className={`section-card p-4 ${selectedReservation.payment_status === "paid" ? "bg-green-50" : "bg-amber-50"}`}>
                <p className="text-sm text-mutedText">{t("shared.paymentStatus")}</p>
                <p className={`font-heading text-2xl mt-2 capitalize ${selectedReservation.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`}>
                  {paymentStatusLabel(t, selectedReservation.payment_status)}
                </p>
              </div>
            </div>

            {/* Payment Proof */}
            {selectedReservation.payment_proof_url && (
              <div className="mb-6">
                <h5 className="font-semibold mb-3">{t("ops.paymentProofReceived")}</h5>
                <a 
                  href={selectedReservation.payment_proof_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <img 
                    src={selectedReservation.payment_proof_url} 
                  alt={t("ops.paymentProof")}
                    className="max-w-xs max-h-64 rounded-lg border border-divider hover:shadow-lg transition-shadow"
                  />
                </a>
              </div>
            )}

            {/* Actions */}
            {["pending", "partially_paid", "pay_at_hotel"].includes(selectedReservation.payment_status) && !approvePayment && (
              <div className="flex gap-3">
                <Button 
                  onClick={() => setApprovePayment(true)}
                  variant="gold"
                >
                  {t("ops.verifyApprovePayment")}
                </Button>
                <Button variant="secondary" onClick={cancelReservation}>{t("ops.cancelReservation")}</Button>
              </div>
            )}

            {approvePayment && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3">
                <p className="font-semibold">{t("ops.confirmPaymentVerification")}</p>
                <p className="text-sm text-mutedText">
                  {t("ops.paymentVerificationHint")}
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <input type="number" min="0.01" step="0.01" className="rounded-lg border p-2" placeholder={Number(selectedReservation.remaining_amount || 0).toFixed(2)} value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                  <select className="rounded-lg border p-2" value={paymentForm.payment_mode} onChange={(event) => setPaymentForm({ ...paymentForm, payment_mode: event.target.value })}>
                    <option value="hotel_qr">{t("ops.hotelQr")}</option>
                    <option value="cash">{t("ops.cash")}</option>
                  </select>
                  <input className="rounded-lg border p-2" placeholder={t("reception.transactionReference")} value={paymentForm.transaction_reference} onChange={(event) => setPaymentForm({ ...paymentForm, transaction_reference: event.target.value })} />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={confirmSelectedPayment}
                    disabled={approveMutation.isPending}
                    variant="secondary"
                  >
                    {approveMutation.isPending ? t("ops.approving") : t("ops.confirmApproval")}
                  </Button>
                  <Button 
                    onClick={() => setApprovePayment(false)}
                    variant="outline"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={cancelReservation}
                  >
                    {t("ops.cancelReservation")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reservations List */}
      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">{t("ops.loadingReservations")}</p>
        ) : reservations.length === 0 ? (
          <p className="p-5 text-mutedText">{t("ops.noReservations")}</p>
        ) : (
          reservations.map((reservation) => (
            <div 
              key={reservation.id} 
              className="p-5 hover:bg-gray-50 cursor-pointer transition-colors border-l-4"
              style={{
                borderLeftColor: reservation.payment_status === "paid" ? "#10b981" : "#f59e0b"
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-lg">{reservation.booking_ref}</p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {reservation.booking_type === "manual" || (!reservation.booking_type && reservation.booked_by === "receptionist") ? t("ops.manualBooking") : t("ops.onlineBooking")}
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      reservation.payment_status === "paid" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {reservation.payment_status === "paid" ? `✓ ${t("statuses.payment.paid")}` : `⏱ ${t("statuses.payment.pending")}`}
                    </span>
                  </div>
                  <p className="text-sm text-mutedText mb-2">{reservation.customer?.full_name} • {reservation.customer?.phone}</p>
                  <div className="grid gap-2 text-sm md:grid-cols-4">
                    <span>{t("ops.room")}: {reservation.room?.room_number}</span>
                    <span>{t("customer.checkIn")}: {reservation.check_in}</span>
                    <span>{t("common.guests")}: {reservation.guests}</span>
                    <span>{t("common.amount")}: INR {reservation.total_amount}</span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setSelectedReservation(reservation)}
                >
                  {t("shared.viewDetails")}
                </Button>
              </div>
            </div>
          ))
        )}
        <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
