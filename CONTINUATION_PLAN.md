# Construction OS — Continuation Plan (Phases 3–8)

## Current State (Completed)

### Phase 1 ✅
- Full project scaffold: Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui primitives
- `wrangler.toml` with D1 + R2 bindings
- 6 SQL migrations covering all entities (users, CRM, projects, estimates, work orders, subs)
- Hono.js API backend (`functions/api/[[route]].ts`) with all route files
- Auth system: PBKDF2 password hashing + JWT (Web Crypto API, Workers-compatible)
- React shell: AuthContext, LoginPage, AppLayout, Sidebar, Topbar, Toaster
- Shared components: StatusBadge, EmptyState, ConfirmDialog, SearchInput, FileUpload/FileList
- Dashboard page with KPI cards, Recharts bar chart, task feed, activity feed
- Settings page with profile editing + admin user management

### Phase 2 ✅ (CRM)
- `ClientsPage` — searchable/filterable table, create-client dialog
- `ClientDetailPage` — tabs: Contacts (CRUD), Activity Log, Projects, Estimates
- `LeadsPage` — drag-and-drop Kanban board by stage (new/qualified/proposal/negotiation/won/lost)
- Placeholder pages for phases 3–6 (so sidebar navigation works)

---

## Remaining Work

### Phase 3 — Projects

**New files to create:**
- `src/pages/projects/ProjectsPage.tsx`
  - Filterable list/grid of all projects (status tabs + search + PM filter)
  - "New Project" button opens `ProjectForm` dialog
  - Shows: project number, name, client, status badge, contract value, PM, start date

- `src/pages/projects/ProjectDetailPage.tsx`
  - Tabs: Overview | Milestones | Tasks | Documents | Subcontractors
  - **Overview**: project metadata, edit button, ProjectTimeline (CSS Gantt strip per milestone)
  - **Milestones**: drag-sortable list (dnd-kit), inline complete checkbox, MilestoneForm dialog
  - **Tasks**: filterable by milestone/assignee/status, TaskForm dialog, priority badges
  - **Documents**: FileUpload + FileList (wired to entity_type='project')
  - **Subcontractors**: list of assigned subs with link to their detail page

**Components needed:**
- `src/components/projects/ProjectForm.tsx` — create/edit project (name, client, type, status, dates, PM, value, contract type)
- `src/components/projects/MilestoneList.tsx` + `MilestoneForm.tsx` — dnd-kit sortable, status toggle
- `src/components/projects/TaskList.tsx` + `TaskForm.tsx` — status/priority chips, assignee selector
- `src/components/projects/ProjectTimeline.tsx` — CSS horizontal bars from start_date to due_date per milestone

**Update `App.tsx`:**
- Replace placeholder routes for `/projects` and `/projects/:id` with real components

**API already built:** All project, milestone, task endpoints exist in `functions/api/routes/projects.ts`

---

### Phase 4 — Estimates

**New files to create:**
- `src/pages/estimates/EstimatesPage.tsx`
  - Status filter tabs (All / Draft / Sent / Accepted / etc.)
  - Table showing estimate number, title, client, status, total
  - "New Estimate" button

- `src/pages/estimates/EstimateDetailPage.tsx`
  - Split-panel layout: left = line-item editor, right = live EstimatePreview
  - Section management: add/rename/delete/reorder sections
  - LineItemTable: inline-editable qty, unit, unit_cost → auto-computes total_cost
  - Totals bar: subtotal, markup %, markup $, tax %, tax $, **grand total**
  - Action buttons: Save Draft / Send / Accept / Reject / Duplicate / Print
  - Print uses `window.print()` with `@media print` CSS hiding the editor panel

**Components needed:**
- `src/components/estimates/EstimateForm.tsx` — create estimate (client, title, description, markup%, tax%, terms)
- `src/components/estimates/LineItemTable.tsx` — inline editable table rows; unit enum (SF/LF/EA/LS/HR/etc.)
- `src/components/estimates/EstimatePreview.tsx` — branded proposal layout with Construct-All header, client info, sections, line items, totals, terms; `@media print` optimized
- `src/components/estimates/EstimateSummary.tsx` — totals footer component (subtotal, markup, tax, total)

**Update `App.tsx`:** Replace placeholder routes for `/estimates` and `/estimates/:id`

**API already built:** All estimate, section, and line-item endpoints exist in `functions/api/routes/estimates.ts`

---

### Phase 5 — Work Orders + Documents

**New files to create:**
- `src/pages/work-orders/WorkOrdersPage.tsx`
  - Status filter (Draft / Issued / In Progress / Pending Approval / Complete)
  - Table: WO number, title, project, client, status, priority, due date, assigned to
  - "New Work Order" button

- `src/pages/work-orders/WorkOrderDetailPage.tsx`
  - WO metadata view/edit
  - Status change controls (issue, start, complete, cancel buttons)
  - FileUpload + FileList section for attached documents
  - Approve button (for pending_approval status)

**Components needed:**
- `src/components/work-orders/WorkOrderForm.tsx` — create/edit WO (title, project selector, client, type, priority, scope, dates, cost, assignee)
- `src/components/work-orders/WorkOrderStatus.tsx` — status transition button strip

**Note on R2 uploads:** The `FileUpload` component is already built in `src/components/shared/FileUpload.tsx`. For local dev without R2, it falls back to `POST /api/documents/:id/upload` which stores to R2 via the Workers binding. In production, the presigned PUT URL flow handles it.

**Update `App.tsx`:** Replace placeholder routes for `/work-orders` and `/work-orders/:id`

---

### Phase 6 — Subcontractors

**New files to create:**
- `src/pages/subcontractors/SubcontractorsPage.tsx`
  - Trade filter dropdown + status filter + search
  - Table: company, trade, contact, rating (stars), insurance expiry (red if <30 days), status
  - "New Subcontractor" button

- `src/pages/subcontractors/SubDetailPage.tsx`
  - Tabs: Info | Bids | Projects | Documents
  - **Info**: all sub metadata, edit button, license/insurance expiry warnings
  - **Bids**: table of all bids with project links, bid amounts, status
  - **Projects**: list of projects this sub has worked on
  - **Documents**: FileUpload + FileList (W9, COI, contracts)

**Components needed:**
- `src/components/subcontractors/SubForm.tsx` — create/edit sub (company, trade, contact info, license, insurance)
- `src/components/subcontractors/SubBidForm.tsx` — record bid (project selector, trade package, amount, date, status)
- `src/components/subcontractors/TradeTag.tsx` — trade category badge with color per trade

**Update `App.tsx`:** Replace placeholder routes for `/subcontractors` and `/subcontractors/:id`

---

### Phase 7 — Polish

- Add loading skeletons (pulsing cards/rows) to all list pages that still show raw spinners
- Add proper `EmptyState` for every list/table
- Add `ConfirmDialog` to all destructive actions that still lack them (e.g. delete project, cancel WO)
- Add keyboard shortcuts: `n` to open "new" dialog on list pages, `Escape` to close dialogs
- Mobile responsiveness pass: sidebar collapse on mobile (hamburger), card-based tables on small screens
- ARIA labels on icon-only buttons
- Add `<title>` updates per page using `document.title`

---

### Phase 8 — Deployment

1. Create D1 database in Cloudflare dashboard:
   ```
   wrangler d1 create construction-os-db
   ```
   Copy the `database_id` into `wrangler.toml`

2. Create R2 bucket:
   ```
   wrangler r2 bucket create construction-os-files
   wrangler r2 bucket create construction-os-files-preview
   ```

3. Apply all migrations:
   ```
   wrangler d1 migrations apply construction-os-db
   ```

4. Set JWT secret:
   ```
   wrangler secret put JWT_SECRET
   ```

5. Seed admin user — POST to `/api/auth/setup` with:
   ```json
   {
     "username": "admin",
     "email": "admin@cacmn.com",
     "password": "...",
     "full_name": "Administrator",
     "setup_key": "<first 16 chars of JWT_SECRET>"
   }
   ```
   (Only works when no users exist)

6. Push to GitHub, connect to Cloudflare Pages:
   - Build command: `npm run build`
   - Build output: `dist`
   - Set D1 + R2 bindings in Pages project settings

7. Smoke test production:
   - Login works
   - Create a client and contact
   - Create a lead and move it on the Kanban
   - Dashboard stats show correctly

---

## Key Files Reference

| File | Purpose |
|---|---|
| `functions/api/[[route]].ts` | Hono entry — imports all route files |
| `functions/api/routes/` | One file per module (auth, users, clients, leads, projects, estimates, work-orders, documents, subcontractors, dashboard) |
| `functions/api/lib/crypto.ts` | PBKDF2 hashing + HS256 JWT via Web Crypto API |
| `functions/api/lib/db.ts` | D1 query helpers + sequential number generation |
| `functions/api/middleware/auth.ts` | JWT verification middleware + `requireRole()` |
| `src/context/AuthContext.tsx` | Global auth state, login/logout, role helpers |
| `src/lib/api.ts` | Typed `apiFetch` with auto-refresh on 401 |
| `src/lib/utils.ts` | `cn()`, `formatCurrency()`, `formatDate()`, color maps |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/components/shared/FileUpload.tsx` | R2-backed drag-drop uploader + file list |
| `migrations/` | 6 SQL files — must be applied before backend works |

## Starting a New Session

Tell Claude Code:
> "Continue building the Construction OS app from CONTINUATION_PLAN.md. Start with Phase 3 (Projects). The API routes are already built; focus on the React pages and components."
