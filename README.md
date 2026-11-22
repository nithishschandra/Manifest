# Shoply: React, FastAPI and PostgreSQL store

A complete e-commerce starter: customers browse, search and filter products, manage a cart,
check out with a shipping address, track and cancel orders, and edit their profile. Admins
manage products and stock, process orders, and view customers and sales figures.

Checkout is a **demo**: orders are saved and stock is reserved, but no payment is taken.

## Stack

| Layer    | Technology                                                  |
|----------|-------------------------------------------------------------|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Axios           |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic 2, JWT auth, bcrypt         |
| Database | PostgreSQL 16                                               |
| Deploy   | Docker Compose, nginx (serves the React app and proxies /api) |

## Features

**Customers**
- Register, sign in and sign out. Passwords are hashed with bcrypt and sessions use JWT tokens.
- Product catalogue with search, category filter and sorting (newest, price, name).
- Product detail pages with quantity selection and live stock checks.
- Cart that survives page refreshes, with quantity controls and removal.
- Checkout with a shipping address. The server re-checks prices and stock.
- Order history and order detail pages. Customers can cancel orders that are still processing.
- Profile page to change the display name and password.

**Admins** (`/admin`)
- Dashboard with revenue, order, customer and product counts, plus recent orders.
- Product management: add, edit and delete. Products that appear in past orders cannot be deleted, so set their stock to 0 instead.
- Order management: filter by status and move orders through Processing, Shipped, Delivered or Cancelled.
- Customer list.

**Engineering**
- Stock is locked during checkout (`SELECT … FOR UPDATE`), so two buyers cannot oversell the last item.
- Cancelling an order, or an admin cancelling one, returns its items to stock.
- Backend tests cover the main flows: 18 tests run on SQLite and on PostgreSQL.
- Browser tests were run with Playwright across the customer and admin journeys.

## Project structure

```text
shoply/
├── docker-compose.yml          Full stack: db, backend, frontend
├── .env.example                Copy to .env and fill in before deploying
├── database/init.sql           Runs once when the database is first created
├── backend/
│   ├── app/
│   │   ├── main.py             App setup, CORS, startup (tables + demo data)
│   │   ├── config.py           Reads and validates environment variables
│   │   ├── database.py         SQLAlchemy engine and session
│   │   ├── models.py           User, Product, Order, OrderItem
│   │   ├── schemas.py          Request and response validation
│   │   ├── security.py         Password hashing, JWT, auth dependencies
│   │   ├── seed.py             Demo accounts and products
│   │   ├── create_admin.py     CLI to create an admin account
│   │   └── routers/            auth, users, products, orders, admin
│   ├── tests/test_api.py       API tests (SQLite or PostgreSQL)
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx, App.jsx   Providers and routes
    │   ├── api/client.js       Axios instance, token handling, error messages
    │   ├── context/            Auth, cart and toast state
    │   ├── components/         Layout, product card, route guards, UI pieces
    │   ├── pages/              shop, cart, checkout, authentication, orders,
    │   │                       profile, admin/*, NotFound
    │   └── style.css
    ├── nginx.conf              Serves the SPA and proxies /api in Docker
    ├── Dockerfile
    ├── vite.config.js          Dev server proxies /api to the backend
    └── .env.example
```

## Option A: run everything with Docker

Requires Docker Desktop (or Docker Engine with the Compose plugin).

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and SECRET_KEY (see the comments in the file)
docker compose up -d --build
```

Open http://localhost:8080. The API docs are at http://localhost:8080/docs.

### Docker credentials and ports

The checked-out local `.env` is configured for this running environment:

| Setting | Value |
|---|---|
| PostgreSQL database | `shoply` |
| PostgreSQL user | `shoply` |
| PostgreSQL password | `ShoplyDb2026LocalPassword` |
| PostgreSQL host port | `55432` |
| PostgreSQL container port | `5432` |
| Frontend and nginx port | `8080` |
| Backend API | `http://localhost:8080/api` |
| `APP_ENV` | `production` |
| `SEED_DEMO_DATA` | `true` |

The PostgreSQL container is reachable from the host at
`127.0.0.1:55432`. Backend containers connect through the Docker network as
`db:5432`, without needing the host port.

Demo accounts are created at startup because `SEED_DEMO_DATA=true`.
Use them only on a local or test instance. To disable demo accounts and create
your own administrator:

```bash
# Set SEED_DEMO_DATA=false in .env, restart, then run:
docker compose exec backend python -m app.create_admin --email you@example.com --name "Your Name"
```

## Option B: local development (hot reload)

Start only the database in Docker:

```bash
docker compose up -d db
```

**Backend** (Python 3.12 or newer):

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .\.venv\Scripts\Activate.ps1
# macOS / Linux:       source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The default `.env` settings work for local development. The backend creates tables and, with `SEED_DEMO_DATA=true`, demo accounts and products on startup.

**Frontend** (Node.js 20 or newer), in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend on port 8000, so no CORS setup is needed.

The local backend `.env` uses
`postgresql+psycopg://shoply:ShoplyDb2026LocalPassword@localhost:55432/shoply`.
This password must match the `POSTGRES_PASSWORD` in the root `.env`.

If you change `DB_PORT` or `POSTGRES_PASSWORD`, update `DATABASE_URL` in
`backend/.env` to match before starting the backend.

## Demo accounts

These exist only when `SEED_DEMO_DATA=true`. Their passwords are public, so never enable demo data on a live store.

| Role     | Email               | Password    |
|----------|---------------------|-------------|
| Customer | user@shoply.dev     | User123!    |
| Admin    | admin@shoply.dev    | Admin123!   |

## API overview

| Method | Path                              | Access   | Purpose                              |
|--------|-----------------------------------|----------|--------------------------------------|
| POST   | /api/auth/register                | Public   | Create an account                    |
| POST   | /api/auth/login                   | Public   | Sign in, returns a token             |
| GET    | /api/auth/me                      | Customer | Current user                         |
| GET    | /api/profile                      | Customer | Profile                              |
| PUT    | /api/profile                      | Customer | Update name or password              |
| GET    | /api/products                     | Public   | List: `q`, `category`, `sort`        |
| GET    | /api/products/categories          | Public   | Category names                       |
| GET    | /api/products/{id}                | Public   | Product detail                       |
| POST   | /api/orders                       | Customer | Place an order (checkout)            |
| GET    | /api/orders                       | Customer | My orders                            |
| GET    | /api/orders/{id}                  | Customer | One of my orders                     |
| POST   | /api/orders/{id}/cancel           | Customer | Cancel while processing              |
| GET    | /api/admin/stats                  | Admin    | Dashboard counts and revenue         |
| POST   | /api/admin/products               | Admin    | Add product                          |
| PUT    | /api/admin/products/{id}          | Admin    | Edit product                         |
| DELETE | /api/admin/products/{id}          | Admin    | Delete product (not if ordered)      |
| GET    | /api/admin/orders                 | Admin    | All orders, optional `status_filter` |
| PATCH  | /api/admin/orders/{id}/status     | Admin    | Change order status                  |
| GET    | /api/admin/users                  | Admin    | All customers                        |
| GET    | /api/health                       | Public   | Health check                         |

## Running the tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q                                   # SQLite, no setup needed
TEST_DATABASE_URL="postgresql+psycopg://shoply:PASSWORD@localhost:5432/shoply_test" pytest -q   # PostgreSQL
```

The PostgreSQL run drops and recreates every table, so point it at a database you can wipe.

## Deploying to a server

1. **Set real secrets.** `SECRET_KEY` must be random and at least 32 characters. The backend refuses to start in production with a weak key. Use a strong `POSTGRES_PASSWORD` too.
2. **Turn off demo data.** Keep `SEED_DEMO_DATA=false`, then create your admin with `create_admin`.
3. **Set the public URL.** Put your real site address in `FRONTEND_ORIGINS`, for example `https://shop.example.com`.
4. **Use HTTPS.** Put a TLS-terminating reverse proxy in front of the frontend container (Caddy, Traefik, or a cloud load balancer). Tokens are sent in the `Authorization` header, so HTTP would expose them.
5. **Keep the database private.** The compose file binds Postgres to 127.0.0.1 only. Do not publish it on a public interface.
6. **Back up the database.** Back up the `shoply_pgdata` volume, or use `pg_dump` on a schedule.
7. **Connect a payment provider.** Checkout does not charge anyone. Stripe, Razorpay or a similar provider must be integrated in `routers/orders.py` before taking real money.

### Upgrading from the first version

- Demo accounts changed from `@shoply.local` to `@shoply.dev`, because the old domain was rejected by email validation and made demo logins fail.
- The new version adds columns to existing tables. The app creates missing tables on startup but does not alter existing ones, so reset the database: `docker compose down -v` (this deletes its data), or migrate the data yourself.

## Known limitations

- No real payment, email notifications or password reset yet.
- No rate limiting on login. Add it at the reverse proxy or in the API before going live.
- Schema changes are applied with `create_all`. Add Alembic migrations before the first production release with real data.
- Product images are referenced by URL. Admins paste a link; there is no upload.
