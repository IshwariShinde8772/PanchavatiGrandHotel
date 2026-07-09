import { ClipboardList, DoorClosed, LayoutDashboard, Receipt, UserCheck, Wrench, MessageSquare, History, BookOpen, Calendar, UserPlus, RotateCcw } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PortalShell from "../../layout/PortalShell";

const items = [
  { labelKey: "layout.dashboard", to: "/receptionist", icon: LayoutDashboard },
  { labelKey: "layout.bookings", to: "/receptionist/bookings", icon: ClipboardList },
  { labelKey: "layout.reservedRooms", to: "/receptionist/reserved-rooms", icon: BookOpen },
  { labelKey: "layout.refunds", to: "/receptionist/refunds", icon: RotateCcw },
  { labelKey: "layout.roomGrid", to: "/receptionist/room-grid", icon: DoorClosed },
  { labelKey: "layout.checkInOut", to: "/receptionist/check-in-out", icon: UserCheck },
  { labelKey: "layout.addStaff", to: "/receptionist/add-staff", icon: UserPlus },
  { labelKey: "layout.enquiries", to: "/receptionist/enquiries", icon: MessageSquare },
  { labelKey: "layout.extensions", to: "/receptionist/extensions", icon: Calendar },
  { labelKey: "layout.billGenerator", to: "/receptionist/bill-generator", icon: Receipt },
  { labelKey: "layout.walkInBooking", to: "/receptionist/walk-in", icon: UserCheck },
  { labelKey: "layout.guestHistory", to: "/receptionist/customer-history", icon: History },
  { labelKey: "layout.maintenance", to: "/receptionist/maintenance", icon: Wrench },
];

export default function ReceptionistLayout() {
  const { t } = useTranslation();
  const translatedItems = items.map((item) => ({ ...item, label: t(item.labelKey) }));
  return (
    <PortalShell title={t("layout.receptionTitle")} subtitle={t("layout.receptionSubtitle")} items={translatedItems}>
      <Outlet />
    </PortalShell>
  );
}
