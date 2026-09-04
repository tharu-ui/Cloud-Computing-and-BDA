# GreenPharm Backend (FastAPI + PostgreSQL)

Backend foundation for the existing GreenPharm frontend. The API is served under
`/api/v1`, matching `API_BASE_URL` in `src/lib/api/client.ts`.

## Structure

```text
backend/
  app/
    main.py          FastAPI entry point (CORS, routers, startup checks)
    config.py        Settings loaded from environment variables
    database.py      Engine, SessionLocal, Base, get_db dependency
    models/          SQLAlchemy tables: users, suppliers, medicines,
                     stock_transactions, purchase_orders,
                     purchase_order_items, expiry_records, notifications
    schemas/         Pydantic schemas (camelCase aliases for the frontend)
    routers/         health, medicines, suppliers
    services/        Business logic (inventory status rules)
  requirements.txt
  .env.example
```

## 1. Install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configure PostgreSQL

Create the database and a user, then copy the env template:

```bash
createdb greenpharm
cp .env.example .env
```

Edit `.env` (never commit it):

```env
POSTGRES_USER=greenpharm
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=greenpharm
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

Alternatively set a single `DATABASE_URL`, which overrides the parts above.

## 3. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

Backend URL: `http://localhost:8000`
API base: `http://localhost:8000/api/v1`
Swagger docs: `http://localhost:8000/docs`

## 4. Verify the database connection

```bash
curl http://localhost:8000/api/v1/health
```

Expected response lists the created tables:

```json
{"status":"ok","database":"connected","database_version":"PostgreSQL 16.x","tables":["expiry_records","medicines","notifications","purchase_order_items","purchase_orders","stock_transactions","suppliers","users"]}
```

Tables are created automatically on startup via `Base.metadata.create_all`.

## Notes

- The frontend still uses its mock service layer; nothing was rewired yet.
- Next stage: full CRUD routers, then point `src/lib/api/client.ts` at this API.
## 5. Seed the database from the frontend 

```bash
bun backend/tools/export-sample-data.ts   # optional: regenerate seed_data.json
python seed.py                            # idempotent (add --reset to truncate)
```

Seeds suppliers, medicines, stock transactions, purchase orders + items,
expiry records, notifications and the three demo users.

## 6. Endpoints

`/medicines` (CRUD), `/categories`, `/suppliers` (CRUD),
`/stock-transactions` (list + `?medicineId=`, create), `/stock/reorder-suggestions`,
`/purchase-orders` (list/get/create, `PATCH /{id}/status`),
`/expiry-records` (list, `PUT /{medicineId}`),
`/notifications` (list, `PATCH /{id}/read`, `PATCH /read-all`),
`/dashboard/metrics`, `/dashboard/charts`, `/green/metrics`,
`/reports/{inventory|stock|expiry|purchases|low_stock|near_expiry|supplier|waste}`,
`/auth/login`, `/auth/forgot-password`, `/health`.

## 7. Authentication

Passwords are stored as PBKDF2-HMAC-SHA256 hashes (never plaintext). Demo users
(`priya.nair@`, `jordan.mensah@`, `alina.frost@greenpharm.example`) are seeded with
password `greenpharm` (`DEMO_PASSWORD`). `ALLOW_DEMO_LOGIN=true` (default) lets any
4+ character password sign in the demo account for the selected role so the app is
always demonstrable locally; set `ALLOW_DEMO_LOGIN=false` to enforce hashes only.

## 8. Frontend connection

`src/lib/api/client.ts` calls `http://localhost:8000/api/v1` in development
(override with `VITE_API_BASE_URL`) and `/api/v1` in production. If the API is
unreachable the UI transparently falls back to the bundled dataset, so the
existing pages never break; real 4xx/5xx responses surface as errors.
