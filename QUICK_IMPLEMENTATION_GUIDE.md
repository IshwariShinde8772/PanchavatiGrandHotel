# Quick Implementation Guide - Frontend Auth Updates

## Backend Status ✅

All backend changes complete. Logging enhanced for debugging.

- **API Ready**: Phone+OTP signup, email+password signup, booking resume
- **Logging Enhanced**: OTP verification now logs `✅ OTP verified for {phone}. Account: {name} (ID: {id})`
- **Database**: Supports both signup paths

---

## Priority 1: Update Register Page (2-3 hours)

### File: `client/src/pages/auth/Register.jsx`

**Current State**: Only email+password signup

**Required Changes**:

1. Add state for OTP mode
2. Add two signup tabs/modes
3. Implement OTP flow functions
4. Add conditional rendering

**Step-by-Step Implementation**:

```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import authAPI from "@/api/authAPI";

export default function Register() {
  // Signup mode: 'email' or 'phone'
  const [signupMode, setSignupMode] = useState("phone");

  // Shared state
  const [full_name, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Email+Password mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone+OTP mode
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const navigate = useNavigate();
  const { login } = useAuthStore();

  // ============ EMAIL + PASSWORD FLOW ============
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!full_name || !email || !password) {
      setError("All fields required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await authAPI.registerCustomer({
        full_name,
        email,
        password,
      });

      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
      console.error("Email signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============ PHONE + OTP FLOW ============
  const handleOtpSignup = async (e) => {
    e.preventDefault();
    if (!full_name || !phone) {
      setError("Name and phone required");
      return;
    }

    if (!/^\+91\d{10}$/.test(phone)) {
      setError("Enter valid phone: +91XXXXXXXXXX");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("Sending OTP to:", phone, "Name:", full_name);
      const response = await authAPI.sendOtpCode({
        phone,
        full_name,
      });

      if (response.data.success) {
        setOtpSent(true);
        console.log("✅ OTP sent successfully");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
      console.error("OTP signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Enter OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("Verifying OTP:", otp, "Phone:", phone);
      const response = await authAPI.verifyOtpCode({
        phone,
        otp,
      });

      if (response.data.success) {
        console.log("✅ OTP verified, logging in");
        login(response.data.data.token, response.data.data.user);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
      console.error("OTP verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============ JSX ============
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create Account
        </h2>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setSignupMode("phone");
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              signupMode === "phone"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📱 Phone + OTP
          </button>
          <button
            onClick={() => {
              setSignupMode("email");
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              signupMode === "email"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ✉️ Email + Password
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* PHONE + OTP MODE */}
        {signupMode === "phone" && (
          <form onSubmit={otpSent ? handleOtpVerify : handleOtpSignup}>
            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Raj Patel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={otpSent}
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={otpSent}
              />
            </div>

            {/* OTP Input (shown after OTP sent) */}
            {otpSent && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OTP (Check SMS)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Resend in 30s
                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="ml-2 text-blue-500 hover:underline"
                    >
                      Change phone
                    </button>
                  )}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 transition"
            >
              {loading
                ? "⏳ Loading..."
                : otpSent
                  ? "✅ Verify OTP"
                  : "📱 Send OTP"}
            </button>
          </form>
        )}

        {/* EMAIL + PASSWORD MODE */}
        {signupMode === "email" && (
          <form onSubmit={handleEmailSignup}>
            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Raj Patel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="raj@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 transition"
            >
              {loading ? "⏳ Creating Account..." : "✉️ Register with Email"}
            </button>
          </form>
        )}

        {/* Login Link */}
        <p className="text-center text-gray-600 text-sm mt-6">
          Already have account?{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

## Priority 2: Update Login Page (1-2 hours)

### File: `client/src/pages/auth/Login.jsx`

**Required Changes**:

1. Import booking store
2. Check for pending booking after login
3. Restore booking state before redirect
4. Navigate to booking page if resuming

**Key Code Addition**:

```javascript
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useBookingStore } from "@/store/bookingStore"; // Add this import
import authAPI from "@/api/authAPI";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, bookingRedirectTo, bookingSession, clearBookingRedirect } =
    useAuthStore();
  const bookingStore = useBookingStore();

  // ... other state ...

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await authAPI.loginCustomer({
        email,
        password,
      });

      if (response.data.success) {
        // Store token and user
        login(response.data.data.token, response.data.data.user);
        console.log("✅ Login successful:", response.data.data.user.full_name);

        // ============ BOOKING RESUME LOGIC ============
        if (bookingRedirectTo && bookingSession) {
          console.log("🔄 Resuming booking:", bookingRedirectTo);
          console.log("Restoring booking state:", bookingSession);

          // Restore booking store state
          if (bookingSession.selection) {
            bookingStore.setSelection(bookingSession.selection);
          }
          if (bookingSession.guestInfo) {
            bookingStore.setGuestInfo(bookingSession.guestInfo);
          }
          if (bookingSession.step) {
            bookingStore.setStep(bookingSession.step);
          }

          // Clear the redirect and navigate to booking page
          clearBookingRedirect();
          navigate(bookingRedirectTo, { state: { resumingBooking: true } });
        } else {
          // Normal login flow
          navigate("/dashboard");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };
}
```

---

## Testing Checklist

### Test 1: Phone + OTP Registration

```
1. Go to /register → Select "Phone + OTP" tab
2. Enter name, phone
3. Click "Send OTP"
4. ✅ Server logs: "📱 OTP sent to +919876543210. OTP: 123456"
5. Check SMS (or server logs for dev)
6. Enter OTP
7. ✅ Server logs: "✅ OTP verified for +919876543210. Account: Raj Patel (ID: X)"
8. ✅ Redirects to /dashboard
9. ✅ Check customer record in DB: otp_verified = 1
```

### Test 2: Email + Password Registration

```
1. Go to /register → Select "Email + Password" tab
2. Enter name, email, password
3. Click "Register with Email"
4. ✅ Redirects to /dashboard
5. ✅ Check customer record in DB
6. ✅ Email sent to registered email
```

### Test 3: Booking Resume After Login

```
1. Go to room detail → Click "Book Now" (not logged in)
2. ✅ Redirects to /login
3. ✅ Server logs: "bookingRedirectTo set: /book/3"
4. Login with email/password or OTP
5. ✅ After login: Redirects to /book/3 (not /dashboard)
6. ✅ Server logs: "✅ OTP verified", "🔄 Resuming booking: /book/3"
7. ✅ Client logs: "Restoring booking state"
8. ✅ Booking form shows previously selected dates and guest info
9. Complete booking from step 2 (or wherever saved)
```

### Debug Logging Output (Expected)

```
📱 OTP Flow:
  → 📱 OTP sent to +919876543210. OTP: 123456
  → ✅ OTP verified for +919876543210. Account: Raj Patel (ID: 5)

🔄 Booking Resume:
  → bookingRedirectTo set: /book/3
  → Auth login successful: Raj Patel
  → 🔄 Resuming booking: /book/3
  → Restoring booking state: {roomId: 3, selection: {...}, ...}
  → Navigation to /book/3 with booking state restored
```

---

## Common Issues & Fixes

### Issue 1: "OTP not found" error

- **Cause**: `sendOtpCode` not called first, or OTP expired (>10 min)
- **Fix**: Always call send OTP before verify. Adjust timeout in backend if needed

### Issue 2: Login works but redirect to dashboard instead of booking

- **Cause**: `bookingRedirectTo` not set (booking flow not called) OR not imported in Login.jsx
- **Fix**: Verify BookingFlow calls `setBookingRedirect()` before redirect. Check store imports

### Issue 3: Booking state restored but empty

- **Cause**: `bookingSession` has undefined values
- **Fix**: Ensure BookingFlow stores complete state: `{ roomId, selection, guestInfo, step }`

### Issue 4: SMS not received for OTP

- **Cause**: FAST2SMS_API_KEY wrong or invalid phone
- **Fix**: Check .env file. Test phone format: +91XXXXXXXXXX

### Issue 5: Image upload working but images not displaying

- **Cause**: Path encoding issues (already fixed in server)
- **Fix**: Verify `/uploads` route has CORS headers

---

## Files Ready to Deploy

### Backend ✅ (Complete)

- `server/src/controllers/auth/customerAuth.js` - Updated with logging
- `server/src/validators/authValidator.js` - Updated with flexible validation
- `server/src/app.js` - CORS configured
- `server/src/routes/upload.js` - Multer configured
- `server/src/controllers/upload/uploadController.js` - Logging enhanced

### Frontend ⚙️ (Needs Implementation from steps above)

- `client/src/pages/auth/Register.jsx` - Add OTP mode
- `client/src/pages/auth/Login.jsx` - Add booking resume logic
- `client/src/store/authStore.js` - Already updated ✅
- `client/src/store/bookingStore.js` - Ensure setSelection, setGuestInfo, setStep methods exist
- `client/src/pages/booking/BookingFlow.jsx` - Already updated ✅

---

## Environment Variables Required

```env
# Server
FAST2SMS_API_KEY=your_key_here
SMTP_PASS=your_16_char_app_password  # Gmail App Password (from GMAIL_SETUP_GUIDE.md)
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=hotel_db

# Client (Already exported from server)
VITE_API_URL=http://localhost:5000
```

---

## Expected Timeline

| Task                     | Time     | Status              |
| ------------------------ | -------- | ------------------- |
| Register OTP Mode UI     | 1.5h     | Now: Start here ↓   |
| Login Booking Resume     | 0.5h     | After Register done |
| Manual Testing (3 flows) | 1h       | After UI complete   |
| Fix any issues           | 0.5h     | As needed           |
| **Total**                | **3.5h** |                     |

---

## Next Immediate Action ⚡

1. Copy the Register component code above
2. Replace in `client/src/pages/auth/Register.jsx`
3. Test the OTP flow
4. Run tests from Testing Checklist

Good luck! Backend is ready. 🚀
