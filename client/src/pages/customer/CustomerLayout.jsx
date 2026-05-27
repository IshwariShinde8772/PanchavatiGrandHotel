import { Bell, CreditCard, Heart, Home, MessageSquareMore, User, HelpCircle } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PortalShell from "../../layout/PortalShell";

export default function CustomerLayout() {
  const { t } = useTranslation();
  const items = [
    { label: t("common.home"), to: "/customer", icon: Home },
    { label: t("nav.myTrips"), to: "/customer/my-bookings", icon: Home },
    { label: t("nav.myRooms"), to: "/customer/my-rooms", icon: Heart },
    { label: t("nav.enquiry"), to: "/customer/enquiry", icon: HelpCircle },
    { label: t("nav.transactions"), to: "/customer/transactions", icon: CreditCard },
    { label: t("nav.feedback"), to: "/customer/feedback", icon: MessageSquareMore },
    { label: t("nav.notifications"), to: "/customer/notifications", icon: Bell },
    { label: t("nav.profile"), to: "/customer/profile", icon: User },
  ];

  return (
    <PortalShell title={t("portal.title")} subtitle={t("portal.subtitle")} items={items}>
      <Outlet />
    </PortalShell>
  );
}
