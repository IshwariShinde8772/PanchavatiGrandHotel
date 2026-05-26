import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../../api/authAPI";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";

const roleOptions = [
  { value: "", label: "Auto detect role" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
  { value: "receptionist", label: "Receptionist" },
  { value: "manager", label: "Manager" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "kitchen", label: "Kitchen" },
  { value: "server", label: "Server" },
];

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      toast.error("Enter your email or username");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authAPI.forgotPassword({
        identifier: trimmedIdentifier,
        role: role || undefined,
      });

      setSubmitted(true);
      toast.success(response?.message || "If an account exists, reset instructions have been sent.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to process request. Please try again.");
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
            Forgot Password
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#526359" }}>
            Enter your account details and we will send reset instructions.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <InputField
            label="Email or Username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className="block">
            <span
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#526359" }}
            >
              Role (Optional)
            </span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full py-3 outline-none transition-all border-b-2 bg-transparent text-sm"
              style={{ borderColor: "#E5EBE7", color: "#0D1B15" }}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {submitted ? (
          <div
            className="mt-6 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "#D1E7DD", backgroundColor: "#F3FBF6", color: "#0A4D34" }}
          >
            If an account exists, reset instructions have been sent.
          </div>
        ) : null}

        <p className="mt-8 text-center text-sm" style={{ color: "#526359" }}>
          Remembered your password?{" "}
          <Link to="/login" className="font-bold hover:underline" style={{ color: "#0A4D34" }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
