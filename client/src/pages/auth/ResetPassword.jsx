import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../../api/authAPI";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";
import { useTranslation } from "react-i18next";

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error(t("ops.resetTokenMissing"));
      return;
    }

    if (!strongPasswordPattern.test(form.newPassword)) {
      toast.error(t("auth.passwordRule"));
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      await authAPI.resetPassword({
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toast.success(t("shared.actionCompleted"));
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(t("shared.actionFailed"));
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
            {t("auth.resetPassword")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#526359" }}>
            {t("auth.resetDescription")}
          </p>
        </div>

        {!token ? (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "#FECACA", backgroundColor: "#FEF2F2", color: "#B91C1C" }}
          >
            {t("ops.resetTokenMissing")}
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <InputField
              label={t("auth.newPassword")}
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              required
            />
            <p className="text-xs" style={{ color: "#526359" }}>
              {t("auth.passwordRule")}
            </p>

            <InputField
              label={t("auth.confirmPassword")}
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              required
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("shared.processing") : t("auth.updatePassword")}
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-sm" style={{ color: "#526359" }}>
          {t("ops.returnTo")}{" "}
          <Link to="/login" className="font-bold hover:underline" style={{ color: "#0A4D34" }}>
            {t("common.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
