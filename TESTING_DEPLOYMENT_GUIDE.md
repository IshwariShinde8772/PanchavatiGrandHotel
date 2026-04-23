# Testing and Deployment Guide

## Local Validation

1. Install dependencies:
   - `npm install`
2. Build frontend + server placeholder lint:
   - `npm run build`
3. Run backend tests:
   - `npm --workspace server run test`

## Backend Test Coverage

Current automated backend tests cover:

1. Worker route auth + role access rules
2. Worker task list, task status update, issue reporting
3. Admin notifications list + create endpoints
4. Payment verification fails closed when Razorpay secret config is missing
5. Payment verification idempotent behavior on repeated verification
6. Check-in behavior (booking status + room occupancy + task/notification creation)
7. Check-out behavior (room cleaning status + bill/history/task/notification creation)
8. Upload spoofing rejection via magic-byte validation

## Manual Functional Checks

### Worker Portal

- Login with role `housekeeping`, `kitchen`, or `server`
- Access `/worker`
- Confirm:
  - tasks load from API
  - status transitions follow `pending -> in_progress -> done`
  - notes updates persist
  - issue report submits to backend
  - schedule loads from `schedule_json`

### Admin Notifications

- Open `/admin/notifications`
- Create notification with `target_role`, `type`, `title`, `message`
- Confirm list refresh, unread indicators, mark-read, and delete actions

### Admin Reports

- Open `/admin/reports`
- Adjust month/year/date/category/status filters
- Confirm summary + charts/tables refresh from `/api/admin/reports`
- Export CSV and confirm it respects active filters

### Receptionist Check-In/Out

- Open `/receptionist/check-in-out`
- Search booking by ref / guest / room
- Execute check-in with id/payment fields
- Execute check-out with extras + payment fields
- Verify booking/dashboard/room-grid/cleaning data refresh

### OAuth Security Flow

- Trigger Google login
- Confirm callback URL is `/auth/callback?provider=google` (no JWT query param)
- Confirm frontend uses `/api/auth/oauth/exchange`

### Upload Security

- Upload valid jpeg/png/webp image
- Attempt spoofed file with image extension and non-image bytes
- Confirm spoofed file is rejected cleanly with 400

## Deployment Notes

- Configure production `server/.env`:
  - DB credentials
  - JWT secret
  - SMTP
  - Google OAuth client id/secret
  - Razorpay key id/secret
- Ensure writable `server/uploads` directory with safe permissions (not world writable).
- Run CI checks before deployment.

## CI Workflow

`/.github/workflows/ci.yml` runs on push + pull_request:

1. `npm ci`
2. `npm --workspace client run build`
3. `npm --workspace server run test`

