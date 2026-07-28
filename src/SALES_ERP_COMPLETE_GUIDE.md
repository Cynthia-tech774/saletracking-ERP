# Sales Tracking ERP — Complete Project Guide

**Version:** 1.0  
**Last updated:** June 2026  
**Project folder:** `Sales Tracking ERP`

Use this document as your single reference for how the app works, how to run it, and how to maintain it. You can open this file in any editor, share it, or **Print → Save as PDF** in your browser for a downloadable copy.

---

## Table of Contents

1. [What This Application Is](#1-what-this-application-is)
2. [System Architecture](#2-system-architecture)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Technology Stack](#4-technology-stack)
5. [How to Run the Application](#5-how-to-run-the-application)
6. [URLs and Ports](#6-urls-and-ports)
7. [Login and User Roles](#7-login-and-user-roles)
8. [Every Page Explained](#8-every-page-explained)
9. [Database (What Is Stored)](#9-database-what-is-stored)
10. [API Reference](#10-api-reference)
11. [Business Logic You Should Know](#11-business-logic-you-should-know)
12. [Environment Variables and Secrets](#12-environment-variables-and-secrets)
13. [Docker Details](#13-docker-details)
14. [Troubleshooting](#14-troubleshooting)
15. [Pushing to GitHub](#15-pushing-to-github)
16. [Production Checklist](#16-production-checklist)
17. [Future Improvements](#17-future-improvements)

---

## 1. What This Application Is

**Sales Tracking ERP** is a web application for small businesses to:

- Track **customers** and how much they have spent
- Manage a **product catalog** with stock levels
- Record **sales** (invoices) with line items
- Adjust **inventory** automatically when sales complete
- View a **dashboard** with revenue, charts, and alerts
- Run **reports** and export data (Excel, PDF invoices)
- Control access with **roles** (Admin, Manager, User)

It is **not** a hosted SaaS product out of the box — you run it on your computer (or a server) using Docker or Node.js + PostgreSQL.

---

## 2. System Architecture

```
┌─────────────────┐     HTTP (browser)      ┌─────────────────┐
│   React App     │ ──────────────────────► │  Express API    │
│   (Frontend)    │   JWT in Authorization  │  (Backend)      │
│   Port 3000     │ ◄────────────────────── │  Port 5000      │
└─────────────────┘     JSON responses      └────────┬────────┘
                                                   │
                                                   │ Prisma ORM
                                                   ▼
                                          ┌─────────────────┐
                                          │   PostgreSQL    │
                                          │   Port 5432     │
                                          └─────────────────┘
```

**Flow when you log in:**

1. Browser sends email + password to `POST /api/auth/login`
2. Backend checks password (bcrypt hash in database)
3. Backend returns a **JWT token** (valid 24 hours)
4. Frontend stores token in browser **localStorage** (via Zustand persist)
5. Every API request includes header: `Authorization: Bearer <token>`

**Flow when you create a sale:**

1. Frontend sends customer, line items, tax, discount, payment method
2. Backend runs a **database transaction**: verify stock → create sale → reduce stock → update customer total spent → log activity
3. Frontend refreshes sales list and dashboard

---

## 3. Project Folder Structure

```
Sales Tracking ERP/
├── backend/                 # API server
│   ├── prisma/
│   │   ├── schema.prisma    # Database models
│   │   └── seed.ts          # Demo users, products, sample sale
│   ├── src/
│   │   ├── server.ts        # App entry, routes mounted here
│   │   ├── lib/prisma.ts    # Database client
│   │   ├── middleware/      # Auth, errors
│   │   ├── routes/          # auth, sales, products, customers, etc.
│   │   └── utils/           # Invoice numbers, activity logging
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/                # React UI
│   ├── src/
│   │   ├── pages/           # Dashboard, Sales, Products, ...
│   │   ├── components/      # Layout, modals, spinner
│   │   ├── services/api.ts  # Axios + JWT interceptor
│   │   └── stores/          # Auth state (Zustand)
│   ├── Dockerfile
│   └── vite.config.ts       # Dev server + API proxy
├── docker-compose.yml       # Runs postgres + backend + frontend
├── README.md                # Quick start
├── docs/
│   └── SALES_ERP_COMPLETE_GUIDE.md   # This file
└── .gitignore
```

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend UI | React 18 | Pages and components |
| Frontend build | Vite 4 | Fast dev server, production build |
| Styling | Tailwind CSS 3 | Layout and design |
| Frontend data | TanStack React Query | Fetch/cache API data |
| Frontend state | Zustand | Login token + user in localStorage |
| HTTP client | Axios | API calls |
| Charts | Recharts | Dashboard and analytics graphs |
| Forms | React Hook Form | Product/customer modals |
| Notifications | react-hot-toast | Success/error messages |
| Backend | Express 4 + TypeScript | REST API |
| ORM | Prisma 5 | Database queries and migrations |
| Database | PostgreSQL 15 | Persistent data |
| Auth | JWT + bcryptjs | Login and password hashing |
| Validation | express-validator | Request body rules |
| PDF export | PDFKit | Invoice PDFs |
| Excel export | ExcelJS | Sales report spreadsheets |
| Containers | Docker Compose | One-command startup |

---

## 5. How to Run the Application

### Option A — Docker (recommended)

**Requirements:** Docker Desktop installed and running.

```powershell
cd "C:\Users\cynth\OneDrive\Desktop\Sales Tracking ERP"
docker compose up --build
```

Wait until you see:

- `frontend-1  | Local: http://localhost:3000/`
- `backend-1   | Server running on port 5000`
- `Seed completed.` (first run only)

**If backend keeps crashing:** rebuild only the backend:

```powershell
docker compose down
docker compose build backend --no-cache
docker compose up
```

### Option B — Local development (without Docker for app code)

**Requirements:** Node.js LTS, npm, PostgreSQL (or Docker for postgres only).

**Step 1 — Database only:**

```powershell
docker compose up postgres -d
```

**Step 2 — Backend:**

```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

**Step 3 — Frontend (new terminal):**

```powershell
cd frontend
npm install
npm run dev
```

Frontend uses Vite proxy: browser calls `/api` → forwarded to `http://localhost:5000`.

---

## 6. URLs and Ports

| What | URL | Notes |
|------|-----|-------|
| **Website (UI)** | http://localhost:3000 | Login and all pages |
| **API base** | http://localhost:5000/api | All REST endpoints |
| **Health check** | http://localhost:5000/api/health | Confirms backend is up |
| **PostgreSQL** | localhost:5432 | Only for DB tools (not the website) |

---

## 7. Login and User Roles

### Demo accounts (created by `npm run db:seed`)

| Role | Email | Password | What they can do |
|------|-------|----------|------------------|
| **ADMIN** | admin@erp.com | admin123 | Everything + user management + delete products |
| **MANAGER** | manager@erp.com | manager123 | Products CRUD, sales, customers, reports |
| **USER** | sales@erp.com | user123 | Sales, customers, view data (no product delete, no users page) |

**Password rules for new users:** minimum 6 characters (when admin registers via API).

### Role permissions summary

| Feature | USER | MANAGER | ADMIN |
|---------|------|---------|-------|
| Dashboard, Sales, Customers | Yes | Yes | Yes |
| Create/edit products | No | Yes | Yes |
| Delete products | No | No | Yes |
| Users page | No | No | Yes |
| Register new users (API) | No | No | Yes |
| Activity log (API) | No | Yes | Yes |

---

## 8. Every Page Explained

### Login (`/login`)

- Sign in with email and password
- Token saved in browser; redirected to dashboard
- If backend is down, message: *"Cannot reach server..."*

### Dashboard (`/`)

- **Metrics:** total revenue, today’s revenue, customer count, low stock count, pending sales, estimated profit
- **Weekly sales chart** (line)
- **Top products** by units sold
- **Recent sales** table
- **Low stock alert** panel (products with stock &lt; 10)

### Sales (`/sales`)

- List all sales with pagination and search (invoice or customer name)
- **New Sale** button → modal: pick customer, add line items, tax, discount, payment method
- Change **status** per sale (dropdown): PENDING, COMPLETED, CANCELLED, REFUNDED
- **Download PDF** icon per row (invoice)

### Products (`/products`)

- Table: name, SKU, category, price, stock
- Search and **Low stock** filter
- Managers/Admins: Add, Edit, Delete (admin only)
- Stock shown in red when &lt; 10

### Customers (`/customers`)

- Card grid: name, company, contact, number of sales, total spent
- Add and edit customers via modal

### Reports (`/reports`)

- Pick **date range**
- Summary cards: total sales count, revenue, average order, discounts
- Tables: by payment method, by sales rep, top products
- **Export Excel** button downloads `.xlsx` file

### Analytics (`/analytics`)

- Monthly revenue bar chart
- Sales by status pie chart
- Product performance chart (units + revenue)

### Users (`/users`) — Admin only

- List all users
- Change role dropdown
- Delete user (not yourself)

---

## 9. Database (What Is Stored)

### Tables (Prisma models)

| Model | Stores |
|-------|--------|
| **User** | Staff accounts: email, hashed password, name, role |
| **Customer** | Clients: name, email, phone, address, company, totalSpent |
| **Product** | Catalog: name, SKU, category, price, cost, stock, description |
| **Sale** | Invoice header: invoiceNo, totals, status, payment method, dates |
| **SaleItem** | Lines on a sale: product, quantity, unit price, line total |
| **Activity** | Audit log: who did what and when |

### Sale statuses

| Status | Meaning |
|--------|---------|
| PENDING | Sale recorded; stock **not** deducted until completed |
| COMPLETED | Sale finalized; stock deducted; customer totalSpent increased |
| CANCELLED | Sale voided; stock restored if was completed |
| REFUNDED | Same stock/customer reversal logic as cancel |

### Payment methods

`CASH`, `CARD`, `BANK_TRANSFER`, `CREDIT`

---

## 10. API Reference

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <token>` (except login)

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login → `{ token, user }` |
| GET | `/auth/me` | Yes | Current user profile |
| POST | `/auth/register` | Admin | Create new user |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | All dashboard metrics and charts |

### Sales

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales` | List (query: page, limit, search, dates, status) |
| GET | `/sales/:id` | One sale with items |
| POST | `/sales` | Create sale |
| PATCH | `/sales/:id/status` | Change status |

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List (search, category, lowStock) |
| GET | `/products/categories` | Distinct categories |
| GET | `/products/:id` | One product |
| POST | `/products` | Create (Manager+) |
| PUT | `/products/:id` | Update (Manager+) |
| PATCH | `/products/:id/stock` | Adjust stock (Manager+) |
| DELETE | `/products/:id` | Delete (Admin) |

### Customers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | List |
| GET | `/customers/:id` | Detail + recent sales |
| POST | `/customers` | Create |
| PUT | `/customers/:id` | Update |
| DELETE | `/customers/:id` | Delete (only if no sales) |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/summary` | Aggregated report for date range |
| GET | `/reports/sales/excel` | Download Excel |
| GET | `/reports/sales/:id/pdf` | Download invoice PDF |

### Users (Admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users |
| PATCH | `/users/:id/role` | Change role |
| DELETE | `/users/:id` | Delete user |

### Activities (Manager+)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/activities` | Audit log |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ status: "ok" }` |

---

## 11. Business Logic You Should Know

### Creating a sale

1. Subtotal = sum of (product price × quantity) for each line
2. Grand total = subtotal + tax − discount
3. Invoice number format: `INV-YYYYMMDD-####` (random suffix)
4. If status is **COMPLETED** (default): stock decreases, customer `totalSpent` increases
5. If status is **PENDING**: sale saved but stock **unchanged**

### Changing sale status

- **COMPLETED → CANCELLED/REFUNDED:** stock added back, customer spend reduced
- **PENDING → COMPLETED:** stock checked and deducted, customer spend increased
- Prevents completing a sale if insufficient stock

### Profit estimate (dashboard)

For completed sales: `line revenue − (product cost × quantity)` summed across all sale items.

### Low stock threshold

Products with **stock &lt; 10** appear in dashboard alerts and can be filtered on Products page.

---

## 12. Environment Variables and Secrets

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5432/erp_sales"
JWT_SECRET="change-me-in-production"
PORT=5000
```

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Signs login tokens — **must be long and random in production** |
| PORT | API port (5000) |

### Frontend

| Variable | Purpose |
|----------|---------|
| VITE_API_URL | API base URL (Docker: `http://localhost:5000/api`) |

**Never commit** `backend/.env` to Git (listed in `.gitignore`).

---

## 13. Docker Details

### Three services

1. **postgres** — database, data persisted in Docker volume `postgres_data`
2. **backend** — builds from `backend/Dockerfile`, runs migrations + seed + server
3. **frontend** — Vite dev server on port 3000

### Backend container startup command

```sh
npx prisma db push && npm run db:seed && npm start
```

- `db push` — creates/updates tables from schema
- `db:seed` — demo users and sample data
- `npm start` — runs compiled `dist/server.js`

### Known Docker issue (fixed in Dockerfile)

Older Alpine images broke Prisma (OpenSSL). Current Dockerfile uses **node:20-bookworm-slim** with OpenSSL installed.

---

## 14. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| "Invalid email or password" but credentials are correct | Backend not running | Check http://localhost:5000/api/health |
| "Cannot reach server" on login | Backend crashed or not built | `docker compose build backend --no-cache && docker compose up` |
| Backend exits with Prisma/OpenSSL error | Old image | Rebuild backend (see above) |
| `npm install` fails during Docker build | Network timeout | Retry build; Dockerfile has npm retries |
| Empty dashboard / no data | Seed did not run | `docker compose exec backend npm run db:seed` |
| Frontend loads, API 404 | Wrong VITE_API_URL | Should be `http://localhost:5000/api` in docker-compose |
| Port already in use | Another app on 3000/5000/5432 | Stop other services or change ports in docker-compose |
| Login works once then kicks out | Token expired (24h) or invalid JWT_SECRET changed | Log in again |

---

## 15. Pushing to GitHub

**Include in repo:**

- All source code, `README.md`, this guide, `docker-compose.yml`, `.env.example`, `.gitignore`

**Do not commit:**

- `node_modules/`, `backend/.env`, `dist/`, database volume data

**Suggested repo description:**

> Full-stack Sales Tracking ERP — React + Express + PostgreSQL. Customers, inventory, sales, PDF invoices, Excel reports, dashboards, role-based access. Docker-ready.

```powershell
git init
git add .
git commit -m "Initial commit: Sales Tracking ERP"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 16. Production Checklist

Before putting this on the internet:

- [ ] Change `JWT_SECRET` to a long random string (32+ characters)
- [ ] Change database password; update `DATABASE_URL` everywhere
- [ ] Remove or disable demo seed accounts; use real passwords
- [ ] Use HTTPS (reverse proxy: Nginx, Caddy, or cloud load balancer)
- [ ] Set `NODE_ENV=production`
- [ ] Build frontend: `npm run build` and serve static files (not Vite dev server)
- [ ] Use Prisma migrations (`prisma migrate deploy`) instead of only `db push`
- [ ] Back up PostgreSQL regularly
- [ ] Restrict CORS to your real domain only

---

## 17. Future Improvements

Ideas you could add later:

- Email invoices to customers
- Purchase orders / supplier management
- Multi-currency and tax rules per region
- Barcode scanning for products
- Mobile-responsive PWA
- Two-factor authentication
- Dark mode
- Scheduled report emails

---

## Quick Reference Card

```
Website:     http://localhost:3000
API:         http://localhost:5000/api
Health:      http://localhost:5000/api/health

Admin login: admin@erp.com / admin123

Start:       docker compose up --build
Stop:        Ctrl+C  or  docker compose down

Backend logs: docker compose logs backend -f
Reseed DB:    docker compose exec backend npm run db:seed
```

---

*End of guide — Sales Tracking ERP*
