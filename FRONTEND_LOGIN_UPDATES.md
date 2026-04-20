# Client-Side Login Page Updates

## File: client/src/pages/auth/Login.jsx

Add after the useLoginMutation hook:

```javascript
// Add these imports at the top
import { useLocation } from "react-router-dom";

// Inside the Login component, after const login = useLoginMutation();
const authStore = useAuthStore();
const bookingRedirectTo = useAuthStore((state) => state.bookingRedirectTo);
const bookingSession = useAuthStore((state) => state.bookingSession);
const clearBookingRedirect = useAuthStore(
  (state) => state.clearBookingRedirect,
);
```

Update the handleSubmit function to handle post-login redirect:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const derivedRole = getRoleFromEmail(form.email);
    // useLoginMutation's onSuccess already calls setAuth
    const response = await login.mutateAsync(
      mode === "email"
        ? { email: form.email, password: form.password, role: derivedRole }
        : { phone: form.phone, otp: form.otp, role: derivedRole },
    );

    const loggedInRole = response?.data?.user?.role || derivedRole;

    // Check if there's a booking to resume
    if (bookingRedirectTo && bookingSession) {
      // Restore booking state before navigating
      const { useBookingStore } = await import("../../store/bookingStore");
      const bookingStore = useBookingStore();
      bookingStore.setSelection(bookingSession.selection);
      bookingStore.setGuestInfo(bookingSession.guestInfo);

      clearBookingRedirect();
      navigate(bookingRedirectTo, { replace: true });
      toast.success("Login successful! Resuming your booking...");
      return;
    }

    let from = location.state?.redirectTo || location.state?.from?.pathname;
    if (!from || from === "/login") {
      if (loggedInRole === "admin") from = "/admin";
      else if (["receptionist", "manager"].includes(loggedInRole))
        from = "/receptionist";
      else if (["housekeeping", "kitchen", "server"].includes(loggedInRole))
        from = "/worker";
      else from = "/customer";
    }
    navigate(from, { replace: true });
    toast.success("Login successful!");
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      "Login failed. Please check your credentials.";
    toast.error(msg);
  }
};
```

---

## File: client/src/pages/auth/Register.jsx

Add a new OTP Signup mode. Update the component to support both email and phone signup:

```javascript
// Add state for signup mode
const [signupMode, setSignupMode] = useState("email"); // "email" or "otp"
const [otpSent, setOtpSent] = useState(false);
const [otp, setOtp] = useState("");

// Add OTP signup handler
const handleOtpSignup = async () => {
  if (!form.phone || !form.full_name) {
    toast.error("Please enter your name and phone number");
    return;
  }

  try {
    const response = await authAPI.sendOtp({
      phone: form.phone,
      full_name: form.full_name,
    });
    setOtpSent(true);
    toast.success("OTP sent to your phone");
  } catch (error) {
    toast.error(error?.response?.data?.error || "Failed to send OTP");
  }
};

// Add OTP verify handler
const handleOtpVerify = async () => {
  if (!otp) {
    toast.error("Please enter the OTP");
    return;
  }

  try {
    const response = await authAPI.verifyOtp({
      phone: form.phone,
      otp,
    });
    if (response?.data?.token && response?.data?.user) {
      setAuth({ token: response.data.token, user: response.data.user });
    }
    toast.success("Account created successfully via OTP");
    navigate("/customer");
  } catch (error) {
    toast.error(error?.response?.data?.error || "OTP verification failed");
  }
};

// Update JSX to show both modes
return (
  <div className="container-shell py-10">
    <PageHeader
      eyebrow="Register"
      title="Create your guest profile"
      description="Save rooms, manage trips, upload ID details, and use pay-later booking."
    />

    {/* Mode Selector */}
    <div className="mx-auto mt-8 max-w-2xl">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setSignupMode("email");
            setOtpSent(false);
          }}
          className={`px-6 py-3 rounded-xl font-bold ${
            signupMode === "email"
              ? "bg-godavari text-white"
              : "bg-gray-100 text-mutedText"
          }`}
        >
          Email + Password
        </button>
        <button
          onClick={() => {
            setSignupMode("otp");
            setOtpSent(false);
          }}
          className={`px-6 py-3 rounded-xl font-bold ${
            signupMode === "otp"
              ? "bg-godavari text-white"
              : "bg-gray-100 text-mutedText"
          }`}
        >
          Phone + OTP
        </button>
      </div>

      {signupMode === "email" ? (
        // Email signup form
        <form
          className="section-card p-6 space-y-4"
          onSubmit={handleEmailSubmit}
        >
          <InputField
            label="Full Name"
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
          />
          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <InputField
            label="Phone"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
          <InputField
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
          <Button className="w-full" type="submit">
            Create Account
          </Button>
          <p className="text-sm text-mutedText">
            Already have an account?{" "}
            <Link className="text-godavari" to="/login">
              Login
            </Link>
          </p>
        </form>
      ) : (
        // OTP signup form
        <div className="section-card p-6 space-y-4">
          {!otpSent ? (
            <>
              <InputField
                label="Full Name"
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
              />
              <InputField
                label="Phone (+91)"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <Button className="w-full" onClick={handleOtpSignup}>
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold mb-2">
                  Enter OTP sent to {form.phone}
                </p>
                <InputField
                  label="OTP"
                  placeholder="000000"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  maxLength="6"
                />
              </div>
              <Button className="w-full" onClick={handleOtpVerify}>
                Verify & Create Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
              >
                Resend OTP
              </Button>
            </>
          )}
          <p className="text-sm text-mutedText">
            Already have an account?{" "}
            <Link className="text-godavari" to="/login">
              Login
            </Link>
          </p>
        </div>
      )}
    </div>
  </div>
);
```

---

## API Updates Needed

### authAPI.js

Ensure these methods exist:

```javascript
export const authAPI = {
  sendOtp: (payload) =>
    axiosInstance.post("/auth/send-otp", payload).then((res) => res.data),
  verifyOtp: (payload) =>
    axiosInstance.post("/auth/verify-otp", payload).then((res) => res.data),
  loginCustomer: (payload) =>
    axiosInstance.post("/auth/customer/login", payload).then((res) => res.data),
  registerCustomer: (payload) =>
    axiosInstance
      .post("/auth/customer/register", payload)
      .then((res) => res.data),
  // ... other methods
};
```

The OTP methods are already in the API!
