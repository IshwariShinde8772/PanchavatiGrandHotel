import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import { feedbackAPI } from "../../api/feedbackAPI";

function StarRating({ rating }) {
  return (
    <span style={{ color: "#F59E0B", fontSize: 16, letterSpacing: 1 }}>
      {"★".repeat(Math.round(rating || 0))}{"☆".repeat(5 - Math.round(rating || 0))}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: { bg: "#FEF3C7", color: "#92400E" },
    published: { bg: "#DCFCE7", color: "#166534" },
    rejected: { bg: "#FEE2E2", color: "#991B1B" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function FeedbackAdmin() {
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-feedbacks"],
    queryFn: () => feedbackAPI.adminList(),
  });

  const feedbacks = res?.data || [];

  const moderateMutation = useMutation({
    mutationFn: ({ id, payload }) => feedbackAPI.moderate(id, payload),
    onSuccess: () => { queryClient.invalidateQueries(["admin-feedbacks"]); toast.success("Feedback updated"); },
    onError: (e) => toast.error(e.response?.data?.error || "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: feedbackAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries(["admin-feedbacks"]); toast.success("Feedback deleted"); },
    onError: (e) => toast.error(e.response?.data?.error || "Failed to delete"),
  });

  const handleApprove = (id) => moderateMutation.mutate({ id, payload: { status: "published" } });
  const handleReject = (id) => moderateMutation.mutate({ id, payload: { status: "rejected" } });
  const handleDelete = (id) => { if (window.confirm("Delete this feedback?")) deleteMutation.mutate(id); };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Feedback Management"
        title="Review moderation and publishing"
        description="Approve or reject guest reviews before they appear on public testimonials."
      />

      {isLoading ? (
        <p style={{ color: "#6B7280", padding: 20 }}>Loading feedback…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {feedbacks.map((item) => (
            <div
              key={item.id}
              style={{
                background: "white",
                borderRadius: 14,
                padding: "18px 22px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                border: item.status === "published" ? "1.5px solid #BBF7D0" : "1.5px solid #E5E7EB",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              {/* Left */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{item.cust_name || "Guest"}</p>
                  <StarRating rating={item.rating} />
                  <StatusBadge status={item.status} />
                </div>
                {item.title && <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{item.title}</p>}
                <p style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>{item.comment}</p>
                {item.room_category && (
                  <p style={{ fontSize: 12, color: "#6B7280" }}>Category: {item.room_category}</p>
                )}
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : ""}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
                {item.status !== "published" && (
                  <button
                    onClick={() => handleApprove(item.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#16A34A", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ✓ Approve
                  </button>
                )}
                {item.status !== "rejected" && (
                  <button
                    onClick={() => handleReject(item.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#EF4444", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ✕ Reject
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #DC2626", background: "white", color: "#DC2626", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          {feedbacks.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF" }}>
              <p style={{ fontSize: 18, fontWeight: 600 }}>No feedback yet</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>Guest reviews will appear here for moderation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
