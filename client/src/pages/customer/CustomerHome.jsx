import { useAuthStore } from "../../store/authStore";
import { useMyBookings } from "../../hooks/useBookings";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { transactionAPI } from "../../api/transactionAPI";

export default function CustomerHome() {
  const user = useAuthStore((state) => state.user);
  const { data } = useMyBookings();
  const { data: transactionResponse } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: transactionAPI.mine,
  });
  const bookings = data?.data || [];
  const transactions = transactionResponse?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Welcome Back"
        title={`Namaste, ${user?.full_name || user?.name || "Guest"} 🙏`}
        description="Your Nashik stays, saved rooms, and travel details all live here."
      />
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title="Upcoming Trips" value={bookings.filter((item) => item.status === "confirmed").length} accent="saffron" />
        <StatCard title="Completed Stays" value={bookings.filter((item) => item.status === "checked_out").length} accent="vineyard" />
        <StatCard title="Pending Payments" value={transactions.filter((item) => item.status === "pending").length} accent="gold" />
      </div>
      <div className="section-card p-6">
        <h2 className="font-heading text-3xl">Return Guest Perks</h2>
        <p className="mt-3 text-mutedText">
          Welcome back, {user?.full_name || "Guest"}! You can rebook past stays, manage ID details, and choose pay-at-hotel on eligible rooms.
        </p>
      </div>
    </div>
  );
}
