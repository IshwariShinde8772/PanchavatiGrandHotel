import { useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import OTPInput from "../../components/auth/OTPInput";

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: "", otp: "", password: "" });

  const sendOtp = async () => {
    toast.success("Demo OTP sent to registered email");
  };

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Reset Access" title="Recover your guest account" description="Reset your password with a short verification flow." />
      <div className="mx-auto mt-8 max-w-xl section-card p-6 space-y-4">
        <InputField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Button variant="outline" onClick={sendOtp}>Send OTP</Button>
        <OTPInput value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value })} />
        <InputField label="New Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <Button>Reset Password</Button>
      </div>
    </div>
  );
}

