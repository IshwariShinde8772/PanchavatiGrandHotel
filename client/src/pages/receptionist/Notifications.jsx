import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { receptionistAPI } from "../../api/receptionistAPI";

const typeOptions = [
  { label: "System", value: "system" },
  { label: "Booking", value: "booking" },
  { label: "Payment", value: "payment" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Task", value: "task" },
];

function relativeTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  const diffInSeconds = Math.max(1, Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000));
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function ReceptionNotifications() {
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [form, setForm] = useState({
    type: "system",
    title: "",
    message: "",
    target_id: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["reception-notifications", { showUnreadOnly }],
    queryFn: () => receptionistAPI.listNotifications({
      unreadOnly: showUnreadOnly ? "true" : undefined,
      limit: 100,
    }),
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const createMutation = useMutation({
    mutationFn: receptionistAPI.sendNotificationToCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-notifications"] });
      toast.success("Notification sent to customer successfully");
      setForm({
        type: "system",
        title: "",
        message: "",
        target_id: "",
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to send notification");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: receptionistAPI.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-notifications"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to mark notification as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: receptionistAPI.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception-notifications"] });
      toast.success("Notification deleted");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to delete notification");
    },
  });

  const handleSend = (event) => {
    event.preventDefault();

    if (!form.type) {
      toast.error("Notification type is required");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Message is required");
      return;
    }

    const payload = {
      target_role: "customer",
      type: form.type,
      title: form.title.trim(),
      message: form.message.trim(),
    };

    if (form.target_id.trim()) {
      payload.target_id = Number(form.target_id);
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Customer communication desk"
        description="Review incoming reception alerts and send updates directly to customers."
      />

      <form className="section-card p-6 space-y-4" onSubmit={handleSend}>
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Target Role" value="Customer" readOnly />
          <SelectField
            label="Type"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            options={typeOptions}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
          <InputField
            label="Customer ID (optional)"
            type="number"
            value={form.target_id}
            onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))}
            placeholder="Send to one customer only"
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#526359" }}>
            Message
          </span>
          <textarea
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            className="min-h-24 w-full rounded-2xl border border-divider px-4 py-3 text-sm outline-none focus:border-saffron"
            required
          />
        </label>

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Sending..." : "Send Notification"}
        </Button>
      </form>

      <div className="section-card p-5 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Notifications ({notifications.length}) • Unread ({unreadCount})
        </p>
        <Button variant="outline" onClick={() => setShowUnreadOnly((current) => !current)}>
          {showUnreadOnly ? "Show All" : "Show Unread Only"}
        </Button>
      </div>

      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="p-5 text-mutedText">No notifications found.</p>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="p-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  {!item.is_read ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                </div>
                <p className="mt-1 text-sm text-mutedText">{item.message}</p>
                <p className="mt-2 text-xs text-mutedText">
                  {item.target_role}
                  {item.target_id ? `:${item.target_id}` : ""}
                  {" • "}
                  {item.type}
                  {" • "}
                  {relativeTime(item.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                {!item.is_read ? (
                  <Button
                    variant="outline"
                    onClick={() => markReadMutation.mutate(item.id)}
                    disabled={markReadMutation.isPending}
                  >
                    Mark Read
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
