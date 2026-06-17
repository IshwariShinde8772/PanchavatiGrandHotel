import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { authAPI } from "../../api/authAPI";

function redirectPathForRole(role) {
  if (role === "admin") return "/admin";
  if (["reception", "receptionist", "manager"].includes(role)) return "/receptionist";
  if (["housekeeping", "kitchen", "server"].includes(role)) return "/worker";
  return "/customer";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleCallback = async () => {
      const provider = searchParams.get("provider");
      const error = searchParams.get("error");

      if (error) {
        if (error === "google_not_configured") {
          toast.error("Google login is not configured. Please contact support or use email/password login.");
        } else {
          toast.error(`Authentication failed: ${error}`);
        }
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await authAPI.oauthExchange();
        const payload = response?.data ?? response;

        if (!payload?.token || !payload?.user) {
          throw new Error("Missing auth payload");
        }

        setAuth({ token: payload.token, user: payload.user });
        toast.success(`Successfully signed in with ${provider || "Google"}`);
        navigate(redirectPathForRole(payload.user.role), { replace: true });
      } catch (exchangeError) {
        toast.error(exchangeError?.response?.data?.error || "Authentication failed");
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
