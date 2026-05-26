import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import InputField from "../../components/forms/InputField";
import OTPInput from "../../components/auth/OTPInput";
import SocialLoginButtons from "../../components/auth/SocialLoginButtons";
import { authAPI } from "../../api/authAPI";
import { useLoginMutation } from "../../hooks/useAuth";
import { roomAPI } from "../../api/roomAPI";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../utils/phone";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("email");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
    otp: "",
  });

  const login = useLoginMutation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      toast.error("Your session expired. Please login again.");
    }
  }, [searchParams]);

  const sendOtp = async () => {
    const normalizedPhone = normalizePhoneNumber(form.phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast.error("Enter a valid phone number");
      return;
    }

    setOtpSending(true);
    try {
      await authAPI.sendOtp({ phone: normalizedPhone });
      setForm((prev) => ({ ...prev, phone: normalizedPhone, otp: "" }));
      setOtpSent(true);
      toast.success("OTP sent to your phone");
    } catch (error) {
      const validationErrors = error?.response?.data?.details?.fieldErrors?.phone;
      toast.error(validationErrors?.[0] || error?.response?.data?.error || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(form.phone);

    if (mode === "phone") {
      if (!isValidPhoneNumber(normalizedPhone)) {
        toast.error("Enter a valid phone number");
        return;
      }

      if (!form.otp.trim()) {
        toast.error("Enter the OTP");
        return;
      }
    }

    try {
      const response = await login.mutateAsync(
        mode === "email"
          ? { email: form.email, password: form.password }
          : { phone: normalizedPhone, otp: form.otp.trim() }
      );

      // Check if there's a pending room to save
      const pendingRoomId = sessionStorage.getItem('pendingSaveRoom');
      if (pendingRoomId) {
        try {
          await roomAPI.saveRoom(parseInt(pendingRoomId));
          sessionStorage.removeItem('pendingSaveRoom');
          toast.success("Room added to your wishlist!");
        } catch (saveError) {
          console.error("Failed to save pending room:", saveError);
          // Don't show error for this, just log it
        }
      }

      const loggedInRole = response?.data?.user?.role || response?.user?.role || "customer";

      const redirectFromQuery = searchParams.get("redirectTo");
      let from = location.state?.redirectTo || location.state?.from?.pathname || redirectFromQuery;
      if (!from || from === "/login") {
        if (loggedInRole === "admin") from = "/admin";
        else if (["receptionist", "manager"].includes(loggedInRole)) from = "/receptionist";
        else if (["housekeeping", "kitchen", "server"].includes(loggedInRole)) from = "/worker";
        else from = "/";
      }
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Login failed. Please check your credentials.";
      toast.error(message);
    }
  };

  return (
    <div
      className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#F9FAF9" }}
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-gray-100 bg-white p-8 shadow-lg md:p-12">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold" style={{ color: "#0A4D34" }}>
            Welcome Back
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#526359" }}>
            Use your saved customer, admin, receptionist, or worker account credentials.
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl p-1" style={{ backgroundColor: "#F0F5F2" }}>
          {["email", "phone"].map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => {
                setMode(nextMode);
                setOtpSent(false);
                setOtpSending(false);
                setForm((prev) => ({ ...prev, otp: "" }));
              }}
              className="flex-1 rounded-lg py-2 text-sm font-bold capitalize transition-all"
              style={{
                backgroundColor: mode === nextMode ? "#ffffff" : "transparent",
                color: mode === nextMode ? "#0A4D34" : "#526359",
                boxShadow: mode === nextMode ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {nextMode}
            </button>
          ))}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === "email" ? (
            <>
              <InputField
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <InputField
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: "#0A4D34" }}>
                  Forgot Password?
                </Link>
              </div>
            </>
          ) : (
            <>
              <InputField
                label="Phone Number"
                type="tel"
                value={form.phone}
                onChange={(event) => {
                  const nextPhone = event.target.value;
                  setForm((prev) => ({ ...prev, phone: nextPhone, otp: "" }));
                  if (otpSent) {
                    setOtpSent(false);
                  }
                }}
                placeholder="9876543210 or +919876543210"
                required
              />
              {!otpSent ? (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpSending}
                  className="w-full rounded-lg py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#0A4D34", color: "#ffffff" }}
                >
                  {otpSending ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <>
                  <OTPInput
                    value={form.otp}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                  />
                  <p className="text-xs" style={{ color: "#526359" }}>
                    Enter the 6-digit OTP sent to your phone.
                  </p>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-60"
                  >
                    {otpSending ? "Resending..." : "Resend OTP"}
                  </button>
                </>
              )}
            </>
          )}

          {(mode === "email" || (mode === "phone" && otpSent)) && (
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full rounded-lg py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#0A4D34", color: "#ffffff" }}
            >
              {login.isPending ? "Signing in..." : "Sign In"}
            </button>
          )}
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center">
            <span
              className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#526359" }}
            >
              Or continue with
            </span>
          </div>
        </div>

        <SocialLoginButtons />

        <p className="mt-8 text-center text-sm" style={{ color: "#526359" }}>
          Don't have an account?{" "}
          <Link to="/register" className="font-bold hover:underline" style={{ color: "#0A4D34" }}>
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
