import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import { enquiryAPI } from "../../api/enquiryAPI";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";

function StatusBadge({ responded, t }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: responded ? "#DCFCE7" : "#FEF3C7",
      color: responded ? "#16A34A" : "#92400E",
    }}>
      {responded ? t("ops.responded") : t("statuses.booking.pending")}
    </span>
  );
}

function formatSource(value) {
  const normalized = String(value || "online").replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function Enquiries() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [respondModal, setRespondModal] = useState(null); // stores enquiry object
  const [responseText, setResponseText] = useState("");
  const [page, setPage] = useState(1);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-enquiries", page],
    queryFn: () => enquiryAPI.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const enquiries = res?.data || [];
  const pagination = getPaginationMeta(res, enquiries.length);

  const respondMutation = useMutation({
    mutationFn: ({ id, payload }) => enquiryAPI.respond(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-enquiries"]);
      toast.success(t("shared.actionCompleted"));
      setRespondModal(null);
      setResponseText("");
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: enquiryAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(["admin-enquiries"]); toast.success(t("ops.deleted")); },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleRespond = () => {
    if (!responseText.trim()) { toast.error(t("ops.enterResponse")); return; }
    respondMutation.mutate({ id: respondModal.id, payload: { response_text: responseText } });
  };

  const handleDelete = (id) => {
    if (window.confirm(t("shared.confirmDelete"))) deleteMutation.mutate(id);
  };

  const exportColumns = [
    { header: "Name", value: (row) => row.full_name || row.name || "" },
    { header: "Phone", value: (row) => row.phone || "" },
    { header: "Email", value: (row) => row.email || "" },
    { header: "Source", value: (row) => row.source || "online" },
    { header: "Type", value: (row) => row.enquiry_type || "" },
    { header: "Message", value: (row) => row.message || "" },
    { header: "Status", value: (row) => row.is_responded ? "Responded" : "Pending" },
  ];

  const exportEnquiries = async (format) => {
    const response = await enquiryAPI.list({ page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: "Enquiries List",
      columns: exportColumns,
      rows: response?.data || [],
      filename: `enquiries-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.enquiries")}
        title={t("ops.customerEnquiries")}
        description={t("ops.enquiryDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportEnquiries("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportEnquiries("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      {isLoading ? (
        <p style={{ color: "#6B7280", padding: 20 }}>{t("common.loading")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {enquiries.map((enq) => (
            <div
              key={enq.id}
              style={{
                background: "white",
                borderRadius: 14,
                padding: "18px 22px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                border: enq.is_responded ? "1.5px solid #BBF7D0" : "1.5px solid #E5E7EB",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              {/* Left: info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{enq.full_name || enq.name}</p>
                  {enq.phone && <span style={{ fontSize: 13, color: "#6B7280" }}>{enq.phone}</span>}
                  {enq.email && <span style={{ fontSize: 13, color: "#2563EB" }}>{enq.email}</span>}
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0A4D34" }}>{formatSource(enq.source)}</span>
                  {enq.enquiry_type && <span style={{ fontSize: 12, color: "#6B7280" }}>{String(enq.enquiry_type).replace(/_/g, " ")}</span>}
                  <StatusBadge responded={enq.is_responded} t={t} />
                </div>
                <p style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>{enq.message}</p>
                {enq.check_in && (
                  <p style={{ fontSize: 12, color: "#6B7280" }}>{t("ops.preferredStay")}: {enq.check_in}{enq.check_out ? ` → ${enq.check_out}` : ""}</p>
                )}
                {enq.is_responded && enq.response_text && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, color: "#166534" }}>{t("ops.response")}: {enq.response_text}</p>
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {!enq.is_responded && (
                  <button
                    onClick={() => { setRespondModal(enq); setResponseText(""); }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      border: "none",
                      background: "#EA580C",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    💬 {t("ops.sendResponse")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(enq.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #DC2626",
                    background: "white",
                    color: "#DC2626",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          {enquiries.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF" }}>
              <p style={{ fontSize: 18, fontWeight: 600 }}>{t("ops.noEnquiries")}</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>{t("ops.websiteEnquiriesHint")}</p>
            </div>
          )}
          <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Respond Modal */}
      {respondModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t("ops.respondToEnquiry")}</h3>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>{t("ops.from")}: <strong>{respondModal.name}</strong> — {respondModal.email}</p>
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 16, borderLeft: "3px solid #0A4D34" }}>
              <p style={{ fontSize: 14, color: "#374151" }}>{respondModal.message}</p>
            </div>
            <textarea
              rows={5}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t("ops.yourResponse")}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #D1D5DB",
                fontSize: 14,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setRespondModal(null)}
                style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #D1D5DB", background: "white", color: "#374151", fontWeight: 600, cursor: "pointer" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRespond}
                disabled={respondMutation.isPending}
                style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#0A4D34", color: "white", fontWeight: 700, cursor: "pointer", opacity: respondMutation.isPending ? 0.6 : 1 }}
              >
                {respondMutation.isPending ? t("ops.sending") : t("ops.sendResponse")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
