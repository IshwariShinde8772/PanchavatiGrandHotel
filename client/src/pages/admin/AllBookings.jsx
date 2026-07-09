import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import {
  canMarkBookingNoShow,
  formatHotelDateTime,
  formatHotelTime,
  isNoShowCancellation,
} from "../../utils/hotelDate";
import { useTranslation } from "react-i18next";
import { bookingStatusLabel, paymentStatusLabel, roomCategoryLabel } from "../../utils/i18nLabels";
import { getRefundStatusLabel } from "../../utils/refundStatus";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AllBookings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({ q: "", status: "" });
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-bookings", filter, page],
    queryFn: () => bookingAPI.allAdmin({ ...filter, page, limit: DEFAULT_PAGE_SIZE }),
  });

  const bookings = res?.data || [];
  const pagination = getPaginationMeta(res, bookings.length);

  const deleteMutation = useMutation({
    mutationFn: bookingAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-bookings"]);
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const markNoShowMutation = useMutation({
    mutationFn: bookingAPI.adminMarkNoShow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDetailModal(null);
      toast.success(t("bookingUi.noShowCancelled"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleDelete = (id) => {
    if (window.confirm(t("shared.confirmDelete"))) {
      deleteMutation.mutate(id);
    }
  };

  const exportColumns = [
    { header: t("common.reference"), value: (row) => row.booking_ref },
    { header: t("exports.guest"), value: (row) => row.customer?.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.customer?.phone || "" },
    { header: t("common.room"), value: (row) => `${row.room?.room_number || ""} ${row.room?.category || ""}`.trim() },
    { header: t("customer.checkIn"), value: (row) => `${row.check_in} ${row.check_in_time || ""}`.trim() },
    { header: t("exports.actualCheckInIst"), value: (row) => formatHotelDateTime(row.actual_checkin_time) },
    { header: t("bookingUi.autoCancelDeadline"), value: (row) => formatHotelDateTime(row.auto_cancel_at) },
    { header: t("exports.originalCheckout"), value: (row) => row.original_checkout_date || row.check_out },
    { header: t("exports.actualCheckoutIst"), value: (row) => formatHotelDateTime(row.actual_checkout_time) },
    { header: t("exports.earlyCheckout"), value: (row) => row.is_early_checkout ? t("shared.yes") : t("shared.no") },
    { header: t("exports.earlyCheckoutReason"), value: (row) => row.early_checkout_reason || "" },
    { header: t("exports.checkedOutBy"), value: (row) => row.checked_out_by_display || "" },
    { header: t("exports.roomStatusAfterCheckout"), value: (row) => row.room_status_after_checkout || "" },
    { header: t("shared.totalAmount"), value: (row) => row.total_amount },
    { header: t("shared.paidAmount"), value: (row) => row.amount_paid },
    { header: t("shared.remainingAmount"), value: (row) => Number(row.remaining_amount || 0).toFixed(2) },
    { header: "Extension Amount", value: (row) => (row.extensionRequests || []).reduce((sum, extension) => sum + Number(extension.extension_payable_amount ?? extension.extra_amount ?? 0), 0).toFixed(2) },
    { header: "Extension Payment Status", value: (row) => (row.extensionRequests || []).at(-1)?.payment_status || "" },
    { header: "Extension Payment Mode", value: (row) => (row.extensionRequests || []).at(-1)?.payment_method || "" },
    { header: "Extension Payment Reference", value: (row) => (row.extensionRequests || []).at(-1)?.payment_reference || "" },
    { header: t("common.payment"), value: (row) => paymentStatusLabel(t, row.payment_status) },
    { header: t("common.status"), value: (row) => bookingStatusLabel(t, row) },
    { header: t("exports.createdAtIst"), value: (row) => formatHotelDateTime(row.created_at) },
  ];

  const exportBookings = async (format) => {
    const response = await bookingAPI.allAdmin({ ...filter, page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: t("layout.allBookings"),
      columns: exportColumns,
      rows: response?.data || [],
      filters: filter,
      filename: `bookings-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.allBookings")}
        title={t("layout.allBookings")}
        description={t("admin.reportsDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportBookings("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportBookings("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      <div className="flex flex-wrap gap-4 items-end section-card p-6">
        <div className="flex-1 min-w-[200px]">
          <InputField 
            label={t("shared.search")}
            placeholder={t("reception.searchBooking")}
            value={filter.q} 
            onChange={(e) => { setPage(1); setFilter({ ...filter, q: e.target.value }); }}
          />
        </div>
        <div className="w-[180px]">
          <SelectField 
            label={t("common.status")}
            value={filter.status} 
            onChange={(e) => { setPage(1); setFilter({ ...filter, status: e.target.value }); }}
            options={[{ label: t("shared.allStatuses"), value: "" }, ...STATUS_OPTIONS.map((option) => ({ ...option, label: t(`statuses.booking.${option.value}`) }))]}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="p-10 text-center">{t("common.loading")}</p>
      ) : (
        <div className="section-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A4D34]/5 text-vineyard font-bold text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{t("common.reference")} / {t("exports.guest")}</th>
                <th className="px-6 py-4">{t("bookingUi.stayDetails")}</th>
                <th className="px-6 py-4">{t("common.room")}</th>
                <th className="px-6 py-4">{t("room.total")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-divider/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-vineyard">{b.booking_ref}</p>
                    <p className="text-xs text-mutedText">{b.customer?.full_name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${b.booking_type === "manual" || (!b.booking_type && b.booked_by === "receptionist") ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {b.booking_type === "manual" || (!b.booking_type && b.booked_by === "receptionist") ? t("ops.manualBooking") : t("ops.onlineBooking")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p>{b.check_in} • {formatHotelTime(b.check_in_time)}</p>
                    <p className="text-[10px] text-mutedText">{t("bookingUi.autoCancelDeadline")}: {formatHotelDateTime(b.auto_cancel_at)}</p>
                    <p className="text-[10px] text-mutedText">→ {b.check_out}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {b.room?.room_number} ({roomCategoryLabel(t, b.room?.category)})
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{formatCurrency(b.total_amount)}</p>
                    <p className="text-[10px] uppercase text-goldDark font-bold">{b.payment_status}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      b.status === "confirmed" ? "bg-green-100 text-green-700" :
                      b.status === "cancelled" ? "bg-red-100 text-red-700" : 
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {bookingStatusLabel(t, b)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setDetailModal(b)} className="text-xs font-bold text-goldDark underline">{t("shared.viewDetails")}</button>
                      <button onClick={() => handleDelete(b.id)} className="text-xs font-bold text-maroon underline">{t("common.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-mutedText">{t("shared.noResults")}</td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex justify-between items-start border-b border-divider pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold font-heading text-vineyard">{t("bookingUi.bookingSummary")}</h2>
                <p className="text-mutedText">{t("common.reference")}: {detailModal.booking_ref}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-2xl">&times;</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">{t("bookingUi.guestInfo")}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-mutedText">{t("shared.fullName")}:</span> {detailModal.customer?.full_name}</p>
                  <p><span className="text-mutedText">{t("shared.phone")}:</span> {detailModal.customer?.phone}</p>
                  <p><span className="text-mutedText">{t("shared.email")}:</span> {detailModal.customer?.email}</p>
                  <p><span className="text-mutedText">{t("customer.nationality")}:</span> <span className="font-bold text-vineyard">{detailModal.customer?.nationality}</span></p>
                  <p><span className="text-mutedText">{t("customer.idType")}:</span> {detailModal.customer?.id_type}</p>
                  <p><span className="text-mutedText">{t("customer.idNumber")}:</span> {detailModal.customer?.id_number}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">{t("bookingUi.paymentSummary")}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-mutedText">{t("common.method")}:</span> <span className="uppercase">{detailModal.payment_method}</span></p>
                  <p><span className="text-mutedText">{t("common.status")}:</span> <span className="uppercase">{paymentStatusLabel(t, detailModal.payment_status)}</span></p>
                  <p><span className="text-mutedText">{t("ops.transactionId")}:</span> <span className="font-mono text-xs">{detailModal.razorpay_payment_id || detailModal.manual_transaction_id || t("shared.notAvailable")}</span></p>
                  {detailModal.payment_proof_url && (
                    <div className="mt-2">
                       <p className="text-mutedText mb-1">{t("ops.paymentProof")}:</p>
                       <a href={detailModal.payment_proof_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-divider">
                          <img src={detailModal.payment_proof_url} alt="Proof" className="max-h-32 w-full object-cover" />
                       </a>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 md:col-span-2">
                <h3 className="font-bold border-b border-divider pb-1 uppercase text-xs tracking-widest">{t("ops.stayInformation")}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="text-mutedText">{t("customer.checkIn")}:</span> {detailModal.check_in} {formatHotelTime(detailModal.check_in_time)}</p>
                    <p><span className="text-mutedText">{t("bookingUi.autoCancelDeadline")}:</span> {formatHotelDateTime(detailModal.auto_cancel_at)}</p>
                    <p><span className="text-mutedText">{t("customer.checkOut")}:</span> {detailModal.check_out}</p>
                    <p><span className="text-mutedText">{t("reception.actualCheckIn")}:</span> {formatHotelDateTime(detailModal.actual_checkin_time)}</p>
                    <p><span className="text-mutedText">{t("reception.actualCheckout")}:</span> {formatHotelDateTime(detailModal.actual_checkout_time)}</p>
                    <p><span className="text-mutedText">{t("ops.room")}:</span> {detailModal.room?.room_number} ({roomCategoryLabel(t, detailModal.room?.category)})</p>
                    <p><span className="text-mutedText">{t("common.guests")}:</span> {detailModal.guests}</p>
                    <p><span className="text-mutedText">{t("common.status")}:</span> {bookingStatusLabel(t, detailModal)}</p>
                </div>
              </section>

              {(detailModal.extensionRequests || []).length ? (
                <section className="space-y-4">
                  <h3 className="border-b border-divider pb-1 text-xs font-bold uppercase tracking-widest">
                    Extension History
                  </h3>
                  <div className="space-y-3">
                    {detailModal.extensionRequests.map((extension) => (
                      <div key={extension.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                        <p className="font-semibold">
                          {extension.original_checkout_date || extension.requested_from}
                          {" → "}
                          {extension.extended_checkout_date || extension.requested_to}
                        </p>
                        <p>Extra nights: {extension.extension_nights || extension.nights}</p>
                        <p>Payable: {formatCurrency(extension.extension_payable_amount ?? extension.extra_amount)}</p>
                        <p>Payment: {extension.payment_status}{extension.payment_method ? ` · ${extension.payment_method}` : ""}</p>
                        {extension.payment_reference ? <p>Reference: {extension.payment_reference}</p> : null}
                        {extension.payment_confirmed_at ? <p>Confirmed: {formatHotelDateTime(extension.payment_confirmed_at)}</p> : null}
                      </div>
                    ))}
                    {(detailModal.extension_history || []).length ? (
                      <div className="rounded-xl border border-divider p-3 text-sm">
                        <p className="font-semibold">Audit timeline</p>
                        {detailModal.extension_history.map((event) => (
                          <p key={event.id} className="mt-1">
                            {String(event.action).replaceAll("_", " ")} · {formatHotelDateTime(event.created_at)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {detailModal.is_early_checkout ? (
                <section className="space-y-2 rounded-xl bg-blue-50 p-4 text-sm md:col-span-2">
                  <h4 className="font-bold text-blue-800">{t("statuses.booking.early_checked_out")}</h4>
                  <p><span className="text-mutedText">{t("reception.originalCheckout")}:</span> {detailModal.original_checkout_date || detailModal.check_out}</p>
                  <p><span className="text-mutedText">{t("reception.actualCheckout")}:</span> {formatHotelDateTime(detailModal.early_checkout_at || detailModal.actual_checkout_time)}</p>
                  <p><span className="text-mutedText">{t("shared.reason")}:</span> {detailModal.early_checkout_reason}</p>
                  <p><span className="text-mutedText">{t("ops.checkedOutBy")}:</span> {detailModal.checked_out_by_display || t("shared.notAvailable")}</p>
                  <p><span className="text-mutedText">{t("ops.roomStatusAfterCheckout")}:</span> {detailModal.room_status_after_checkout || t("statuses.room.cleaning")}</p>
                  <p><span className="text-mutedText">{t("reception.finalSettlement")}:</span> {t("reception.noAutomaticRefund")}</p>
                </section>
              ) : null}

              {detailModal.status === "cancelled" ? (
                <section className="space-y-2 rounded-xl bg-red-50 p-4 text-sm md:col-span-2">
                  <h4 className="font-bold text-red-800">
                    {isNoShowCancellation(detailModal) ? t("statuses.booking.cancelled_no_show") : t("ops.bookingCancelled")}
                  </h4>
                  <p><span className="text-mutedText">{t("shared.reason")}:</span> {detailModal.cancellation_reason || t("ops.notProvided")}</p>
                  {isNoShowCancellation(detailModal) ? (
                    <p><span className="text-mutedText">{t("ops.autoCancelledAt")}:</span> {formatHotelDateTime(detailModal.auto_cancelled_at)}</p>
                  ) : null}
                  <p><span className="text-mutedText">{t("bookingUi.refundAmount")}:</span> {formatCurrency(detailModal.refund_amount)}</p>
                  <p><span className="text-mutedText">{t("refunds.refundStatus")}:</span> {getRefundStatusLabel(detailModal.refund_status, t)}</p>
                </section>
              ) : null}

              {detailModal.special_requests && (
                <section className="md:col-span-2 bg-divider/20 p-4 rounded-xl">
                  <h4 className="text-xs font-bold uppercase text-mutedText mb-2">{t("ops.specialRequests")}</h4>
                  <p className="text-sm">{detailModal.special_requests}</p>
                </section>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-divider flex justify-end gap-3">
              {["confirmed", "reserved"].includes(detailModal.status) ? (
                <Button
                  variant="outline"
                  disabled={!canMarkBookingNoShow(detailModal) || markNoShowMutation.isPending}
                  onClick={() => markNoShowMutation.mutate(detailModal.id)}
                  title={canMarkBookingNoShow(detailModal) ? "" : t("ops.gracePeriodHint")}
                >
                  {markNoShowMutation.isPending ? t("ops.cancelling") : t("reception.markNoShow")}
                </Button>
              ) : null}
              <Button onClick={() => setDetailModal(null)}>{t("shared.close")}</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
