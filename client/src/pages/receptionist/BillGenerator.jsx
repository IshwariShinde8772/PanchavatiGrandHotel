import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FilePlus2, Printer, Search } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import { bookingAPI } from "../../api/bookingAPI";
import { billAPI } from "../../api/billAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatHotelDateTime } from "../../utils/hotelDate";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { roomCategoryLabel } from "../../utils/i18nLabels";

function parseExtensions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function payable(extension) {
  return Number(extension.extensionPayableAmount ?? extension.extension_payable_amount ?? extension.extra_amount ?? 0);
}

function remaining(extension) {
  return Number(
    extension.extensionRemainingAmount
    ?? extension.extension_remaining_amount
    ?? Math.max(payable(extension) - Number(extension.extension_paid_amount || 0), 0)
  );
}

export default function BillGenerator() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("ref") || "");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { data: bRes, isLoading } = useQuery({
    queryKey: ["receptionist-bill-search", q],
    queryFn: () => bookingAPI.receptionistList({ q, date_filter: "all" }),
  });
  const bookings = bRes?.data || [];
  const extensions = selectedBooking?.extensionRequests || [];
  const pendingExtension = extensions.find((extension) => (
    extension.status !== "rejected"
    && payable(extension) > 0
    && (extension.payment_status !== "paid" || remaining(extension) > 0)
  ));
  const paidExtensions = extensions.filter((extension) => (
    extension.payment_status === "paid" && payable(extension) > 0
  ));
  const bill = selectedBooking?.bill || null;
  const billExtensions = parseExtensions(bill?.extension_json);
  const billIsCurrent = Boolean(bill)
    && !pendingExtension
    && (paidExtensions.length === 0 || billExtensions.length >= paidExtensions.length);

  const generateMutation = useMutation({
    mutationFn: () => billAPI.generate({ booking_id: selectedBooking.id, extras: [] }),
    onSuccess: (response) => {
      setSelectedBooking((current) => ({ ...current, bill: response.data }));
      queryClient.invalidateQueries({ queryKey: ["receptionist-bill-search"] });
      toast.success("Final bill generated successfully.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Bill could not be generated."));
    },
  });

  const handleGenerate = () => {
    if (pendingExtension) {
      toast.error("Extension payment must be confirmed before generating final bill.");
      return;
    }
    generateMutation.mutate();
  };

  const handlePrint = () => {
    if (!billIsCurrent) {
      toast.error("Generate the current final bill before printing.");
      return;
    }
    const printContent = document.getElementById("printable-bill");
    if (!printContent) return;
    const popup = window.open("", "_blank", "width=850,height=900");
    if (!popup) return;
    popup.document.write(`<html><head><title>Invoice ${bill.bill_number}</title><style>body{font-family:Arial;padding:32px;color:#173f35}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.flex{display:flex}.justify-between{justify-content:space-between}.text-center{text-align:center}.font-bold,.font-black{font-weight:700}.border-b,.border-b-2{border-bottom:1px solid #ddd}.border-t,.border-t-2{border-top:1px solid #173f35}.rounded-xl{border-radius:12px}.p-4{padding:16px}.pb-6{padding-bottom:24px}.pt-4,.pt-6{padding-top:16px}.mt-4,.mt-8{margin-top:16px}.space-y-2>*+*{margin-top:8px}.space-y-3>*+*,.space-y-8>*+*{margin-top:12px}.text-sm{font-size:14px}.text-xs,.text-\\[10px\\]{font-size:11px}@page{margin:1cm}</style></head><body>${printContent.outerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow={t("layout.billGenerator")}
        title={t("ops.billTitle")}
        description="Final bills are generated only after any extension payment is manually confirmed."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
        <div className="section-card flex h-[700px] flex-col">
          <div className="border-b border-divider p-6">
            <h3 className="mb-4 font-heading text-lg font-bold text-vineyard">{t("ops.selectBooking")}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedText" size={18} />
              <input
                type="text"
                placeholder={t("ops.searchGuestRoom")}
                className="w-full rounded-xl border-2 border-divider py-2 pl-10 pr-4 text-sm outline-none focus:border-godavari"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 divide-y divide-divider overflow-y-auto">
            {isLoading ? (
              <p className="p-10 text-center text-mutedText">{t("ops.searching")}</p>
            ) : bookings.map((booking) => {
              const bookingPendingExtension = (booking.extensionRequests || []).some((extension) => (
                extension.status !== "rejected"
                && payable(extension) > 0
                && (extension.payment_status !== "paid" || remaining(extension) > 0)
              ));
              return (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`flex w-full items-center justify-between border-l-4 p-6 text-left transition-colors hover:bg-gray-50 ${
                    selectedBooking?.id === booking.id
                      ? "border-godavari bg-green-50"
                      : "border-transparent"
                  }`}
                >
                  <div>
                    <p className="font-bold text-vineyard">{booking.customer?.full_name}</p>
                    <p className="text-[10px] text-mutedText">
                      {t("ops.room")} {booking.room?.room_number} - {roomCategoryLabel(t, booking.room?.category)}
                    </p>
                    {bookingPendingExtension ? (
                      <p className="mt-1 text-xs font-semibold text-amber-700">Extension Payment Pending</p>
                    ) : null}
                  </div>
                  <p className="font-bold text-sm">{formatCurrency(booking.total_amount)}</p>
                </button>
              );
            })}
            {bookings.length === 0 && !isLoading ? (
              <p className="p-10 text-center italic text-mutedText">{t("ops.searchBookingHint")}</p>
            ) : null}
          </div>
        </div>

        <div className="section-card flex h-[700px] flex-col overflow-hidden">
          <div className="border-b border-divider bg-gray-50/50 p-6">
            <h3 className="font-heading text-lg font-bold text-vineyard">{t("ops.billPreview")}</h3>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-8">
            {selectedBooking ? (
              <div id="printable-bill" className="mx-auto max-w-md space-y-8 text-vineyard">
                <div className="border-b-2 border-divider pb-6 text-center">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{t("common.hotelName")}</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                    Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003
                  </p>
                  <p className="mt-4 text-[10px] font-bold uppercase text-saffron">
                    {t("ops.taxInvoice")} · {selectedBooking.booking_ref}
                  </p>
                </div>

                {pendingExtension ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-bold">Extension Payment Pending</p>
                    <p>Payable: {formatCurrency(payable(pendingExtension))}</p>
                    <p>Remaining: {formatCurrency(remaining(pendingExtension))}</p>
                    <p className="mt-2">Extension payment must be confirmed before generating final bill.</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4 border-b border-divider pb-6 text-sm">
                  <div><p className="text-xs italic text-mutedText">{t("ops.guest")}</p><p className="font-bold">{selectedBooking.customer?.full_name}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("shared.phone")}</p><p className="font-bold">{selectedBooking.customer?.phone}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("ops.room")}</p><p className="font-bold">{selectedBooking.room?.room_number} ({roomCategoryLabel(t, selectedBooking.room?.category)})</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("ops.stay")}</p><p className="font-bold">{selectedBooking.nights} {t("customer.nights")}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("customer.checkIn")}</p><p className="font-bold">{selectedBooking.check_in}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("customer.checkOut")}</p><p className="font-bold">{selectedBooking.check_out}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("ops.invoiceGeneratedIst")}</p><p className="font-bold">{formatHotelDateTime(bill?.generated_at)}</p></div>
                  <div><p className="text-xs italic text-mutedText">{t("ops.invoiceNumber")}</p><p className="font-bold">{bill?.bill_number || "Not generated"}</p></div>
                </div>

                <div className="space-y-3 pt-4 text-sm">
                  <div className="flex justify-between"><span>{t("ops.subtotal")}</span><strong>{formatCurrency(selectedBooking.total_fare)}</strong></div>
                  <div className="flex justify-between"><span>GST ({selectedBooking.gst_percent}%)</span><strong>{formatCurrency(selectedBooking.gst_amount)}</strong></div>
                  <div className="flex justify-between border-t-2 border-vineyard pt-4 text-lg font-black"><span>{t("ops.total")}</span><span>{formatCurrency(selectedBooking.total_amount)}</span></div>
                </div>

                {(billExtensions.length ? billExtensions : paidExtensions).length ? (
                  <div className="space-y-3 rounded-xl border border-divider p-4 text-sm">
                    <h3 className="font-bold">Extension Settlement</h3>
                    <div className="flex justify-between">
                      <span>Original Stay Amount</span>
                      <strong>{formatCurrency(bill?.original_stay_amount ?? paidExtensions[0]?.original_booking_amount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Original Paid Amount</span>
                      <strong>{formatCurrency(bill?.original_paid_amount ?? paidExtensions[0]?.original_paid_amount)}</strong>
                    </div>
                    {(billExtensions.length ? billExtensions : paidExtensions).map((extension) => (
                      <div key={extension.id} className="border-t border-divider pt-3">
                        <p className="font-semibold">
                          Extension Stay: {extension.extensionNights ?? extension.extension_nights ?? extension.nights} night(s)
                        </p>
                        <p>
                          {extension.originalCheckoutDate || extension.original_checkout_date || extension.requested_from}
                          {" → "}
                          {extension.extendedCheckoutDate || extension.extended_checkout_date || extension.requested_to}
                        </p>
                        <div className="mt-2 flex justify-between"><span>Extension Amount</span><strong>{formatCurrency(payable(extension))}</strong></div>
                        <p>Extension Payment: {extension.extensionPaymentStatus || extension.payment_status}</p>
                        <p>Mode: {extension.payment_method || "N/A"}</p>
                        {extension.payment_reference ? <p>Transaction Ref: {extension.payment_reference}</p> : null}
                        {extension.payment_confirmed_at ? <p>Paid: {formatHotelDateTime(extension.payment_confirmed_at)}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 border-t border-divider pt-4 text-sm">
                  <div className="flex justify-between"><span>Total Paid</span><strong>{formatCurrency(bill?.total_paid_amount ?? selectedBooking.amount_paid)}</strong></div>
                  <div className="flex justify-between"><span>Remaining Amount</span><strong>{formatCurrency(bill?.remaining_amount ?? selectedBooking.remaining_amount)}</strong></div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center italic text-mutedText">
                <p className="text-center">{t("ops.selectBillHint")}</p>
              </div>
            )}
          </div>

          {selectedBooking ? (
            <div className="space-y-3 border-t border-divider bg-gray-50 p-6">
              <button
                onClick={handleGenerate}
                disabled={Boolean(pendingExtension) || generateMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-vineyard py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FilePlus2 size={19} />
                {generateMutation.isPending ? "Generating..." : billIsCurrent ? "Refresh Final Bill" : "Generate Final Bill"}
              </button>
              <button
                onClick={handlePrint}
                disabled={!billIsCurrent}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-saffron py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={19} /> {t("ops.printBill")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
