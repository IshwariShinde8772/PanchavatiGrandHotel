# API & Integration Reference Guide

## 🔗 API Endpoints Summary

### Authentication

```
POST   /auth/send-otp              - Request OTP
POST   /auth/verify-otp            - Verify OTP & Login
POST   /auth/login                 - Login with credentials
POST   /auth/customer/register     - Register customer
```

---

## 👤 Customer APIs

### Profile Management

```
GET    /customer/me                - Get logged-in customer profile
PUT    /customer/profile           - Update profile details
```

**Update Profile Request:**

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "nationality": "India",
  "id_type": "passport",
  "id_number": "A12345678",
  "id_expiry": "2030-12-31"
}
```

### Bookings

```
GET    /customer/bookings          - List all customer bookings
GET    /customer/bookings/:id      - Get booking details
POST   /customer/bookings          - Create new booking
POST   /customer/bookings/verify-payment - Verify Razorpay payment
POST   /customer/bookings/:id/cancel - Cancel booking
```

**Create Booking Request:**

```json
{
  "room_id": 5,
  "check_in": "2026-05-15",
  "check_out": "2026-05-18",
  "guests": 2,
  "special_requests": "High floor preferred",
  "payment_method": "qr",
  "guest": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "nationality": "India",
    "id_type": "passport",
    "id_number": "A12345678",
    "id_expiry": "2030-12-31"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "booking_ref": "BKG-20260419-042",
    "customer_id": 1,
    "room_id": 5,
    "check_in": "2026-05-15",
    "check_out": "2026-05-18",
    "nights": 3,
    "guests": 2,
    "total_amount": 15000,
    "payment_status": "pending",
    "status": "pending",
    "payment_transaction": {
      "id": 89,
      "qr_image_url": "https://api.qrserver.com/...",
      "qr_expires_at": "2026-04-19T16:45:00Z",
      "seconds_remaining": 900
    }
  }
}
```

### Transactions & Payments

```
GET    /customer/transactions      - List payment transactions
POST   /customer/transactions/:id/confirm - Confirm QR payment
POST   /customer/transactions/:id/regenerate-qr - Get new QR
```

**Transaction Object:**

```json
{
  "id": 89,
  "booking_id": 42,
  "booking_ref": "BKG-20260419-042",
  "amount": 15000,
  "currency": "INR",
  "status": "pending",
  "qr_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=...",
  "qr_expires_at": "2026-04-19T16:45:00Z",
  "seconds_remaining": 892,
  "is_expired": false,
  "payment_method": "qr",
  "upi_id": "panchavatgrand@okaxis"
}
```

### Feedback

```
POST   /customer/feedbacks         - Submit feedback for completed booking
```

**Submit Feedback Request:**

```json
{
  "booking_id": 42,
  "rating": 5,
  "title": "Excellent Stay",
  "comment": "Great hospitality and clean rooms",
  "room_category": "Deluxe"
}
```

### Notifications

```
GET    /customer/notifications     - Get all notifications
PATCH  /customer/notifications/read-all - Mark all as read
```

**Notification Object:**

```json
{
  "id": 1,
  "target_role": "customer",
  "target_id": 1,
  "title": "Booking Confirmed",
  "message": "Your booking BKG-20260419-042 is confirmed",
  "type": "booking",
  "is_read": false,
  "created_at": "2026-04-19T14:30:00Z"
}
```

### Saved Rooms

```
GET    /customer/saved-rooms       - Get wishlist rooms
POST   /customer/saved-rooms       - Add room to wishlist
DELETE /customer/saved-rooms/:roomId - Remove from wishlist
```

### Bills

```
GET    /customer/bills/:bookingId   - Get bill HTML
GET    /customer/bills/:bookingId/download - Download bill PDF
```

---

## 🔍 Enquiries

```
POST   /enquiries                  - Submit enquiry (no auth needed)
GET    /admin/enquiries            - List all enquiries (admin only)
PATCH  /admin/enquiries/:id/respond - Respond to enquiry (admin)
```

**Enquiry Submission:**

```json
{
  "full_name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "check_in": "2026-06-01",
  "check_out": "2026-06-05",
  "adults": 2,
  "room_category": "Deluxe",
  "message": "Do you have availability for 4 adults with 2 kids?"
}
```

**Admin Response:**

```json
{
  "response_text": "Yes, we have Deluxe rooms available. We also have family suites..."
}
```

---

## 👨‍💼 Receptionist APIs

### Bookings

```
GET    /receptionist/bookings      - List bookings with filters
POST   /receptionist/bookings/:id/check-in  - Check-in guest
POST   /receptionist/bookings/:id/check-out - Check-out guest
POST   /receptionist/walk-in-bookings       - Create walk-in booking
```

**Check-in Request:**

```json
{
  "id_verified": true,
  "payment_method": "qr",
  "payment_status": "paid",
  "actual_checkin_time": "2026-05-15T14:30:00Z"
}
```

### Enquiries

```
GET    /receptionist/enquiries     - List enquiries
PATCH  /receptionist/enquiries/:id/respond - Respond to enquiry
```

---

## 👨‍💻 Admin APIs

### Customers

```
GET    /admin/customers            - List all customers with stats
GET    /admin/customers/:id        - Get customer detail + bookings
PATCH  /admin/customers/:id/toggle-delete - Soft delete/restore
```

**Customer with Stats:**

```json
{
  "id": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "nationality": "India",
  "id_type": "passport",
  "id_number": "A12345678",
  "total_bookings": 3,
  "total_spent": 45000,
  "created_at": "2026-01-15T10:00:00Z",
  "bookings": [
    {
      "id": 42,
      "booking_ref": "BKG-20260419-042",
      "check_in": "2026-05-15",
      "check_out": "2026-05-18",
      "status": "confirmed",
      "total_amount": 15000
    }
  ]
}
```

### Bookings

```
GET    /admin/bookings             - List all bookings
PUT    /admin/bookings/:id         - Update booking
DELETE /admin/bookings/:id         - Delete booking
```

### Feedback

```
GET    /admin/feedbacks            - List feedback submissions
PATCH  /admin/feedbacks/:id        - Publish/reject feedback
DELETE /admin/feedbacks/:id        - Delete feedback
```

**Moderate Feedback:**

```json
{
  "status": "published" // or "rejected"
}
```

### Enquiries

```
GET    /admin/enquiries            - List all enquiries
PATCH  /admin/enquiries/:id/respond - Respond to enquiry
DELETE /admin/enquiries/:id        - Delete enquiry
```

### Rooms

```
GET    /admin/rooms                - List all rooms
POST   /admin/rooms                - Create room
PUT    /admin/rooms/:id            - Update room
DELETE /admin/rooms/:id            - Delete room
```

### Staff

```
GET    /admin/staff                - List staff
POST   /admin/staff                - Create staff member
PUT    /admin/staff/:id            - Update staff
DELETE /admin/staff/:id            - Delete staff
```

### Dashboard

```
GET    /admin/dashboard            - Dashboard statistics
```

### Notifications

```
GET    /admin/notifications        - List notifications
POST   /admin/notifications        - Send notification
```

---

## 🔐 Authentication Headers

All authenticated endpoints require:

```
Authorization: Bearer {JWT_TOKEN}
```

### Token Structure

```json
{
  "id": 1,
  "role": "customer",
  "phone": "+919876543210",
  "name": "John Doe"
}
```

---

## ⏱️ QR Payment Timer Implementation

### Frontend React Component

```jsx
const [now, setNow] = useState(Date.now());

useEffect(() => {
  const timer = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(timer);
}, []);

const secondsRemaining = useMemo(() => {
  const expiry = new Date(transaction.qr_expires_at).getTime();
  return Math.max(Math.floor((expiry - now) / 1000), 0);
}, [now, transaction.qr_expires_at]);

const minutes = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
const seconds = String(secondsRemaining % 60).padStart(2, "0");

return (
  <p>
    Time Remaining: {minutes}:{seconds}
  </p>
);
```

### Backend QR Generation

```javascript
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

const qrPayload = `upi://pay?pa=${upiId}&pn=Hotel&am=${amount}&tn=Booking${bookingRef}`;
const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`;
```

---

## 💾 Database Relationships

```
Customer (1) ---- (*) Booking
        |
        +---- (*) Feedback
        |
        +---- (*) PaymentTransaction
        |
        +---- (*) Notification
        |
        +---- (*) SavedRoom

Booking (1) ---- (1) Room
        |
        +---- (1) PaymentTransaction
        |
        +---- (*) Bill

Staff (1) ---- (*) Task
       |
       +---- (*) MaintenanceLog
```

---

## 🚨 Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Common HTTP Status Codes

- `200` OK - Request successful
- `201` Created - Resource created successfully
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `409` Conflict - Resource already exists
- `500` Server Error - Internal server error

---

## 📊 Pagination

For list endpoints returning many records:

```
GET /resource?page=1&limit=10&sort=name&order=asc
```

**Response:**

```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

---

## 🔄 Common Workflows

### Booking Flow

1. POST `/customer/bookings` → Get booking_ref + payment_transaction
2. GET `/customer/transactions` → Display QR with timer
3. Customer scans QR and pays
4. POST `/customer/transactions/:id/confirm` → Mark paid
5. Booking status changes to "confirmed"

### Admin Approval Flow

1. GET `/admin/customers` → View guests
2. GET `/admin/customers/:id` → View details & bookings
3. GET `/admin/enquiries` → See requests
4. PATCH `/admin/enquiries/:id/respond` → Send response

### Receptionist Check-in Flow

1. GET `/receptionist/bookings` → Find guest
2. Verify ID and payment
3. POST `/receptionist/bookings/:id/check-in` → Check-in
4. Booking status changes to "checked_in"

---

**API Version**: 1.0  
**Last Updated**: April 2026
