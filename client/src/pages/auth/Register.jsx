import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import { authAPI } from "../../api/authAPI";
import { useAuthStore } from "../../store/authStore";

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validation
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error("Email or phone is required");
      return;
    }
    if (form.email && form.password.length < 8) {
      toast.error("Password must be at least 8 characters when using email");
      return;
    }
    
    try {
      const response = await authAPI.registerCustomer(form);
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
        <p className="text-xs text-mutedText">Password must be at least 8 characters if using email registration.</p>
        <Button className="w-full" type="submit">Create Account</Button>
        <p className="text-sm text-mutedText">Already have an account? <Link className="text-godavari" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
