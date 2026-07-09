import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import { adminAPI } from "../../api/adminAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { openSecurePhoto } from "../../utils/securePhoto";
import toast from "react-hot-toast";
import { bookingStatusLabel } from "../../utils/i18nLabels";

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [page, setPage] = useState(1);

  // Fetch customers
  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-customers", page],
    queryFn: () => adminAPI.listCustomers({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  // Fetch selected customer details
  const { data: detailResponse } = useQuery({
    queryKey: ["admin-customer-detail", selectedCustomer?.id],
    queryFn: () => adminAPI.getCustomerDetail(selectedCustomer?.id),
    enabled: Boolean(selectedCustomer?.id),
  });

  const customers = response?.data || [];
  const pagination = getPaginationMeta(response, customers.length);

  const getCheckInStatus = (customer) => {
    // Get most recent booking to check if currently checked in
    if (detailResponse?.data?.bookings && detailResponse.data.bookings.length > 0) {
      const recent = detailResponse.data.bookings[0];
      if (recent.status === "checked_in") {
        return "checked_in";
      }
    }
    return "guest";
  };

  const exportColumns = [
    { header: t("shared.name"), value: (row) => row.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.phone || "" },
    { header: t("shared.email"), value: (row) => row.email || "" },
    { header: t("ops.nationality"), value: (row) => row.nationality || "" },
    { header: t("ops.totalBookings"), value: (row) => row.total_bookings || 0 },
    { header: t("ops.totalSpent"), value: (row) => row.total_spent || 0 },
  ];

  const exportCustomers = async (format) => {
    const res = await adminAPI.listCustomers({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Customers List",
      columns: exportColumns,
      rows: res?.data || [],
      filename: `customers-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        eyebrow={t("layout.customers")}
        title={t("ops.customerProfilesTitle")}
        description={t("ops.customerProfilesDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportCustomers("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportCustomers("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      {isLoading ? (
        <div className="section-card p-8 text-center text-mutedText">
          {t("ops.loadingCustomers")}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customers List */}
          <div className="lg:col-span-2">
            <div className="section-card divide-y divide-divider overflow-hidden">
              {customers.length === 0 ? (
                <div className="p-8 text-center text-mutedText">
                  {t("ops.noCustomers")}
                </div>
              ) : (
                customers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">{customer.full_name}</p>
                          {getCheckInStatus(customer) === "checked_in" && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {t("statuses.booking.checked_in")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-mutedText mt-1">{customer.phone}</p>
                        <p className="text-sm text-mutedText">{customer.email}</p>
                        <div className="mt-3 flex gap-4 text-sm">
                          <span className="text-mutedText">
                            {t("ops.country")}: <span className="font-semibold">{customer.nationality || t("ops.notSpecified")}</span>
                          </span>
                          <span className="text-mutedText">
                            {t("ops.totalBookings")}: <span className="font-semibold">{customer.total_bookings}</span>
                          </span>
                          <span className="text-mutedText">
                            {t("ops.totalSpent")}: <span className="font-semibold">INR {customer.total_spent?.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flag-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(customer);
                          }}
                        >
                          {t("shared.viewDetails")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>

          {/* Customer Details Panel */}
          {selectedCustomer && (
            <div className="lg:col-span-1">
              <div className="section-card sticky top-20 p-6 space-y-6">
                <div>
                  <h3 className="font-heading text-xl mb-4">{selectedCustomer.full_name}</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-mutedText">{t("shared.phone")}</p>
                      <p className="font-semibold">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">{t("shared.email")}</p>
                      <p className="font-semibold break-all">{selectedCustomer.email || t("ops.notProvided")}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">{t("ops.nationality")}</p>
                      <p className="font-semibold">{selectedCustomer.nationality || t("ops.notSpecified")}</p>
                    </div>
                    {selectedCustomer.id_type && (
                      <div>
                        <p className="text-mutedText">{t("ops.idType")}</p>
                        <p className="font-semibold capitalize">{selectedCustomer.id_type}</p>
                      </div>
                    )}
                    {selectedCustomer.id_number && (
                      <div>
                        <p className="text-mutedText">{t("ops.idNumber")}</p>
                        <p className="font-semibold">{selectedCustomer.id_number}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-mutedText">{t("ops.idProof")}</p>
                        {selectedCustomer.id_doc_url || selectedCustomer.id_doc_public_id ? (
                          <button type="button" className="font-semibold text-godavari" onClick={() => openSecurePhoto({ type: "customer-id", id: selectedCustomer.id }).catch(() => toast.error(t("shared.actionFailed")))}>{t("shared.view")}</button>
                        ) : (
                          <p className="font-semibold">{t("ops.notUploaded")}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-mutedText">{t("ops.livePhoto")}</p>
                        {selectedCustomer.live_photo_url || selectedCustomer.live_photo_public_id ? (
                          <button type="button" className="font-semibold text-godavari" onClick={() => openSecurePhoto({ type: "customer-live", id: selectedCustomer.id }).catch(() => toast.error(t("shared.actionFailed")))}>{t("shared.view")}</button>
                        ) : (
                          <p className="font-semibold">{t("ops.notUploaded")}</p>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-divider">
                      <p className="text-mutedText">{t("ops.totalBookings")}</p>
                      <p className="font-semibold text-lg">{selectedCustomer.total_bookings}</p>
                    </div>
                    <div>
                      <p className="text-mutedText">{t("ops.totalSpent")}</p>
                      <p className="font-semibold text-lg">INR {selectedCustomer.total_spent?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                {detailResponse?.data?.bookings && detailResponse.data.bookings.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">{t("ops.recentBookings")}</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detailResponse.data.bookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                          <p className="font-semibold">{booking.booking_ref}</p>
                          <p className="text-xs font-semibold text-godavari">{booking.booking_type === "manual" || (!booking.booking_type && booking.booked_by === "receptionist") ? t("ops.manualBooking") : t("ops.onlineBooking")}</p>
                          <p className="text-mutedText text-xs">
                            {booking.check_in} to {booking.check_out}
                          </p>
                          <p className="text-mutedText text-xs">
                            {t("common.status")}: <span className="capitalize font-semibold">{bookingStatusLabel(t, booking)}</span>
                          </p>
                          <p className="text-mutedText text-xs">
                            ID: <span className="capitalize font-semibold">{booking.id_verification_status || (booking.id_verified ? "verified" : "pending")}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

