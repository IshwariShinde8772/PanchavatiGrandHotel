import { Bell, BedDouble, Boxes, ClipboardList, LayoutDashboard, MessageSquareQuote, NotebookTabs, Settings as SettingsIcon, Users, Wrench, Gift } from "lucide-react";
import { Outlet } from "react-router-dom";
import PortalShell from "../../layout/PortalShell";

const items = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Manage Rooms", to: "/admin/rooms", icon: BedDouble },
  { label: "Manage Staff", to: "/admin/staff", icon: Users },
  { label: "All Bookings", to: "/admin/bookings", icon: ClipboardList },
  { label: "Reports", to: "/admin/reports", icon: NotebookTabs },
  { label: "Inventory", to: "/admin/inventory", icon: Boxes },
  { label: "Maintenance", to: "/admin/maintenance", icon: Wrench },
  { label: "Feedback", to: "/admin/feedback", icon: MessageSquareQuote },
  { label: "Enquiries", to: "/admin/enquiries", icon: ClipboardList },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Settings", to: "/admin/settings", icon: SettingsIcon },
  { label: "Seasonal Pricing", to: "/admin/seasonal-pricing", icon: BedDouble },
  { label: "Offers", to: "/admin/offers", icon: Gift },
  { label: "Notifications", to: "/admin/notifications", icon: Bell },
];

export default function AdminLayout() {
  return (
    <PortalShell title="Admin Control Panel" subtitle="Full hotel oversight across bookings, staff, operations, and revenue." items={items}>
      <Outlet />
    </PortalShell>
  );
}

