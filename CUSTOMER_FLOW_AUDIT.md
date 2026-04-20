# 🐛 Customer Authentication & Booking Flow - Issues & Fixes

## Current Issues

### Issue 1: No Account Creation via OTP

- Flow: `sendOtpCode()` creates/updates customer with "Guest" name
- Problem: This is for LOGIN, not SIGNUP - no dedicated signup endpoint
- Result: New customers can't create accounts with OTP path

### Issue 2: Register Endpoint Always Requires Email

- Register page requires: full_name + email + phone + password
- Problem: User might want to register with ONLY phone (India-first approach)
- Result: Email field validation fails for phone-only registration

### Issue 3: No Login Modal Integration

- When user clicks "Book Now" without auth, they navigate to `/login`
- Problem: After login, they don't resume booking flow
- Result: User loses: selected dates, room choice, guest info

### Issue 4: Dual Auth Flows Confusing

- Login page has two modes: "email" (email+password) vs "phone" (phone+OTP)
- Problem: Register page only has email+password path
- Result: Inconsistent UX between login and register

### Issue 5: Booking Resume State Lost

- `bookingStore` stores selection, but booking context lost on redirect
- Problem: Navigation to `/login` doesn't preserve booking session
- Result: User has to restart booking from scratch

## Solution Plan

### Phase 1: OTP Signup (✅ New Endpoint)

```
POST /api/auth/sign-up-otp
Body: { phone, full_name }
→ Creates account + sends OTP
→ Returns transient token or session
```

### Phase 2: Enhanced Register Flow

```
PUT /api/auth/customer/register
Accept either:
Option A: email + password (existing)
Option B: phone + OTP (new)
```

### Phase 3: Booking Resume Logic

```
Store in sessionStorage/localStorage:
- bookingRoom: { roomId, selectedDates, guests }
- bookingRedirectTo: "/book/{roomId}"

After login → check for booking resume → redirect accordingly
```

### Phase 4: Modal-Based Auth

```
Instead of full page redirect to /login
Show modal: "Login to Continue Booking"
After success → close modal, resume booking flow
```

## Files to Modify

### Backend

1. `server/src/controllers/auth/customerAuth.js` - Add OTP signup
2. `server/src/routes/public.js` - Add OTP signup route
3. `server/src/validators/authValidator.js` - Add OTP signup validation

### Frontend

1. `client/src/pages/auth/Login.jsx` - Add booking resume logic
2. `client/src/pages/booking/BookingFlow.jsx` - Preserve booking state before redirect
3. `client/src/store/authStore.js` - Add booking session storage
4. `client/src/components/auth/LoginModal.jsx` - New modal component
5. `client/src/pages/auth/Register.jsx` - Add OTP signup path

## Testing Checklist

Phase 1: Discovery

- [ ] Lands on home page
- [ ] Sees hotel hero banner
- [ ] Searches for rooms or clicks "View Room"
- [ ] Browses room listing with filters

Phase 2: Authentication - OTP Path (NEW)

- [ ] Clicks "Book Now" on room detail
- [ ] Not logged in → sees "Login to Book" modal
- [ ] Enters phone number → gets OTP
- [ ] Enters OTP → creates account
- [ ] Redirected → resumes booking at Step 1

Phase 2: Authentication - Email Path (EXISTING)

- [ ] Clicks "Register" link
- [ ] Fills email + phone + password + name
- [ ] Account created → dashboard

Phase 3: Booking Flow - All 4 Steps

- [ ] Step 1: Confirms dates, guests, requests
- [ ] Step 2: Guest info (pre-filled from profile)
- [ ] Step 3: ID verification (nationality + ID type + ID number)
- [ ] Step 4: Payment (Razorpay widget or Pay at Hotel)

Phase 4: Post-Booking

- [ ] Confirmation page with QR + booking ref
- [ ] Email sent automatically
- [ ] "My Trips" shows booking card
- [ ] Can cancel/view details
