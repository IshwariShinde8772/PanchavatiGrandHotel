import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!isAuthenticated || !token) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
        replace
        state={{ redirectTo }}
      />
    );
  }

  return <Outlet />;
}

