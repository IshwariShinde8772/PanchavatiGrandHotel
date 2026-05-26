# API Reference

Base URL (dev): `http://localhost:5000/api`

All protected endpoints require:

```http
Authorization: Bearer <JWT>
```

---

## Auth

### Public Auth

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/customer/register`
- `POST /auth/customer/login`
- `POST /auth/customer/forgot-password`
- `POST /auth/customer/reset-password`
- `POST /auth/admin/login`
- `POST /auth/staff/login`

### Google OAuth

- `GET /auth/google`
- `GET /auth/google/callback`
  - sets short-lived HttpOnly cookie
  - redirects to `/auth/callback?provider=google` (no JWT query token)
- `GET /auth/oauth/exchange`
  - reads short-lived cookie
  - returns `{ success, data: { token, user }, message }`
  - clears cookie on success/failure

---

## Worker API (roles: housekeeping/kitchen/server)

- `GET /worker/tasks`
- `PATCH /worker/tasks/:id`
  - supports status transition (`pending -> in_progress -> done`)
  - supports optional notes update
- `GET /worker/schedule`
- `POST /worker/issues`

Example issue payload:

```json
{
  "room_number": "302",
  "title": "AC not cooling",
  "description": "AC airflow is weak",
  "priority": "high"
}
```

---

## Receptionist API

- `GET /receptionist/dashboard`
- `GET /receptionist/bookings`
  - supports `q`, `status`, `payment_status`, `category`, pagination
- `POST /receptionist/bookings/:id/check-in`
- `POST /receptionist/bookings/:id/check-out`
  - `extras` supports objects with `label` or `title` + `amount`
- `POST /receptionist/walk-in-bookings`
- `POST /receptionist/bookings/:id/extend`
- `POST /receptionist/bookings/:id/cancel`
- `GET /receptionist/room-grid`
- `GET /receptionist/tasks`

---

## Admin Notifications API

### List

`GET /admin/notifications`

Optional query params:

- `target_role`
- `type`
- `unreadOnly` (`true`/`false`)
- `limit`

Response shape:

```json
{
  "success": true,
  "data": [],
  "total": 0,
  "message": "Notifications fetched successfully"
}
```

### Create

`POST /admin/notifications`

Required fields:

- `target_role`
- `title`
- `message`
- `type` one of `booking|payment|maintenance|task|system`

Optional:

- `target_id` (positive integer; not allowed when `target_role=all`)

### Mark Read

`PATCH /admin/notifications/:id/read`

### Delete

`DELETE /admin/notifications/:id`

---

## Admin Reports API

### Report Data

`GET /admin/reports`

Supported query params:

- `year`
- `month`
- `dateFrom` (optional)
- `dateTo` (optional)
- `category` (optional)
- `status` (optional)

Response includes:

- `summary`
- `revenueSeries`
- `revenueByCategory`
- `bookingsByStatus`
- `occupancy`
- `filters`

### Filtered CSV Export

`GET /admin/reports/bookings.csv`

Accepts same report query filters where practical.

---

## Customer Payments Hardening

`POST /customer/bookings/verify-payment`

Behavior:

- returns `503` if Razorpay verification config is incomplete
- signature verification fails closed when secret is missing
- idempotent on repeated verification calls
- avoids duplicate paid transactions/duplicate notifications

---

## Upload API

`POST /upload/image` (roles: admin/receptionist)

Rules:

- max file size `5MB`
- allows jpeg/png/webp only
- validates magic-byte file signature (not just extension/mimetype)
- rejects spoofed files with clean error response
