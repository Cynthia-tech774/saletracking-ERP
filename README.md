# Sales Tracking ERP

Full-stack sales tracking system with inventory, customers, invoicing, reports, and role-based access.

**Full documentation:** [docs/SALES_ERP_COMPLETE_GUIDE.md](docs/SALES_ERP_COMPLETE_GUIDE.md) — architecture, every page, API, roles, troubleshooting, and production checklist.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend:** React, Vite, Tailwind CSS, React Query, Recharts
- **Auth:** JWT with roles (ADMIN, MANAGER, USER)

## Features

- Dashboard with revenue, profit estimate, low-stock alerts
- Sales with atomic stock updates, status changes (cancel/refund restores stock)
- Product & customer CRUD with search
- PDF invoices and Excel sales export
- Analytics charts (revenue trend, status breakdown, top products)
- Activity audit log (managers/admins)
- User management (admin)

## Quick Start (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:5000/api

## Local Development

### 1. Database

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend proxies `/api` to the backend (see `vite.config.ts`).

## Demo Accounts

| Role    | Email            | Password    |
|---------|------------------|-------------|
| Admin   | admin@erp.com    | admin123    |
| Manager | manager@erp.com  | manager123  |
| Sales   | sales@erp.com    | user123     |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard` | Dashboard metrics |
| CRUD | `/api/products` | Products |
| CRUD | `/api/customers` | Customers |
| CRUD | `/api/sales` | Sales |
| GET | `/api/reports/summary` | Report summary |
| GET | `/api/reports/sales/excel` | Excel export |
| GET | `/api/reports/sales/:id/pdf` | Invoice PDF |

## Environment

**Backend** (`backend/.env`):

```
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5432/erp_sales"
JWT_SECRET="change-me-in-production"
PORT=5000
```

Change `JWT_SECRET` before deploying to production.
