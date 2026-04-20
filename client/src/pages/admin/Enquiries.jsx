import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import { enquiryAPI } from "../../api/enquiryAPI";

function StatusBadge({ responded }) {
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
      {responded ? "Responded" : "Pending"}
    </span>
  );
}

export default function Enquiries() {
  const queryClient = useQueryClient();
  const [respondModal, setRespondModal] = useState(null); // stores enquiry object
  const [responseText, setResponseText] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: () => enquiryAPI.list(),
  });

  const enquiries = res?.data || [];

  const respondMutation = useMutation({
    mutationFn: ({ id, payload }) => enquiryAPI.respond(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["admin-enquiries"]);
      toast.success("Response sent successfully");
      setRespondModal(null);
      setResponseText("");
    },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to send response"),
  });

  const deleteMutation = useMutation({
    mutationFn: enquiryAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(["admin-enquiries"]); toast.success("Enquiry deleted"); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to delete"),
  });

  const handleRespond = () => {
    if (!responseText.trim()) { toast.error("Please enter a response."); return; }
    respondMutation.mutate({ id: respondModal.id, payload: { response_text: responseText } });
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this enquiry?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Enquiries"
        title="Customer Enquiries"
        description="View and respond to guest enquiries from the website contact form."
      />

      {isLoading ? (
        <p style={{ color: "#6B7280", padding: 20 }}>Loading enquiries…</p>
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
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{enq.name}</p>
                  {enq.phone && <span style={{ fontSize: 13, color: "#6B7280" }}>{enq.phone}</span>}
                  {enq.email && <span style={{ fontSize: 13, color: "#2563EB" }}>{enq.email}</span>}
                  <StatusBadge responded={enq.is_responded} />
                </div>
                <p style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>{enq.message}</p>
                {enq.check_in_interest && (
                  <p style={{ fontSize: 12, color: "#6B7280" }}>Interested check-in: {new Date(enq.check_in_interest).toLocaleDateString()}</p>
                )}
                {enq.is_responded && enq.response_text && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #16A34A" }}>
                    <p style={{ fontSize: 13, color: "#166534" }}>Response: {enq.response_text}</p>
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
                    💬 Respond
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
              <p style={{ fontSize: 18, fontWeight: 600 }}>No enquiries yet</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>Customer enquiries from the website will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Respond Modal */}
      {respondModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 16 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Respond to Enquiry</h3>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>From: <strong>{respondModal.name}</strong> — {respondModal.email}</p>
            <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px", marginBottom: 16, borderLeft: "3px solid #0A4D34" }}>
              <p style={{ fontSize: 14, color: "#374151" }}>{respondModal.message}</p>
            </div>
            <textarea
              rows={5}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response here…"
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
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={respondMutation.isPending}
                style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#0A4D34", color: "white", fontWeight: 700, cursor: "pointer", opacity: respondMutation.isPending ? 0.6 : 1 }}
              >
                {respondMutation.isPending ? "Sending…" : "Send Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
