import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import { authAPI } from "../../api/authAPI";
import { useAuthStore } from "../../store/authStore";
import { isValidPhoneNumber, normalizePhoneNumber } from "../../utils/phone";

export default function Register() {
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
      toast.error("Full name is required");
      return;
    }

    if (!email && !phone) {
      toast.error("Email or phone is required");
      return;
    }

    if (form.phone.trim() && !isValidPhoneNumber(phone)) {
      toast.error("Enter a valid phone number");
      return;
    }

    if (email && !password) {
      toast.error("Password is required when using email registration");
      return;
    }

    if (password && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if ((email || password) && !confirmPassword) {
      toast.error("Please confirm your password");
      return;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      toast.error("Password and confirm password do not match");
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
      toast.success("Account created successfully");
      navigate("/customer");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Register" title="Create your guest profile" description="Save rooms, manage trips, upload ID details, and use pay-later booking with a single guest account." />
      <form className="mx-auto mt-8 max-w-2xl section-card p-6 space-y-4" onSubmit={handleSubmit}>
        <InputField label="Full Name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
        <InputField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <InputField label="Phone (Optional)" placeholder="+919876543210" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <InputField label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <InputField label="Confirm Password" type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} />
        <p className="text-xs text-mutedText">Password must be at least 8 characters when using email registration.</p>
        <Button className="w-full" type="submit">Create Account</Button>
        <p className="text-sm text-mutedText">Already have an account? <Link className="text-godavari" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
