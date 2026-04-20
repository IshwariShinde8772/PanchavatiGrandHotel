# Testing & Deployment Checklist

## 🧪 FUNCTIONAL TESTING CHECKLIST

### Customer Portal - Profile

- [ ] Load profile page - should show real customer data
- [ ] Update name, email, nationality - should save
- [ ] Add ID details - should persist
- [ ] Phone number is read-only
- [ ] All form fields validate correctly

### Customer Portal - Bookings

- [ ] View My Bookings - shows all bookings
- [ ] Filter current vs past bookings
- [ ] Click "View Details" - shows full booking info
- [ ] Download bill for completed bookings
- [ ] Cancel pending bookings with reason
- [ ] Receive notification on booking created

### Customer Portal - Transactions

- [ ] Transactions page loads booking payment list
- [ ] QR code displays correctly
- [ ] **Timer counts down** from minutes:seconds
- [ ] Timer disappears when QR expires (15 min default)
- [ ] "I Have Paid" button confirms payment
- [ ] "Generate New QR" creates fresh QR
- [ ] Transaction history shows all past payments

### Customer Portal - Feedback

- [ ] Only checked_out bookings eligible for feedback
- [ ] Can rate 1-5 stars
- [ ] Can add title and comment
- [ ] Submit button saves and shows success
- [ ] Feedback appears pending in admin dashboard

### Customer Portal - Enquiry

- [ ] Form pre-fills with profile data
- [ ] Can enter dates for stay
- [ ] Can select room category
- [ ] Submit triggers notification
- [ ] Admin receives enquiry and can respond
- [ ] Customer receives response email

### Admin Dashboard - Customers

- [ ] Customer list loads with real data
- [ ] Shows total bookings and spent amount
- [ ] "View Details" button shows full info
- [ ] Shows recent booking list on side panel
- [ ] Shows check-in status if guest is here
- [ ] Can search/filter customers (if implemented)

### Receptionist - Reserved Rooms

- [ ] Lists all pending & confirmed bookings
- [ ] Color-coded by payment status
- [ ] "View Details" shows guest + payment info
- [ ] Payment proof image displays
- [ ] "Verify & Approve" button works
- [ ] After approval, payment status changes to paid
- [ ] Stats show correct counts

### Receptionist - Customer History

- [ ] Shows past stayed guests
- [ ] "View" button displays trip details
- [ ] Payment proof visible with link
- [ ] "Delete" button removes record
- [ ] Deletion requires confirmation
- [ ] After delete, record no longer shows

### Notifications

- [ ] Shows all customer notifications
- [ ] Unread status indicator visible
- [ ] "Mark all as read" button works
- [ ] Time format shows "5m ago" style
- [ ] Clicking notification highlights it

---

## 🔐 SECURITY TESTING

- [ ] Only logged-in users can access portal
- [ ] Customers can only see their own data
- [ ] Admins can see all customer data
- [ ] Receptionists can only see what they need
- [ ] Direct URL access redirected if not logged in
- [ ] Profile update requires authentication
- [ ] Delete operations require confirmation

---

## 📱 DEVICE TESTING

### Mobile (< 768px)

- [ ] All pages stack vertically
- [ ] Touch targets are adequate (min 44x44px)
- [ ] Forms are usable on small screens
- [ ] Images scale properly
- [ ] No horizontal scroll needed
- [ ] Navigation menu works on mobile

### Tablet (768px - 1024px)

- [ ] Two-column layouts work
- [ ] Tables are readable
- [ ] Buttons properly spaced

### Desktop (> 1024px)

- [ ] Multi-column layouts functional
- [ ] Side panels display correctly
- [ ] Hover states work on buttons

---

## 🌐 BROWSER COMPATIBILITY

- [ ] Chrome (latest) - all features work
- [ ] Firefox (latest) - all features work
- [ ] Safari (latest) - all features work
- [ ] Edge (latest) - all features work
- [ ] Mobile Chrome - responsive
- [ ] Mobile Safari - responsive

---

## 🧠 API TESTING

### Test Each Endpoint

#### Customer APIs

```bash
# Get profile
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/customer/me

# Update profile
curl -X PUT -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"New Name"}' \
  http://localhost:3000/api/customer/profile

# Get bookings
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/customer/bookings

# Get transactions
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/customer/transactions

# Submit feedback
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{...}' \
  http://localhost:3000/api/customer/feedbacks

# Submit enquiry
curl -X POST -H "Content-Type: application/json" \
  -d '{...}' \
  http://localhost:3000/api/enquiries

# Get notifications
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/customer/notifications
```

#### Admin APIs

```bash
# Get customers
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/admin/customers

# Get customer detail
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/admin/customers/{id}
```

---

## 🎬 PAYMENT FLOW TEST

1. **As Customer:**
   - Book a room with QR payment method
   - Go to Transactions
   - See QR code with timer
   - Note timer countdown
   - Click "I Have Paid"
   - Transaction status changes to "Paid"
   - Booking status changes to "Confirmed"

2. **As Receptionist:**
   - Go to Reserved Rooms
   - See that booking now shows as "Paid"
   - Payment approved automatically OR
   - If status still pending, verify payment proof
   - Click "Verify & Approve"
   - Confirm in dialog
   - Booking now ready for check-in

---

## ✉️ EMAIL TESTING

1. **Setup:**
   - Configure real SMTP credentials in `.env`
   - Or use test email service (Mailtrap, etc.)

2. **Test Scenarios:**
   - [ ] Booking confirmation email sent
   - [ ] Enquiry received email sent to admin
   - [ ] Payment confirmation email
   - [ ] Check-in reminder (if scheduled)
   - [ ] Emails contain correct details
   - [ ] Email links work
   - [ ] Styling looks good

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All environment variables set in `.env`
- [ ] Database seeded with initial data
- [ ] Email service configured and tested
- [ ] Payment QR settings verified
- [ ] File upload paths writable
- [ ] Database backups configured
- [ ] Logs configured and monitored

### Database

- [ ] All migrations run successfully
- [ ] Sample data created (optional)
- [ ] Relationships verified between tables
- [ ] Indexes created for performance
- [ ] Backups scheduled daily

### Server

- [ ] Node dependencies installed
- [ ] Frontend built (`npm run build`)
- [ ] Production mode configured
- [ ] CORS settings correct
- [ ] SSL/HTTPS configured
- [ ] Rate limiting enabled
- [ ] Security headers set
- [ ] Error handling comprehensive

### Frontend

- [ ] Built with `npm run build`
- [ ] All API endpoints point to correct server
- [ ] Environment variables configured
- [ ] No console errors
- [ ] Performance optimized
- [ ] Images compressed
- [ ] Cache settings configured

### Monitoring

- [ ] Error tracking setup (Sentry, etc.)
- [ ] Performance monitoring active
- [ ] Log aggregation configured
- [ ] Alert thresholds set
- [ ] Regular backup verification

---

## 🐛 COMMON ISSUES & FIXES

### QR Timer Not Showing

- Check if JavaScript enabled
- Verify `transaction.qr_expires_at` has value
- Check browser console for errors
- Ensure React Query cache refreshed

### Customer Data Not Loading

- Verify JWT token valid
- Check customer ID correct
- Ensure user logged in
- Check database connection

### Email Not Sending

- Verify SMTP credentials
- Check sending email address whitelisted
- Look for email service blocking
- Check spam folder
- Enable "less secure apps" for Gmail

### Payment Not Confirming

- Verify API endpoint accessible
- Check booking exists
- Ensure transaction ID valid
- Check database permissions

### Admin Can't See Customers

- Verify admin role correct
- Check admin API endpoint accessible
- Ensure customers exist in database
- Check authorization header correct

---

## 📊 PERFORMANCE TESTING

### Load Times

- [ ] Customer portal loads < 2s
- [ ] Admin dashboard < 3s
- [ ] Image loading optimized
- [ ] API responses < 500ms
- [ ] No N+1 queries

### Database

- [ ] Queries indexed properly
- [ ] No slow queries (> 1s)
- [ ] Connection pool configured
- [ ] Prepared statements used

### Frontend

- [ ] Bundle size < 500KB
- [ ] No memory leaks
- [ ] Smooth animations (60fps)
- [ ] Touch response < 100ms

---

## 📝 SIGN-OFF VERIFICATION

- [ ] All requirements from user met
- [ ] All features working as designed
- [ ] No critical bugs remaining
- [ ] Performance acceptable
- [ ] Security best practices followed
- [ ] Documentation complete
- [ ] Team trained on system
- [ ] Ready for production

---

## 📞 SUPPORT CONTACTS

- **Technical Issues**: [Backend Dev]
- **UI/UX Issues**: [Frontend Dev]
- **Database Issues**: [DBA]
- **Email Issues**: [DevOps]

---

**Last Updated**: April 19, 2026
