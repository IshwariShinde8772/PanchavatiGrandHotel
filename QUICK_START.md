# Quick Start Guide - Hotel Portal System

## 🚀 5-Minute Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repo-url>
cd hotel-main

# Install dependencies
npm install            # Root
npm --workspace client install
npm --workspace server install
```

### 2. Configure Environment

**Server (.env)**

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hotel_db
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# Email (optional, uses mock if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourhotel.com

# QR Payments
QR_EXPIRY_MINUTES=15
UPI_ID=yourhotel@bank

# Client URL
CLIENT_URL=http://localhost:5173

# Node
NODE_ENV=development
```

### 3. Setup Database

```bash
cd server

# Create database
mysql -u root -p
> CREATE DATABASE hotel_db;
> EXIT;

# Run migrations (if available)
npm run migrate

# Seed sample data
npm run seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Frontend
npm --workspace client run dev
# Opens http://localhost:5173

# Terminal 2 - Backend
npm --workspace server run dev
# Runs on http://localhost:3000
```

---

## 📋 Testing Key Features (5-10 min each)

### Test 1: Customer Profile & Booking

```
1. Open http://localhost:5173
2. Click "Login" → Select "Customer" → +919876543210
3. Enter any 4-digit OTP (dev mode)
4. Go to Profile → Update nationality
5. Go to Rooms → Choose a room → Book
6. Fill customer details → Payment: QR
7. Watch TIMER count down on Transactions page
```

### Test 2: Admin View Customer

```
1. Logout
2. Login as Admin (different number or admin login)
3. Go to Customers
4. See real list with bookings count
5. Click "View Details" → See full history
```

### Test 3: Receptionist Approve Payment

```
1. Login as Receptionist (+91...)
2. Go to Reserved Rooms
3. Find the booking just created
4. Click "View Details"
5. Click "Verify & Approve"
6. See payment status change to "Paid"
```

### Test 4: Feedback & Enquiry

```
1. As Customer, wait 5 seconds for booking to move to checked_out (dev)
2. Go to Feedback → Submit review
3. Go to Enquiry → Submit question
4. As Admin, see feedback & response to it
```

---

## 🐛 Common Quick Fixes

### "Cannot GET /customer/me"

- [ ] Backend running? `npm --workspace server run dev`
- [ ] Port 3000 free?
- [ ] JWT token valid?
- [ ] Check browser DevTools → Network tab

### Timer Not Showing on Transactions

- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Check transaction has `qr_expires_at`
- [ ] Open DevTools console for errors

### Login Stuck

- [ ] OTP: Use any 4 digits in dev mode
- [ ] Check browser console for error messages
- [ ] Verify backend running
- [ ] Try incognito/private window

### Email Not Sending

- [ ] Gmail? Enable "App Passwords"
- [ ] Missing SMTP config? Will use mock (ok for dev)
- [ ] Check server console for email logs

### Database Connection Error

- [ ] MySQL running? `mysql -u root`
- [ ] Correct credentials in .env?
- [ ] Database exists? `SHOW DATABASES;`
- [ ] User has permissions?

---

## 👥 Test Accounts

### Customer

```
Phone: +919876543210
OTP: Any 4 digits (dev mode)
Password: None (OTP based)
```

### Admin

```
Phone: +919123456789
Role: admin
Email: admin@hotel.com
OTP: Any 4 digits (dev mode)
```

### Receptionist

```
Phone: +919234567890
Role: receptionist
Email: reception@hotel.com
OTP: Any 4 digits (dev mode)
```

---

## 📱 Access URLs

| Page              | URL                                | Role           |
| ----------------- | ---------------------------------- | -------------- |
| Home              | http://localhost:5173              | Public         |
| Rooms             | http://localhost:5173/rooms        | Public         |
| Booking           | http://localhost:5173/book/1       | Any            |
| Customer Portal   | http://localhost:5173/customer     | Customer ✓     |
| Admin Dashboard   | http://localhost:5173/admin        | Admin ✓        |
| Receptionist Desk | http://localhost:5173/receptionist | Receptionist ✓ |

---

## 🔍 View Your Changes

### Customer Portal Pages (Frontend)

- `client/src/pages/customer/*.jsx` - Customer pages
- `client/src/api/authAPI.js` - API calls

### Admin Dashboard (Frontend)

- `client/src/pages/admin/Customers.jsx` - Real-time customer data ⭐
- `client/src/api/adminAPI.js` - Admin API calls

### Receptionist Pages (Frontend)

- `client/src/pages/receptionist/ReservedRooms.jsx` - Reserved room management ⭐
- `client/src/pages/receptionist/CustomerHistory.jsx` - With delete option ⭐

### Backend APIs

- `server/src/controllers/` - Business logic
- `server/src/routes/` - API endpoints
- `server/models/` - Database schemas

---

## 📊 Database Schema Highlights

### Customer Table

```sql
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  nationality VARCHAR(100),
  id_type ENUM('passport', 'national_id', 'driving_license', 'other'),
  id_number VARCHAR(50),
  id_expiry DATE,
  otp_code VARCHAR(255),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);
```

### Booking Table

```sql
CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_ref VARCHAR(50) UNIQUE,
  customer_id INT,
  room_id INT,
  check_in DATE,
  check_out DATE,
  total_amount DECIMAL(10,2),
  payment_status ENUM('pending', 'paid', 'pay_at_hotel'),
  status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'),
  payment_proof_url TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);
```

### PaymentTransaction Table

```sql
CREATE TABLE payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT,
  customer_id INT,
  amount DECIMAL(10,2),
  status ENUM('pending', 'paid', 'expired', 'failed'),
  qr_image_url TEXT,
  qr_expires_at TIMESTAMP,
  qr_payload TEXT,
  payment_reference VARCHAR(100),
  created_at TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

---

## 🧪 Quick Test Script

```bash
#!/bin/bash

# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}' | jq -r '.otp')

echo "OTP: $TOKEN"

# Verify OTP
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+919876543210\",\"otp\":\"$TOKEN\"}")

JWT=$(echo $RESPONSE | jq -r '.data.token')

# Get profile with token
curl -s http://localhost:3000/api/customer/me \
  -H "Authorization: Bearer $JWT" | jq .
```

---

## 🎯 Feature Testing Roadmap

**Week 1:**

- [ ] Customer booking flow end-to-end
- [ ] QR payment creation & timer
- [ ] Admin customer dashboard

**Week 2:**

- [ ] Receptionist reserved rooms management
- [ ] Payment proof verification
- [ ] Customer history with delete

**Week 3:**

- [ ] Email notifications
- [ ] Feedback & enquiry workflows
- [ ] Performance optimization

---

## 📞 Quick Help

**Q: How do I add a new customer role?**
A: Add to `server/models/Staff.js` role enum, then protect routes in `middleware/roleGuard.js`

**Q: How do I customize QR expiry time?**
A: Change `QR_EXPIRY_MINUTES` in `.env` (default: 15)

**Q: How do I add more room categories?**
A: Update `Room.js` model and database enum values

**Q: How do I test emails without real SMTP?**
A: Install Mailtrap, use their SMTP credentials, emails appear in dashboard

**Q: How do I increase token expiry?**
A: Change `JWT_EXPIRY` in `.env` (e.g., `30d` for 30 days)

---

## ✅ Pre-Launch Checklist

- [ ] Server running without errors
- [ ] Frontend loads all pages
- [ ] Customer can book a room
- [ ] Timer shows and counts down
- [ ] Admin sees customer data
- [ ] Receptionist can approve payment
- [ ] Database has backup
- [ ] Email configured (or mock working)
- [ ] All forms validate input
- [ ] No console errors

---

## 🚀 Ready to Deploy?

1. Build frontend: `npm --workspace client run build`
2. Run migrations: `npm --workspace server run migrate`
3. Configure production .env
4. Start production: `npm --workspace server run start`
5. Serve frontend build from CDN/static

---

**Setup Time**: ~15 minutes  
**First Test**: ~5 minutes  
**Documentation**: Complete  
**Status**: ✅ Ready to Use

Happy coding! 🎉
