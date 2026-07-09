import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { adminAPI } from "../../api/adminAPI";

const targetRoleOptions = [
  { label: "Reception", value: "reception" },
  { label: "Customer", value: "customer" },
];

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

export default function Notifications() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [form, setForm] = useState({
    target_role: "reception",
    type: "system",
    title: "",
    message: "",
    target_id: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications", { showUnreadOnly }],
    queryFn: () => adminAPI.listNotifications({
      unreadOnly: showUnreadOnly ? "true" : undefined,
      limit: 100,
    }),
  });

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const createMutation = useMutation({
    mutationFn: adminAPI.sendNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success(t("shared.actionCompleted"));
      setForm({
        target_role: "reception",
        type: "system",
        title: "",
        message: "",
        target_id: "",
      });
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: adminAPI.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminAPI.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success(t("ops.deleted"));
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const handleSend = (event) => {
    event.preventDefault();

    if (!form.target_role) {
      toast.error("Target role is required");
      return;
    }
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
      target_role: form.target_role,
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
        eyebrow={t("layout.notifications")}
        title={t("ops.notificationsTitle")}
        description={t("ops.notificationsDescription")}
      />

      <form className="section-card p-6 space-y-4" onSubmit={handleSend}>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label={t("ops.targetRole")}
            value={form.target_role}
            onChange={(event) => setForm((current) => ({ ...current, target_role: event.target.value }))}
            options={targetRoleOptions}
          />
          <SelectField
            label={t("ops.notificationType")}
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            options={typeOptions}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label={t("ops.offerTitle")}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
          />
          <InputField
            label={t("ops.targetId")}
            type="number"
            value={form.target_id}
            onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))}
            placeholder="e.g. customer id"
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#526359" }}>
            {t("ops.message")}
          </span>
          <textarea
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            className="min-h-24 w-full rounded-2xl border border-divider px-4 py-3 text-sm outline-none focus:border-saffron"
            required
          />
        </label>

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("ops.sending") : t("ops.sendNotification")}
        </Button>
      </form>

      <div className="section-card p-5 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {t("layout.notifications")} ({notifications.length}) • {t("ops.unread")} ({unreadCount})
        </p>
        <Button
          variant="outline"
          onClick={() => setShowUnreadOnly((current) => !current)}
        >
          {showUnreadOnly ? t("ops.showAll") : t("ops.showUnread")}
        </Button>
      </div>

      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">{t("ops.loadingNotifications")}</p>
        ) : notifications.length === 0 ? (
          <p className="p-5 text-mutedText">{t("ops.noNotifications")}</p>
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
                    {t("ops.markRead")}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
