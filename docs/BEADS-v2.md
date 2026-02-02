# BEADS-v2: ClawdBot Task Viewer v2 — Bead Breakdown

**PRD:** [`docs/PRD-v2.md`](./PRD-v2.md)  
**Research:** [`thoughts/shared/research/v2-operations-dashboard.md`](../thoughts/shared/research/v2-operations-dashboard.md)  
**Created:** 2026-01-29  

---

## Coverage Matrix

| User Story | Beads |
|------------|-------|
| US-100 (Workspaces) | B-200, B-210, B-220 |
| US-101 (Async Work Queue) | B-200, B-210, B-230 |
| US-102 (Templates) | B-200, B-250 |
| US-103 (Activity Timeline) | B-200, B-240 |
| US-104 (Briefing) | B-270 |
| US-105 (AI API) | B-260 |
| US-106 (Dashboard) | B-280 |
| US-107 (Data Migration) | B-200 |

## Wave Overview

| Wave | Beads | Parallelizable |
|------|-------|----------------|
| 1 | B-200 (DB + Migration), B-201 (V2 Router Scaffold + Shared Types) | Yes |
| 2 | B-210 (Workspace API + UI), B-230 (Status Transitions API), B-240 (Activity Logging) | Yes (all depend on Wave 1) |
| 3 | B-220 (Workspace Board UI), B-250 (Templates), B-260 (AI API) | Yes (all depend on Wave 2) |
| 4 | B-270 (Briefing), B-280 (Dashboard) | Yes (both depend on Wave 3) |

---

## Wave 1 — Foundation (No Dependencies)

### B-200: Database Migration & Schema

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-107, Technical Specification → Database Schema
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Technical Approach → Database changes

**Research Context:**
- V1 schema has `sessions`, `tasks`, `task_files` tables. Tasks have statuses: `backlog`, `pending`, `in_progress`, `blocked`, `completed`.
- V1 tasks have `session_id` FK (NOT NULL, CASCADE). New tasks may not have sessions, so `session_id` must become nullable.
- V1 has no `workspaces`, `task_activity`, or `briefings` tables.
- Status mapping needed: `pending` → `queued`, `in_progress` → `in_progress`, `completed` → `done`, `backlog` → `queued`, `blocked` → `queued`.
- PRD specifies `template_data JSONB DEFAULT '{}'` — use `'{}'::jsonb` not `'{}'`.

**Acceptance Criteria:**
- [ ] `workspaces` table created with columns: `id` (UUID PK), `slug` (unique varchar 50), `name` (varchar 100), `color` (varchar 7), `icon` (varchar 50 nullable), `created_at` (timestamptz)
- [ ] Three workspaces seeded: `celito` (#3b82f6), `opendots` (#f59e0b), `personal` (#10b981)
- [ ] `tasks` table gains columns: `workspace_id` (FK NOT NULL after migration), `template_type` (varchar 50), `template_data` (JSONB), `assigned_to` (varchar 20 default 'unassigned'), `review_notes` (text)
- [ ] All existing tasks get `workspace_id` = personal workspace ID
- [ ] Status mapping: `pending`→`queued`, `completed`→`done`, `backlog`→`queued`, `blocked`→`queued`. Others preserved.
- [ ] `session_id` FK on tasks becomes nullable
- [ ] `task_activity` table created with indexes on `task_id` and `created_at`
- [ ] `briefings` table created with index on `date`
- [ ] Migration is idempotent (can run on fresh DB or existing v1 DB)
- [ ] Typecheck passes

**Files List:**
- `CREATE: server/src/db/migrations/001-v2-schema.sql`
- `MODIFY: server/src/db/schema.sql` — add v2 tables to reference schema
- `MODIFY: server/src/db/index.ts` — add migration runner function

**Must-Haves:**
- **truths:** Migration is idempotent. V1 data is never deleted. All existing tasks land in `personal` workspace.
- **artifacts:** `001-v2-schema.sql` migration script, updated `schema.sql`
- **key_links:** None (foundation bead)

---

### B-201: V2 Router Scaffold & Shared Types

**Context Links:**
- PRD: `docs/PRD-v2.md` → Technical Specification → API Endpoints, Architecture Changes
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Technical Approach

**Research Context:**
- V1 routes are mounted at `/api/v1/sessions` and `/api/v1` (files). V1 must be preserved.
- Server entry point is `server/src/index.ts` which mounts routers from `server/src/routes/`.
- Server types are in `server/src/types/task.ts` and `server/src/types.ts`.
- Client types are in `client/src/types/task.ts`.
- Need shared type definitions for v2: Workspace, v2 Task (with new fields), TaskActivity, Briefing, template schemas.
- AI API needs `X-API-Key` auth middleware.

**Acceptance Criteria:**
- [ ] `server/src/routes/v2/` directory created with empty router files for each domain
- [ ] V2 base router mounted at `/api/v2` in server entry point
- [ ] V1 routes continue to work unchanged
- [ ] Server-side v2 types defined: `Workspace`, `V2Task`, `TaskActivity`, `Briefing`, `TemplateType`, template data schemas
- [ ] Client-side v2 types defined matching server types
- [ ] AI API key auth middleware created (checks `X-API-Key` header against `AI_API_KEY` env var)
- [ ] Status transition validator utility created (maps valid transitions per actor)
- [ ] Typecheck passes

**Files List:**
- `CREATE: server/src/types/v2.ts` — all v2 type definitions
- `CREATE: server/src/routes/v2/index.ts` — v2 router aggregator
- `CREATE: server/src/routes/v2/workspaces.ts` — empty scaffold
- `CREATE: server/src/routes/v2/tasks.ts` — empty scaffold
- `CREATE: server/src/routes/v2/activity.ts` — empty scaffold
- `CREATE: server/src/routes/v2/ai.ts` — empty scaffold
- `CREATE: server/src/routes/v2/dashboard.ts` — empty scaffold
- `CREATE: server/src/routes/v2/briefings.ts` — empty scaffold
- `CREATE: server/src/middleware/ai-auth.ts` — API key auth middleware
- `CREATE: server/src/lib/status-transitions.ts` — status transition validator
- `CREATE: client/src/types/v2.ts` — client-side v2 types
- `MODIFY: server/src/index.ts` — mount v2 router

**Must-Haves:**
- **truths:** V1 routes are never broken. All v2 routes live under `/api/v2`. AI auth middleware returns 401 without valid key.
- **artifacts:** Router scaffold, type definitions, auth middleware, status transition validator
- **key_links:** None (foundation bead)

---

## Wave 2 — Core APIs (Depends on Wave 1)

### B-210: Workspace API

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-100 (Workspaces)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Workspaces section

**Research Context:**
- Workspaces are simple CRUD with seed data. `GET /api/v2/workspaces` must return task counts per status per workspace.
- Workspace slug is used in URLs (`/w/celito`). Queries should look up by slug, not ID.
- Task count aggregation: `SELECT w.*, COUNT(t.id) FILTER (WHERE t.status = 'queued') as queued_count, ...` per status.

**Acceptance Criteria:**
- [ ] `GET /api/v2/workspaces` returns all workspaces with task count per status
- [ ] `GET /api/v2/workspaces/:slug` returns single workspace with task counts
- [ ] `GET /api/v2/workspaces/:slug/tasks` returns tasks filtered by workspace, supports `?status=` filter
- [ ] 404 returned for unknown workspace slug
- [ ] Typecheck passes

**Files List:**
- `MODIFY: server/src/routes/v2/workspaces.ts` — implement workspace endpoints
- `MODIFY: server/src/routes/v2/tasks.ts` — implement workspace-scoped task list

**Must-Haves:**
- **truths:** Every task belongs to exactly one workspace. Workspace slugs are unique and URL-safe.
- **artifacts:** Working workspace API endpoints
- **key_links:** Depends on B-200 (tables), B-201 (router scaffold, types)

---

### B-230: Task Status Transitions API

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-101 (Async Work Queue)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Async Work Queue

**Research Context:**
- Status state machine: `queued→claimed(AI)`, `claimed→in_progress(AI)`, `in_progress→review|queued(AI)`, `review→done|in_progress(AL)`, `done→archived(either)`, `any→queued(either)`.
- V1 has no transition validation — tasks can be moved freely via drag-and-drop. V2 must enforce server-side.
- `PATCH /api/v2/tasks/:id/status` body: `{ status, actor }`. Returns 422 with explanation on invalid transition.
- Each status change must auto-create an activity log entry (integration with B-240).
- `assigned_to` should auto-update: `claimed`/`in_progress` → `ai`, `review` → `al`, `queued` → `unassigned`.

**Acceptance Criteria:**
- [ ] `POST /api/v2/tasks` creates task with `workspace_id`, optional `template_type`/`template_data`, defaults to `queued` + `assigned_to: ai`
- [ ] `GET /api/v2/tasks/:id` returns task with all v2 fields
- [ ] `PATCH /api/v2/tasks/:id` updates task fields (subject, description, priority, etc.)
- [ ] `PATCH /api/v2/tasks/:id/status` validates transitions per actor, returns 422 on invalid
- [ ] `assigned_to` auto-updates based on status transition
- [ ] Each status change creates an activity log entry with `{ from, to }` details
- [ ] `DELETE /api/v2/tasks/:id` soft-deletes (sets status to `archived`)
- [ ] Typecheck passes

**Files List:**
- `MODIFY: server/src/routes/v2/tasks.ts` — implement task CRUD + status transition endpoint
- `MODIFY: server/src/lib/status-transitions.ts` — may need refinements based on implementation

**Must-Haves:**
- **truths:** Status transitions are enforced server-side. Invalid transitions return 422. Every status change logs activity.
- **artifacts:** Working task CRUD + status transition API
- **key_links:** Depends on B-200 (tables), B-201 (types, transition validator). Activity logging requires B-240 to be complete for full integration, but can stub the log insert directly.

---

### B-240: Activity Logging API

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-103 (Activity Timeline)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Activity Log / Timeline

**Research Context:**
- `task_activity` table stores all events. Actor is `al`, `ai`, or `system`.
- Actions: `created`, `status_changed`, `assigned`, `commented`, `template_updated`.
- `GET /api/v2/tasks/:id/activity` — paginated, default 50, max 200, ordered by `created_at` desc.
- `GET /api/v2/activity?workspace_id=X&since=TIMESTAMP` — cross-task query for briefing generation.
- Need a reusable `logActivity(taskId, actor, action, details)` helper that other routes can call.

**Acceptance Criteria:**
- [ ] `logActivity()` utility function that inserts into `task_activity` and publishes SSE event
- [ ] `POST /api/v2/tasks/:id/activity` allows adding manual entries (comments/notes)
- [ ] `GET /api/v2/tasks/:id/activity` returns paginated entries, ordered by `created_at` desc
- [ ] `GET /api/v2/activity?workspace_id=X&since=TIMESTAMP` returns cross-task activity
- [ ] Activity entries include `actor`, `action`, `details` (JSONB), `created_at`
- [ ] Pagination via `?limit=` (default 50, max 200) and `?offset=`
- [ ] Typecheck passes

**Files List:**
- `CREATE: server/src/lib/activity.ts` — `logActivity()` helper
- `MODIFY: server/src/routes/v2/activity.ts` — implement activity endpoints
- `MODIFY: server/src/routes/v2/tasks.ts` — wire `logActivity()` into task creation and updates

**Must-Haves:**
- **truths:** Every task state transition is logged. `logActivity()` is the single entry point for all activity logging. Cross-task query supports time-range filtering.
- **artifacts:** `logActivity()` utility, activity API endpoints
- **key_links:** Depends on B-200 (tables), B-201 (types, router). B-230 will call `logActivity()`.

---

## Wave 3 — Feature APIs + Client (Depends on Wave 2)

### B-220: Workspace UI + Board Refactor

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-100 (Workspaces, UI criteria), US-101 (Kanban columns)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Client changes

**Research Context:**
- Current App.tsx is a single-page Kanban with session sidebar. Needs React Router for `/w/:slug` routes.
- V1 columns: `backlog`, `pending`, `in_progress`, `blocked`, `completed`. V2: `queued`, `claimed`, `in_progress`, `review`, `done`.
- Sidebar currently shows session list — replace with WorkspaceSwitcher showing 3 workspaces with color dots.
- Keyboard shortcuts `Cmd/Ctrl+1/2/3` for workspace switching.
- URL must reflect current workspace: `/w/celito`, `/w/opendots`, `/w/personal`.
- Need `react-router-dom` for client-side routing.

**Acceptance Criteria:**
- [ ] React Router installed and configured with routes: `/` (dashboard), `/w/:slug` (board), `/w/:slug/task/:id` (detail), `/briefing` (briefing)
- [ ] WorkspaceSwitcher component in sidebar shows all workspaces with color indicators
- [ ] Clicking workspace switches board view and updates URL
- [ ] `Cmd/Ctrl+1/2/3` keyboard shortcuts switch workspaces
- [ ] Kanban board shows v2 status columns: queued, claimed, in_progress, review, done
- [ ] Board fetches tasks from `GET /api/v2/workspaces/:slug/tasks`
- [ ] Drag-and-drop updates status via `PATCH /api/v2/tasks/:id/status`
- [ ] TaskCard shows workspace color badge and `assigned_to` indicator
- [ ] Current workspace reflected in URL (`/w/celito`, etc.)
- [ ] Typecheck passes

**Files List:**
- `CREATE: client/src/components/WorkspaceSwitcher.tsx`
- `CREATE: client/src/components/WorkspaceBoard.tsx` — workspace-scoped Kanban view
- `CREATE: client/src/hooks/useWorkspaces.ts` — fetch workspaces hook
- `CREATE: client/src/hooks/useTasks.ts` — fetch workspace tasks hook
- `CREATE: client/src/lib/api.ts` — v2 API client helpers
- `MODIFY: client/src/App.tsx` — add React Router, replace session-based layout
- `MODIFY: client/src/types/v2.ts` — may need additions
- `MODIFY: client/src/components/KanbanColumn.tsx` — support v2 statuses
- `MODIFY: client/src/components/TaskCard.tsx` — workspace badge, assigned_to indicator
- `MODIFY: client/src/components/Header.tsx` — workspace context

**Must-Haves:**
- **truths:** Workspace switching is < 1s. URL always reflects current workspace. V2 statuses are the only columns shown.
- **artifacts:** WorkspaceSwitcher, WorkspaceBoard, routing setup, updated Kanban
- **key_links:** Depends on B-210 (workspace API), B-230 (task/status API)

---

### B-250: Structured Handoff Templates

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-102 (Templates)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Structured Handoff Templates

**Research Context:**
- Five template types: `feature`, `bug`, `architecture`, `research`, `code`. Plus `null` for freeform.
- `template_data` is JSONB with type-specific schemas. Server must validate required fields per template type.
- Current TaskCreateDialog is a simple subject+description form. Needs template type selector that dynamically changes form fields.
- TaskDetailDialog must render template data in structured layout (not raw JSON).
- Template schemas have required and optional fields — server returns 400 if required fields missing.

**Acceptance Criteria:**
- [ ] `POST /api/v2/tasks` validates `template_data` against `template_type` schema — 400 on missing required fields
- [ ] Server-side template validation for all 5 types with correct required/optional fields
- [ ] TaskCreateDialog has template type selector (dropdown/tabs) that dynamically changes form
- [ ] Each template type renders its specific fields in the create form
- [ ] Freeform tasks (no template) still work with just subject + description
- [ ] TaskDetailDialog renders template data in structured, readable layout
- [ ] `template_type` and `template_data` returned in task API responses
- [ ] Typecheck passes

**Files List:**
- `CREATE: server/src/lib/template-validation.ts` — template schema validation
- `CREATE: client/src/components/TemplateForm.tsx` — dynamic template form component
- `CREATE: client/src/components/TemplateView.tsx` — structured template data display
- `MODIFY: server/src/routes/v2/tasks.ts` — add template validation to POST
- `MODIFY: client/src/components/TaskCreateDialog.tsx` — integrate TemplateForm
- `MODIFY: client/src/components/TaskDetailDialog.tsx` — integrate TemplateView

**Must-Haves:**
- **truths:** Template validation is server-side (client validation is UX only). Freeform tasks always work. Template schemas match PRD exactly.
- **artifacts:** Template validation lib, TemplateForm, TemplateView components
- **key_links:** Depends on B-201 (types), B-230 (task CRUD API)

---

### B-260: AI API Endpoints

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-105 (AI API)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → API for AI

**Research Context:**
- Four AI-specific endpoints under `/api/v2/ai/*`. All require `X-API-Key` header.
- `POST /ai/claim` — transitions `queued→claimed`, 409 if already claimed, 422 if not queued.
- `PATCH /ai/tasks/:id/progress` — update status (AI-permitted transitions only), add notes.
- `POST /ai/tasks/:id/complete` — transition to `review`, requires `review_notes`.
- `GET /ai/queue?workspace=SLUG` — queued tasks ordered by priority desc, created_at asc.
- Consistent response format: `{ ok: boolean, data?: any, error?: string }`.
- Rate limiting: 60 req/min per API key. Can use simple in-memory counter or express-rate-limit.

**Acceptance Criteria:**
- [ ] All `/api/v2/ai/*` endpoints require `X-API-Key` header, return 401 without it
- [ ] `POST /api/v2/ai/claim` transitions `queued→claimed`, sets `assigned_to: ai`, logs activity. 409 if claimed, 422 if not queued.
- [ ] `PATCH /api/v2/ai/tasks/:id/progress` updates status/notes, validates AI-only transitions, logs activity
- [ ] `POST /api/v2/ai/tasks/:id/complete` transitions to `review`, requires `review_notes`, logs activity. 422 if not `in_progress`.
- [ ] `GET /api/v2/ai/queue?workspace=SLUG` returns queued tasks ordered by priority desc, created_at asc
- [ ] All responses use `{ ok, data?, error? }` format
- [ ] Rate limiting: 60 requests/minute per API key
- [ ] Typecheck passes

**Files List:**
- `MODIFY: server/src/routes/v2/ai.ts` — implement all AI endpoints
- `CREATE: server/src/middleware/rate-limit.ts` — rate limiting middleware

**Must-Haves:**
- **truths:** AI endpoints only allow AI-permitted transitions. Auth is mandatory. Response format is consistent.
- **artifacts:** Working AI API with auth + rate limiting
- **key_links:** Depends on B-201 (auth middleware, types), B-230 (status transitions), B-240 (activity logging)

---

## Wave 4 — Dashboard & Briefing (Depends on Wave 3)

### B-270: Morning Briefing

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-104 (Briefing)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Daily Briefing View

**Research Context:**
- `POST /api/v2/briefings/generate` queries activity since last briefing (or 24h) and produces structured summary.
- Briefing content is JSONB with structure: `{ period, workspaces: [{ slug, completed, needs_review, in_progress, blockers }] }`.
- Generation must complete in < 5s for up to 100 activity entries. This is a pure SQL aggregation — no AI/LLM needed.
- `GET /api/v2/briefings/latest` and `GET /api/v2/briefings/:date` for retrieval.
- Client needs a BriefingView component at `/briefing` route.

**Acceptance Criteria:**
- [ ] `POST /api/v2/briefings/generate` queries recent activity and produces structured JSONB content
- [ ] Briefing content matches PRD structure: period, workspaces with completed/needs_review/in_progress/blockers
- [ ] `GET /api/v2/briefings/latest` returns most recent briefing
- [ ] `GET /api/v2/briefings/:date` returns briefing for specific date
- [ ] Generation completes in < 5 seconds for 100 activity entries
- [ ] BriefingView UI renders structured content with links to tasks
- [ ] Briefing accessible from `/briefing` route
- [ ] Typecheck passes

**Files List:**
- `MODIFY: server/src/routes/v2/briefings.ts` — implement briefing generation + retrieval
- `CREATE: client/src/components/BriefingView.tsx` — briefing renderer
- `MODIFY: client/src/App.tsx` — add `/briefing` and `/briefing/:date` routes

**Must-Haves:**
- **truths:** Briefing is generated from real activity data, not fabricated. Performance < 5s. Briefing links resolve to real tasks.
- **artifacts:** Briefing API, BriefingView component
- **key_links:** Depends on B-240 (activity data to query), B-210 (workspace data)

---

### B-280: Dashboard View

**Context Links:**
- PRD: `docs/PRD-v2.md` → US-106 (Dashboard)
- Research: `thoughts/shared/research/v2-operations-dashboard.md` → Dashboard home view

**Research Context:**
- Dashboard is the default route (`/`). Shows cross-workspace overview.
- `GET /api/v2/dashboard` returns: per-workspace task counts by status, all `review` items, all `in_progress`/`claimed` items, last 10 activity entries.
- UI sections: Review Queue (grouped by workspace with color), Active Work, Recent Activity feed, Quick Stats.
- Clicking any task opens detail in workspace context.
- "View Briefing" button links to `/briefing`.
- Auto-refresh via SSE on task state changes (existing SSE infrastructure can be extended).

**Acceptance Criteria:**
- [ ] Dashboard is the default route (`/`)
- [ ] `GET /api/v2/dashboard` returns aggregated cross-workspace data (counts, review items, active work, recent activity)
- [ ] Review Queue section shows all `review` tasks grouped by workspace with color
- [ ] Active Work section shows `claimed` and `in_progress` tasks
- [ ] Recent Activity feed shows last 10 entries with workspace badge
- [ ] Quick Stats per workspace shows task counts by status
- [ ] Clicking any task navigates to `/w/:slug/task/:id`
- [ ] "View Briefing" button links to latest briefing
- [ ] Dashboard auto-refreshes via SSE when task states change
- [ ] Typecheck passes

**Files List:**
- `MODIFY: server/src/routes/v2/dashboard.ts` — implement dashboard aggregation endpoint
- `CREATE: client/src/components/DashboardView.tsx` — dashboard UI
- `CREATE: client/src/components/ReviewQueue.tsx` — review queue section
- `CREATE: client/src/components/ActivityFeed.tsx` — activity feed component
- `CREATE: client/src/components/QuickStats.tsx` — workspace stats cards
- `CREATE: client/src/hooks/useDashboard.ts` — dashboard data hook
- `CREATE: client/src/hooks/useSSE.ts` — SSE hook for auto-refresh
- `MODIFY: client/src/App.tsx` — wire dashboard as default route
- `CREATE: client/src/components/ActivityTimeline.tsx` — reusable timeline (also used in TaskDetail)

**Must-Haves:**
- **truths:** Dashboard is the landing page. Review items are visible within 2 clicks from any view. SSE keeps data fresh.
- **artifacts:** Dashboard API, DashboardView + sub-components, SSE hook
- **key_links:** Depends on B-210 (workspace data), B-230 (task data), B-240 (activity data), B-270 (briefing link)

---

## Dependency Graph

```
B-200 (DB Migration)  ──┐
                         ├──► B-210 (Workspace API) ──┐
B-201 (Router/Types)  ──┤                             ├──► B-220 (Workspace UI) ──┐
                         ├──► B-230 (Status API)    ──┤                           ├──► B-280 (Dashboard)
                         │                             ├──► B-250 (Templates)      │
                         ├──► B-240 (Activity API)  ──┤                           │
                                                       ├──► B-260 (AI API)        │
                                                       │                           │
                                                       └──► B-270 (Briefing) ─────┘
```

## Estimated Effort

| Bead | Estimate | Complexity |
|------|----------|------------|
| B-200 | 1-2h | Medium (SQL, idempotency) |
| B-201 | 1-2h | Low (scaffolding, types) |
| B-210 | 1-2h | Low (simple CRUD) |
| B-230 | 2-3h | Medium (state machine, validation) |
| B-240 | 1-2h | Low-Medium (CRUD + utility) |
| B-220 | 2-3h | High (routing refactor, UI overhaul) |
| B-250 | 2-3h | Medium (dynamic forms, validation) |
| B-260 | 1-2h | Medium (auth, rate limiting) |
| B-270 | 2-3h | Medium (aggregation + UI) |
| B-280 | 2-3h | Medium-High (aggregation + multi-component UI) |
| **Total** | **~15-25h** | |
