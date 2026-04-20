import { Bell, CreditCard, Heart, Home, MessageSquareMore, User, HelpCircle } from "lucide-react";
import { Outlet } from "react-router-dom";
import PortalShell from "../../layout/PortalShell";

const items = [
  { label: "Home", to: "/customer", icon: Home },
  { label: "My Trips", to: "/customer/my-bookings", icon: Home },
  { label: "My Rooms", to: "/customer/my-rooms", icon: Heart },
  { label: "Enquiry", to: "/customer/enquiry", icon: HelpCircle },
  { label: "Transactions", to: "/customer/transactions", icon: CreditCard },
  { label: "Feedback", to: "/customer/feedback", icon: MessageSquareMore },
  { label: "Notifications", to: "/customer/notifications", icon: Bell },
  { label: "Profile", to: "/customer/profile", icon: User },
];

export default function CustomerLayout() {
  return (
    <PortalShell title="Customer Portal" subtitle="Manage your stays, saved rooms, and profile details." items={items}>
      <Outlet />
    </PortalShell>
  );
}
