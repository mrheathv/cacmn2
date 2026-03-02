# Cloudflare Deployment Guide — Construction OS

## Prerequisites

- Cloudflare account (free tier works)
- `wrangler` CLI installed: `npm install -g wrangler`
- Logged in: `wrangler login`
- Node.js 18+

---

## Step 1 — Create D1 Database

```bash
wrangler d1 create construction-os-db
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "construction-os-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

---

## Step 2 — Create R2 Bucket

```bash
wrangler r2 bucket create construction-os-files
wrangler r2 bucket create construction-os-files-preview   # for local dev
```

These names match the `wrangler.toml` config already in the project.

---

## Step 3 — Apply Database Migrations

Run migrations against the **remote** D1 database:

```bash
wrangler d1 execute construction-os-db --remote --file=migrations/0001_init_users.sql
wrangler d1 execute construction-os-db --remote --file=migrations/0002_crm.sql
wrangler d1 execute construction-os-db --remote --file=migrations/0003_projects.sql
wrangler d1 execute construction-os-db --remote --file=migrations/0004_estimates.sql
wrangler d1 execute construction-os-db --remote --file=migrations/0005_work_orders.sql
wrangler d1 execute construction-os-db --remote --file=migrations/0006_subcontractors.sql
```

Verify with:

```bash
wrangler d1 execute construction-os-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## Step 4 — Set Secrets

```bash
wrangler pages secret put JWT_SECRET
# Enter a strong random string (32+ chars) when prompted
# Generate one: openssl rand -base64 32
```

---

## Step 5 — Seed Admin User

After the first deployment (or locally), create the initial admin account. Call the setup endpoint **once**:

```bash
curl -X POST https://YOUR_PAGES_URL.pages.dev/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@cacmn.com","password":"ChangeMe123!","full_name":"System Admin"}'
```

This endpoint only works if zero users exist in the database (first-run guard).

For local dev:

```bash
curl -X POST http://localhost:8788/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@cacmn.com","password":"ChangeMe123!","full_name":"System Admin"}'
```

---

## Step 6 — Connect to Cloudflare Pages

### Option A: GitHub Integration (Recommended)

1. Push this repo to GitHub
2. Go to **Cloudflare Dashboard → Pages → Create a project**
3. Connect your GitHub repo
4. Configure build settings:
   - **Framework preset**: None (custom)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (default)
5. Under **Environment Variables**, add any needed vars (secrets are set via `wrangler secret put`)
6. Click **Save and Deploy**

### Option B: Direct Upload

```bash
npm run build
wrangler pages deploy dist --project-name=cacmn2-construction-os
```

---

## Step 7 — Attach D1 and R2 to Pages Project

After creating the Pages project:

1. Go to **Pages project → Settings → Bindings**
2. Add **D1 Database binding**:
   - Variable name: `DB`
   - Database: `construction-os-db`
3. Add **R2 Bucket binding**:
   - Variable name: `R2`
   - Bucket: `construction-os-files`
4. Save and trigger a new deployment (Settings → Deployments → Retry)

---

## Step 8 — Custom Domain (Optional)

1. Pages project → Custom domains → Set up a custom domain
2. Enter your domain (e.g., `app.cacmn.com`)
3. Add the CNAME record to your DNS as instructed
4. Cloudflare manages SSL automatically

---

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Copy dev vars template
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set JWT_SECRET to any string for local dev

# Apply migrations to local D1
wrangler d1 execute construction-os-db --local --file=migrations/0001_init_users.sql
wrangler d1 execute construction-os-db --local --file=migrations/0002_crm.sql
wrangler d1 execute construction-os-db --local --file=migrations/0003_projects.sql
wrangler d1 execute construction-os-db --local --file=migrations/0004_estimates.sql
wrangler d1 execute construction-os-db --local --file=migrations/0005_work_orders.sql
wrangler d1 execute construction-os-db --local --file=migrations/0006_subcontractors.sql
```

### Running Locally

You need **two terminals**:

**Terminal 1 — Vite dev server (frontend)**:
```bash
npm run dev
# Runs on http://localhost:5173
# API calls are proxied to http://localhost:8788 via vite.config.ts
```

**Terminal 2 — Wrangler Pages dev (backend)**:
```bash
npm run build && npx wrangler pages dev dist --local --port=8788
```

Or if you want hot-reload for the backend:
```bash
npx wrangler pages dev --local --port=8788
```

> Note: For local dev, R2 presigned URLs fall back to direct multipart upload via the Pages Function since local R2 doesn't support presigned URLs.

### Seed admin user locally

```bash
curl -X POST http://localhost:8788/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@cacmn.com","password":"admin123","full_name":"Admin"}'
```

---

## Environment Variables Reference

| Variable | Where | Notes |
|---|---|---|
| `JWT_SECRET` | Wrangler secret | Strong random string; used for HS256 JWT signing |
| `APP_NAME` | `wrangler.toml` [vars] | Display name, defaults to "Construction OS" |

All other config is in `wrangler.toml` (D1 binding, R2 binding, compatibility flags).

---

## Post-Deploy Checklist

- [ ] D1 migrations applied (all 6 files)
- [ ] R2 bucket created and bound
- [ ] `JWT_SECRET` set via `wrangler pages secret put`
- [ ] Admin user seeded via `/api/auth/setup`
- [ ] Can log in at production URL
- [ ] File upload works (R2 presigned URL flow)
- [ ] Estimate PDF print works (browser print dialog)

---

## Troubleshooting

**"D1_ERROR: no such table"** — Migrations weren't applied. Re-run Step 3.

**401 on all API calls** — `JWT_SECRET` not set or Pages bindings missing. Check Step 4 & 7.

**File uploads fail** — R2 binding missing or incorrect bucket name. Check Step 7.

**Pages Function returns 500** — Check **Pages → project → Functions → Logs** in Cloudflare dashboard.

**Build fails** — Run `npm run build` locally first to catch TypeScript errors before pushing.
