# Panchavati Grand Hotel Management System

Full-stack hotel management platform for a Nashik-based property with:

- Customer booking flow with pay-later support
- Reception desk workflows
- Admin operations, reporting, inventory, maintenance
- Worker task portal
- Nashik-inspired responsive frontend

## Workspace

- `client`: React 18 + Vite + Tailwind frontend
- `server`: Express + Sequelize + MySQL backend

## Quick Start

1. Install dependencies in the workspace root: `npm install`
2. Copy `client/.env.example` to `client/.env`
3. Copy `server/.env.example` to `server/.env`
4. Create the MySQL database `panchavati_hotel`
5. Run the seed script: `npm run seed`
6. Start frontend and backend in separate terminals:
   - `npm run dev:server`
   - `npm run dev:client`

## Seed Accounts

- Admin: `admin@panchavatgrand.in` / `admin@123`
- Receptionist: `sunil@pvhtel.in` / `recep@123`
- Worker: `ganesh@pvhtel.in` / `work@123`

