import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { MessageSquare, RefreshCw, Reply, CheckCircle, Clock, Plus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { enquiryAPI } from "../../api/enquiryAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";

const blankOfflineForm = {
  full_name: "",
  phone: "",
  email: "",
  enquiry_type: "room_booking",
  check_in: "",
  check_out: "",
  adults: "",
  room_category: "",
  message: "",
  source: "offline",
  status: "new",
};

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue || todayDateInput());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function EnquiryManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineForm, setOfflineForm] = useState(blankOfflineForm);
  const [page, setPage] = useState(1);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["receptionist-enquiries", page],
    queryFn: () => enquiryAPI.receptionistList({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const enquiries = res?.data || [];
  const pagination = getPaginationMeta(res, enquiries.length);

  const respondMutation = useMutation({
    mutationFn: ({ id, response }) => enquiryAPI.receptionistRespond(id, { response_text: response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-enquiries"] });
      toast.success(t("shared.actionCompleted"));
      setSelectedEnquiry(null);
      setResponseText("");
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const createOfflineMutation = useMutation({
    mutationFn: enquiryAPI.receptionistCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-enquiries"] });
      toast.success(t("shared.actionCompleted"));
      setOfflineForm(blankOfflineForm);
      setShowOfflineForm(false);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleRespond = () => {
    if (!responseText.trim()) {
      toast.error(t("ops.enterResponse"));
      return;
    }
    respondMutation.mutate({ id: selectedEnquiry.id, response: responseText });
  };

  const submitOfflineEnquiry = () => {
    if (!offlineForm.full_name.trim() || !offlineForm.phone.trim() || !offlineForm.message.trim()) {
      toast.error(t("ops.completeFields"));
      return;
    }

    createOfflineMutation.mutate({
      ...offlineForm,
      adults: offlineForm.adults ? Number(offlineForm.adults) : undefined,
      check_in: offlineForm.check_in || undefined,
      check_out: offlineForm.check_out || undefined,
      email: offlineForm.email || undefined,
    });
  };

  const pendingEnquiries = enquiries.filter(e => !e.is_responded);
  const respondedEnquiries = enquiries.filter(e => e.is_responded);

  const exportColumns = [
    { header: t("shared.name"), value: (row) => row.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.phone || "" },
    { header: t("shared.email"), value: (row) => row.email || "" },
    { header: t("ops.source"), value: (row) => row.source || "" },
    { header: t("ops.type"), value: (row) => row.enquiry_type || "" },
    { header: t("customer.checkIn"), value: (row) => row.check_in || "" },
    { header: t("customer.checkOut"), value: (row) => row.check_out || "" },
    { header: t("common.status"), value: (row) => row.is_responded ? t("ops.responded") : t("statuses.booking.pending") },
  ];

  const exportEnquiries = async (format) => {
    const response = await enquiryAPI.receptionistList({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Reception Enquiries List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `reception-enquiries-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow={t("ops.enquiryManagement")}
        title={t("ops.customerEnquiries")}
        description={t("ops.enquiryDescription")}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-orange-500" />
            <span>{pendingEnquiries.length} {t("statuses.booking.pending")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-green-500" />
            <span>{respondedEnquiries.length} {t("ops.responded")}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => exportEnquiries("excel")}>{t("shared.exportExcel")}</Button>
          <Button variant="outline" onClick={() => exportEnquiries("pdf")}>{t("shared.exportPdf")}</Button>
          <Button onClick={() => setShowOfflineForm((value) => !value)} className="flex items-center gap-2">
            <Plus size={18} /> {t("ops.addOfflineEnquiry")}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="flex items-center gap-2 border-godavari text-godavari"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> {t("ops.refresh")}
          </Button>
        </div>
      </div>

      {showOfflineForm ? (
        <div className="section-card p-6 grid gap-4 md:grid-cols-2">
          <InputField label={t("shared.customer")} value={offlineForm.full_name} onChange={(event) => setOfflineForm({ ...offlineForm, full_name: event.target.value })} />
          <InputField label={t("auth.phoneNumber")} value={offlineForm.phone} onChange={(event) => setOfflineForm({ ...offlineForm, phone: event.target.value })} />
          <InputField label={`${t("shared.email")} (${t("shared.optional")})`} type="email" value={offlineForm.email} onChange={(event) => setOfflineForm({ ...offlineForm, email: event.target.value })} />
          <SelectField
            label={t("ops.source")}
            value={offlineForm.source}
            onChange={(event) => setOfflineForm({ ...offlineForm, source: event.target.value })}
            options={[
              { label: t("ops.offline"), value: "offline" },
              { label: t("ops.walkIn"), value: "walk-in" },
              { label: t("shared.phone"), value: "phone" },
            ]}
          />
          <SelectField
            label={t("ops.enquiryType")}
            value={offlineForm.enquiry_type}
            onChange={(event) => setOfflineForm({ ...offlineForm, enquiry_type: event.target.value })}
            options={[
              { label: t("ops.roomBooking"), value: "room_booking" },
              { label: t("ops.event"), value: "event" },
              { label: t("ops.restaurant"), value: "restaurant" },
              { label: t("ops.general"), value: "general" },
              { label: t("ops.other"), value: "other" },
            ]}
          />
          <SelectField
            label={t("common.status")}
            value={offlineForm.status}
            onChange={(event) => setOfflineForm({ ...offlineForm, status: event.target.value })}
            options={[
              { label: t("ops.new"), value: "new" },
              { label: t("ops.followUp"), value: "follow-up" },
              { label: t("ops.converted"), value: "converted" },
              { label: t("ops.closed"), value: "closed" },
            ]}
          />
          <InputField label={t("ops.preferredCheckIn")} type="date" min={todayDateInput()} value={offlineForm.check_in} onChange={(event) => {
            const check_in = event.target.value;
            setOfflineForm((current) => ({
              ...current,
              check_in,
              check_out: current.check_out && new Date(current.check_out) <= new Date(check_in) ? "" : current.check_out,
            }));
          }} />
          <InputField label={t("ops.preferredCheckOut")} type="date" min={offlineForm.check_in ? addDays(offlineForm.check_in, 1) : addDays(todayDateInput(), 1)} value={offlineForm.check_out} onChange={(event) => setOfflineForm({ ...offlineForm, check_out: event.target.value })} />
          <InputField label={t("common.guests")} type="number" min="1" value={offlineForm.adults} onChange={(event) => setOfflineForm({ ...offlineForm, adults: event.target.value })} />
          <InputField label={t("ops.roomTypes")} value={offlineForm.room_category} onChange={(event) => setOfflineForm({ ...offlineForm, room_category: event.target.value })} />
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium">{t("ops.messageNotes")}</span>
            <textarea className="w-full rounded-xl border border-divider p-3" rows={4} value={offlineForm.message} onChange={(event) => setOfflineForm({ ...offlineForm, message: event.target.value })} />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowOfflineForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={submitOfflineEnquiry} disabled={createOfflineMutation.isPending}>
              {createOfflineMutation.isPending ? t("common.saving") : t("ops.saveEnquiry")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enquiry List */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-vineyard">{t("ops.allEnquiries")}</h3>

          {isLoading ? (
            <div className="section-card p-8 text-center text-mutedText">
              {t("common.loading")}
            </div>
          ) : enquiries.length === 0 ? (
            <div className="section-card p-8 text-center text-mutedText">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t("ops.noEnquiries")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  onClick={() => setSelectedEnquiry(enquiry)}
                  className={`section-card p-4 cursor-pointer transition-colors ${
                    selectedEnquiry?.id === enquiry.id ? "ring-2 ring-saffron" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-vineyard">{enquiry.full_name}</h4>
                      {enquiry.is_responded ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Clock size={16} className="text-orange-500" />
                      )}
                    </div>
                    <span className="text-xs text-mutedText">
                      {new Date(enquiry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-mutedText mb-2">{enquiry.phone}</p>
                  <p className="text-xs font-semibold uppercase text-godavari">{enquiry.source || "online"}</p>
                  <p className="text-sm line-clamp-2">{enquiry.message}</p>
                  {enquiry.check_in && enquiry.check_out && (
                    <p className="text-xs text-mutedText mt-1">
                      {enquiry.check_in} to {enquiry.check_out}
                      {enquiry.adults && ` • ${enquiry.adults} adults`}
                      {enquiry.room_category && ` • ${enquiry.room_category}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>

        {/* Response Panel */}
        <div>
          <h3 className="font-heading text-lg font-bold text-vineyard mb-4">{t("ops.respondToEnquiry")}</h3>

          {selectedEnquiry ? (
            <div className="section-card p-6">
              <div className="mb-6">
                <h4 className="font-bold text-vineyard mb-2">{t("ops.enquiryDetails")}</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-mutedText">{t("shared.name")}</p>
                      <p className="font-semibold">{selectedEnquiry.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-mutedText">{t("shared.phone")}</p>
                      <p className="font-semibold">{selectedEnquiry.phone}</p>
                    </div>
                  </div>
                  {selectedEnquiry.email && (
                    <div>
                      <p className="text-sm text-mutedText">{t("shared.email")}</p>
                      <p className="font-semibold">{selectedEnquiry.email}</p>
                    </div>
                  )}
                  {selectedEnquiry.check_in && selectedEnquiry.check_out && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-mutedText">{t("customer.checkIn")}</p>
                        <p className="font-semibold">{selectedEnquiry.check_in}</p>
                      </div>
                      <div>
                        <p className="text-sm text-mutedText">{t("customer.checkOut")}</p>
                        <p className="font-semibold">{selectedEnquiry.check_out}</p>
                      </div>
                    </div>
                  )}
                  {(selectedEnquiry.adults || selectedEnquiry.room_category) && (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedEnquiry.adults && (
                        <div>
                          <p className="text-sm text-mutedText">{t("customer.adults")}</p>
                          <p className="font-semibold">{selectedEnquiry.adults}</p>
                        </div>
                      )}
                      {selectedEnquiry.room_category && (
                        <div>
                          <p className="text-sm text-mutedText">{t("ops.roomTypes")}</p>
                          <p className="font-semibold">{selectedEnquiry.room_category}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-mutedText">{t("ops.message")}</p>
                    <p className="font-semibold bg-white p-2 rounded border mt-1">{selectedEnquiry.message}</p>
                  </div>
                </div>
              </div>

              {selectedEnquiry.is_responded ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-semibold text-green-600">{t("ops.alreadyResponded")}</span>
                  </div>
                  <p className="text-sm text-green-700">{selectedEnquiry.response_text}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("ops.yourResponse")}</label>
                    <textarea
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-saffron focus:border-transparent"
                      rows={6}
                      placeholder={t("ops.yourResponse")}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleRespond}
                    disabled={respondMutation.isPending || !responseText.trim()}
                    className="w-full bg-saffron hover:bg-saffron/90 flex items-center justify-center gap-2"
                  >
                    <Reply size={16} />
                    {respondMutation.isPending ? t("ops.sending") : t("ops.sendResponse")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="section-card p-8 text-center text-mutedText">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t("ops.selectEnquiryHint")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
