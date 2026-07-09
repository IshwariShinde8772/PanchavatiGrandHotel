import { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleCallback = async () => {
      const provider = searchParams.get("provider");
      const error = searchParams.get("error");

      if (error) {
        if (error === "google_not_configured") {
          toast.error(t("auth.googleUnavailable"));
        } else {
          toast.error(t("shared.actionFailed"));
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
        toast.success(t("shared.actionCompleted"));
        navigate(redirectPathForRole(payload.user.role), { replace: true });
      } catch (exchangeError) {
        toast.error(t("shared.actionFailed"));
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth, t]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-gray-600">{t("auth.signingIn")}</p>
      </div>
    </div>
  );
}
