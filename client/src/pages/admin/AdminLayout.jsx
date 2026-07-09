import { Bell, BedDouble, Boxes, ClipboardList, LayoutDashboard, MessageSquareQuote, NotebookTabs, Settings as SettingsIcon, Users, Wrench, Gift, RotateCcw, TicketPercent, Sparkles, ScrollText } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PortalShell from "../../layout/PortalShell";

const items = [
  { labelKey: "layout.dashboard", to: "/admin", icon: LayoutDashboard },
  { labelKey: "layout.manageRooms", to: "/admin/rooms", icon: BedDouble },
  { labelKey: "layout.amenities", to: "/admin/amenities", icon: Sparkles },
  { labelKey: "layout.systemLogs", to: "/admin/logs", icon: ScrollText },
  { labelKey: "layout.manageStaff", to: "/admin/staff", icon: Users },
  { labelKey: "layout.allBookings", to: "/admin/bookings", icon: ClipboardList },
  { labelKey: "layout.refunds", to: "/admin/refunds", icon: RotateCcw },
  { labelKey: "layout.reports", to: "/admin/reports", icon: NotebookTabs },
  { labelKey: "layout.inventory", to: "/admin/inventory", icon: Boxes },
  { labelKey: "layout.maintenance", to: "/admin/maintenance", icon: Wrench },
  { labelKey: "layout.feedback", to: "/admin/feedback", icon: MessageSquareQuote },
  { labelKey: "layout.enquiries", to: "/admin/enquiries", icon: ClipboardList },
  { labelKey: "layout.customers", to: "/admin/customers", icon: Users },
  { labelKey: "layout.settings", to: "/admin/settings", icon: SettingsIcon },
  { labelKey: "layout.offers", to: "/admin/offers", icon: Gift },
  { labelKey: "layout.coupons", to: "/admin/coupons", icon: TicketPercent },
  { labelKey: "layout.notifications", to: "/admin/notifications", icon: Bell },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const translatedItems = items.map((item) => ({ ...item, label: t(item.labelKey) }));
  return (
    <PortalShell title={t("layout.adminTitle")} subtitle={t("layout.adminSubtitle")} items={translatedItems}>
      <Outlet />
    </PortalShell>
  );
}

