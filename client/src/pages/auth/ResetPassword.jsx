import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../../api/authAPI";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error("Reset token is missing");
      return;
    }

    if (!strongPasswordPattern.test(form.newPassword)) {
      toast.error("Password must be 8+ chars with uppercase, lowercase, and number");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await authAPI.resetPassword({
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toast.success("Password reset successful. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || "Reset link is invalid or expired");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#F9FAF9" }}
    >
      <div className="w-full max-w-[520px] rounded-2xl border border-gray-100 bg-white p-8 shadow-lg md:p-12">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold" style={{ color: "#0A4D34" }}>
            Reset Password
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#526359" }}>
            Set your new account password to continue.
          </p>
        </div>

        {!token ? (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "#FECACA", backgroundColor: "#FEF2F2", color: "#B91C1C" }}
          >
            This reset link is missing a token. Please request a new password reset.
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <InputField
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              required
            />
            <p className="text-xs" style={{ color: "#526359" }}>
              Use at least 8 characters with uppercase, lowercase, and a number.
            </p>

            <InputField
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              required
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-sm" style={{ color: "#526359" }}>
          Return to{" "}
          <Link to="/login" className="font-bold hover:underline" style={{ color: "#0A4D34" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
