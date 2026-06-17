import { Navigate, Route, Routes } from "react-router-dom";
import PublicShell from "../layout/PublicShell";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import Home from "../pages/public/Home";
import Rooms from "../pages/public/Rooms";
import RoomDetail from "../pages/public/RoomDetail";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import Testimonials from "../pages/public/Testimonials";
import Offers from "../pages/public/Offers";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AuthCallback from "../pages/auth/AuthCallback";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import BookingFlow from "../pages/booking/BookingFlow";
import BookingConfirmPage from "../pages/booking/BookingConfirmPage";
import CustomerLayout from "../pages/customer/CustomerLayout";
import CustomerHome from "../pages/customer/CustomerHome";
import MyBookings from "../pages/customer/MyBookings";
import BookingDetail from "../pages/customer/BookingDetail";
import Profile from "../pages/customer/Profile";
import MyRooms from "../pages/customer/MyRooms";
import Feedback from "../pages/customer/Feedback";
import Notifications from "../pages/customer/Notifications";
import Transactions from "../pages/customer/Transactions";
import Enquiry from "../pages/customer/Enquiry";
import ReceptionistLayout from "../pages/receptionist/ReceptionistLayout";
import ReceptionistDashboard from "../pages/receptionist/Dashboard";
import ManageBookings from "../pages/receptionist/ManageBookings";
import RoomGrid from "../pages/receptionist/RoomGrid";
import BillGenerator from "../pages/receptionist/BillGenerator";
import WalkInBooking from "../pages/receptionist/WalkInBooking";
import EnquiryManagement from "../pages/receptionist/EnquiryManagement";
import ExtensionRequests from "../pages/receptionist/ExtensionRequests";
import CheckInOut from "../pages/receptionist/CheckInOut";
import MaintenanceLogLive from "../pages/receptionist/MaintenanceLogLive";
import CustomerHistory from "../pages/receptionist/CustomerHistory";
import ReservedRooms from "../pages/receptionist/ReservedRooms";
import ReceptionNotifications from "../pages/receptionist/Notifications";
import AdminLayout from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/Dashboard";
import ManageRooms from "../pages/admin/ManageRooms";
import ManageStaff from "../pages/admin/ManageStaff";
import AllBookings from "../pages/admin/AllBookings";
import Reports from "../pages/admin/Reports";
import InventoryLive from "../pages/admin/InventoryLive";
import MaintenanceAdminLive from "../pages/admin/MaintenanceAdminLive";
import FeedbackAdmin from "../pages/admin/FeedbackAdmin";
import Enquiries from "../pages/admin/Enquiries";
import Customers from "../pages/admin/Customers";
import SettingsLive from "../pages/admin/SettingsLive";
import SeasonalPricing from "../pages/admin/SeasonalPricing";
import AdminOffers from "../pages/admin/Offers";
import AdminNotifications from "../pages/admin/Notifications";
import WorkerLayout from "../pages/worker/WorkerLayout";
import MyTasks from "../pages/worker/MyTasks";
import ReportIssue from "../pages/worker/ReportIssue";
import MySchedule from "../pages/worker/MySchedule";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/book/:roomId" element={<BookingFlow />} />
        <Route path="/booking/confirmed/:bookingRef" element={<BookingConfirmPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={["customer"]} />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<CustomerHome />} />
            <Route path="my-bookings" element={<MyBookings />} />
            <Route path="my-bookings/:id" element={<BookingDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="my-rooms" element={<MyRooms />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="enquiry" element={<Enquiry />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["receptionist", "manager"]} />}>
          <Route path="/receptionist" element={<ReceptionistLayout />}>
            <Route index element={<ReceptionistDashboard />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="reserved-rooms" element={<ReservedRooms />} />
            <Route path="room-grid" element={<RoomGrid />} />
            <Route path="notifications" element={<ReceptionNotifications />} />
            <Route path="bill-generator" element={<BillGenerator />} />
            <Route path="walk-in" element={<WalkInBooking />} />
            <Route path="enquiries" element={<EnquiryManagement />} />
            <Route path="extensions" element={<ExtensionRequests />} />
            <Route path="check-in-out" element={<CheckInOut />} />
            <Route path="maintenance" element={<MaintenanceLogLive />} />
            <Route path="customer-history" element={<CustomerHistory />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="rooms" element={<ManageRooms />} />
            <Route path="staff" element={<ManageStaff />} />
            <Route path="bookings" element={<AllBookings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="inventory" element={<InventoryLive />} />
            <Route path="maintenance" element={<MaintenanceAdminLive />} />
            <Route path="feedback" element={<FeedbackAdmin />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<SettingsLive />} />
            <Route path="seasonal-pricing" element={<SeasonalPricing />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="notifications" element={<AdminNotifications />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["housekeeping", "kitchen", "server"]} />}>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route index element={<MyTasks />} />
            <Route path="report-issue" element={<ReportIssue />} />
            <Route path="schedule" element={<MySchedule />} />
          </Route>
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
