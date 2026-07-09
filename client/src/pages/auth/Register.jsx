import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import { authAPI } from "../../api/authAPI";
import { useAuthStore } from "../../store/authStore";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../utils/phone";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const fullName = form.full_name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = normalizePhoneNumber(form.phone);
    const password = form.password.trim();
    const confirmPassword = form.confirm_password.trim();

    if (!fullName) {
      toast.error(`${t("shared.fullName")} ${t("shared.required")}`);
      return;
    }

    if (!email && !phone) {
      toast.error(`${t("auth.emailOrPhone")} ${t("shared.required")}`);
      return;
    }

    if (form.phone.trim() && !isValidPhoneNumber(phone)) {
      toast.error(t("auth.validPhone"));
      return;
    }

    if (email && !password) {
      toast.error(`${t("auth.password")} ${t("shared.required")}`);
      return;
    }

    if (password && password.length < 8) {
      toast.error(t("auth.passwordRule"));
      return;
    }

    if ((email || password) && !confirmPassword) {
      toast.error(`${t("auth.confirmPassword")} ${t("shared.required")}`);
      return;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    
    try {
      const payload = {
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        password: password || undefined,
      };

      const response = await authAPI.registerCustomer(payload);
      if (response?.data?.token && response?.data?.user) {
        setAuth({ token: response.data.token, user: response.data.user });
      }
      toast.success(t("auth.accountCreated"));
      navigate("/customer");
    } catch (error) {
      toast.error(t("shared.actionFailed"));
    }
  };

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow={t("auth.createAccount")} title={t("auth.registerTitle")} description={t("auth.registerSubtitle")} />
      <form className="mx-auto mt-8 max-w-2xl section-card p-6 space-y-4" onSubmit={handleSubmit}>
        <InputField label={t("shared.fullName")} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
        <InputField label={t("shared.email")} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <InputField label={`${t("shared.phone")} (${t("shared.optional")})`} placeholder="+919876543210" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <InputField label={t("auth.password")} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <InputField label={t("auth.confirmPassword")} type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} />
        <p className="text-xs text-mutedText">{t("auth.passwordRule")}</p>
        <Button className="w-full" type="submit">{t("auth.createAccount")}</Button>
        <p className="text-sm text-mutedText">{t("auth.alreadyAccount")} <Link className="text-godavari" to="/login">{t("common.login")}</Link></p>
      </form>
    </div>
  );
}
