import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function dashboardPath(role) {
  if (role === "admin") return "/admin";
  if (["reception", "receptionist", "manager"].includes(role)) return "/receptionist";
  if (["housekeeping", "kitchen", "server"].includes(role)) return "/worker";
  return "/customer";
}

export default function RoleRoute({ allowedRoles = [] }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  
  // Failsafe: if role is missing from cached local storage, assume customer
  const role = user.role || "customer";
  const normalizedRole = role === "reception" ? "receptionist" : role;

  if (!allowedRoles.includes(normalizedRole) && !allowedRoles.includes(role)) {
    return <Navigate to={dashboardPath(normalizedRole)} replace />;
  }
  return <Outlet />;
}
