# Panchavati Grand Hotel Management System

Full-stack hotel operations platform for customer bookings, reception desk workflows, admin operations, and worker task execution.

## Stack

- Frontend: React + Vite + React Router + React Query + Axios + Zustand
- Backend: Express + Sequelize + MySQL
- Language: JavaScript / JSX

## Workspace Layout

- `client/`: frontend app
- `server/`: backend API + services + models

## Quick Start

1. Install dependencies from workspace root:
   - `npm install`
2. Configure env files:
   - copy `client/.env.example` -> `client/.env`
   - copy `server/.env.example` -> `server/.env`
3. Create MySQL database:
   - `panchavati_hotel`
4. Seed base records:
   - `npm run seed`
5. Start dev servers in separate terminals:
   - `npm run dev:server`
   - `npm run dev:client`

## Important Seed Note

`npm run seed` currently guarantees schema sync + base system records only (default hotel settings + default admin bootstrap).  
It does not guarantee rich demo/sample data unless you add explicit sample seed content.

## Portal Routes

- Public: `/`, `/rooms`, `/login`, `/register`
- Customer portal: `/customer/*`
- Receptionist portal: `/receptionist/*`
- Admin portal: `/admin/*`
- Worker portal (housekeeping/kitchen/server): `/worker/*`
  - `/worker` (My Tasks)
  - `/worker/report-issue`
  - `/worker/schedule`

## OAuth (Google) Flow

1. User starts at `GET /api/auth/google`
2. Callback: `GET /api/auth/google/callback`
3. Backend sets short-lived HttpOnly cookie and redirects to:
   - `/auth/callback?provider=google` (no JWT in URL)
4. Frontend calls:
   - `GET /api/auth/oauth/exchange`
5. Exchange returns `{ token, user }` and clears cookie

## Notifications and Reports

- Admin notifications API supports list/create/read/delete via `/api/admin/notifications`
- Admin reports API supports filters via `/api/admin/reports` and filtered CSV export via `/api/admin/reports/bookings.csv`

## Security Hardening Highlights

- Razorpay signature verification now fails closed when secret config is missing
- Payment verification endpoint returns service-unavailable when verification config is incomplete
- Payment verification is idempotent for repeated callbacks
- Upload endpoint validates image magic bytes (jpeg/png/webp) and rejects spoofed files

## Tests

- Backend tests:
  - `npm --workspace server run test`
- Frontend build check:
  - `npm --workspace client run build`

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

- runs on push + pull_request
- installs with `npm ci`
- builds client
- runs backend tests

