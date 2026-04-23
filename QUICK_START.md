# Quick Start

## 1) Install

```bash
npm install
```

## 2) Configure Env

```bash
copy client/.env.example client/.env
copy server/.env.example server/.env
```

Set MySQL values in `server/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=panchavati_hotel
DB_USER=root
DB_PASS=your_mysql_password
```

## 3) Prepare Database

```sql
CREATE DATABASE panchavati_hotel;
```

## 4) Seed Base Records

```bash
npm run seed
```

Note: this seed currently creates/syncs schema and ensures base records. It does not guarantee full sample/demo business data.

## 5) Run App

Terminal A:

```bash
npm run dev:server
```

Terminal B:

```bash
npm run dev:client
```

## 6) Key URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Worker portal: `http://localhost:5173/worker`
- Admin notifications: `http://localhost:5173/admin/notifications`
- Admin reports: `http://localhost:5173/admin/reports`
- Receptionist check-in/out: `http://localhost:5173/receptionist/check-in-out`

## 7) OAuth Quick Check

Google callback now redirects without JWT in query string:

- redirect target: `/auth/callback?provider=google`
- token exchange API: `GET /api/auth/oauth/exchange`

## 8) Dev Verification Commands

```bash
npm run build
npm --workspace server run test
```

