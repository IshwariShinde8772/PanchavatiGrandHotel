import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../../api/authAPI";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";
import { useTranslation } from "react-i18next";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error(`${t("auth.emailAddress")} ${t("shared.required")}`);
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      toast.error(t("apiErrors.generic"));
      return;
    }

    setIsSubmitting(true);
    setSubmitted(false);

    try {
      const response = await authAPI.forgotPassword({
        email: trimmedEmail,
      });

      setSubmitted(true);
      toast.success(t("auth.resetLinkSent"));
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
            {t("auth.forgotTitle")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#526359" }}>
            {t("auth.forgotDescription")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <InputField
            label={t("auth.emailAddress")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("common.submitting") : t("auth.sendResetLink")}
          </Button>
        </form>

        {submitted ? (
          <div
            className="mt-6 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "#D1E7DD", backgroundColor: "#F3FBF6", color: "#0A4D34" }}
          >
            {t("auth.resetLinkSent")}
          </div>
        ) : null}

        <p className="mt-8 text-center text-sm" style={{ color: "#526359" }}>
          {t("auth.rememberedPassword")}{" "}
          <Link to="/login" className="font-bold hover:underline" style={{ color: "#0A4D34" }}>
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
