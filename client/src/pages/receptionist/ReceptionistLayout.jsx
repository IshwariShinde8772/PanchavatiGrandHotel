import { Bell, ClipboardList, DoorClosed, LayoutDashboard, Receipt, UserCheck, Wrench, MessageSquare, History, BookOpen, Calendar } from "lucide-react";
import { Outlet } from "react-router-dom";
import PortalShell from "../../layout/PortalShell";

const items = [
  { label: "Dashboard", to: "/receptionist", icon: LayoutDashboard },
  { label: "Bookings", to: "/receptionist/bookings", icon: ClipboardList },
  { label: "Reserved Rooms", to: "/receptionist/reserved-rooms", icon: BookOpen },
  { label: "Room Grid", to: "/receptionist/room-grid", icon: DoorClosed },
  { label: "Check-In/Out", to: "/receptionist/check-in-out", icon: UserCheck },
  { label: "Notifications", to: "/receptionist/notifications", icon: Bell },
  { label: "Enquiries", to: "/receptionist/enquiries", icon: MessageSquare },
  { label: "Extensions", to: "/receptionist/extensions", icon: Calendar },
  { label: "Bill Generator", to: "/receptionist/bill-generator", icon: Receipt },
  { label: "Walk-in Booking", to: "/receptionist/walk-in", icon: UserCheck },
  { label: "Guest History", to: "/receptionist/customer-history", icon: History },
  { label: "Maintenance", to: "/receptionist/maintenance", icon: Wrench },
];

export default function ReceptionistLayout() {
  return (
    <PortalShell title="Reception Desk" subtitle="Front office operations for arrivals, departures, and guest support." items={items}>
      <Outlet />
    </PortalShell>
  );
}
