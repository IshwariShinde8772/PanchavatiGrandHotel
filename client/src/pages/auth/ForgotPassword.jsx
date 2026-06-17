import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../../api/authAPI";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Enter your email address");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      toast.error("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setSubmitted(false);

    try {
      const response = await authAPI.forgotPassword({
        email: trimmedEmail,
      });

      setSubmitted(true);
      toast.success(response?.message || "Password reset link sent to your email.");
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
            Enter your email and we will send a reset link.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        {submitted ? (
          <div
            className="mt-6 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "#D1E7DD", backgroundColor: "#F3FBF6", color: "#0A4D34" }}
          >
            Password reset link sent to your email.
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
