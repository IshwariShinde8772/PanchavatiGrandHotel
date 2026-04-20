import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { authAPI } from "../../api/authAPI";

const getTimeDiff = (date) => {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

export default function Notifications() {
  const queryClient = useQueryClient();
  
  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["customer-notifications"],
    queryFn: () => authAPI.getNotifications?.() || { data: [] },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => authAPI.markNotificationsRead?.(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: ({ id }) => authAPI.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
      toast.success("Notification deleted");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to delete notification"),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => authAPI.clearNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
      toast.success("All notifications cleared");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to clear notifications"),
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          eyebrow="Notifications" 
          title="Stay updates and reminders" 
          description="Booking confirmations, check-in reminders, and trip follow-ups appear here." 
        />
        <div className="text-center py-12">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader 
          eyebrow="Notifications" 
          title="Stay updates and reminders" 
          description="Booking confirmations, check-in reminders, and trip follow-ups appear here." 
        />
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markReadMutation.mutate()}
              className="text-sm px-3 py-2 rounded-lg border border-divider hover:bg-slate-50 transition-colors"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Clear all notifications? This action cannot be undone.")) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isPending}
              className="text-red-600 hover:bg-red-50"
              size="sm"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="section-card p-8 text-center">
          <p className="text-mutedText">No notifications yet. They'll appear here when you get booking updates.</p>
        </div>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {notifications.map((item) => (
            <div 
              key={item.id} 
              className={`p-5 transition-colors flex items-start justify-between gap-4 ${!item.is_read ? "bg-blue-50" : ""}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  {!item.is_read && (
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <p className="mt-2 text-sm text-mutedText">{item.message}</p>
                <span className="mt-2 inline-block text-xs text-mutedText">
                  {getTimeDiff(item.created_at)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this notification?")) {
                    deleteNotificationMutation.mutate({ id: item.id });
                  }
                }}
                disabled={deleteNotificationMutation.isPending}
                className="text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
