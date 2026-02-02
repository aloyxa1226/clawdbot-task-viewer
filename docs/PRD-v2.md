# PRD: ClawdBot Task Viewer v2 — Personal Operations Dashboard

**Version:** 2.0  
**Created:** 2026-01-29  
**Status:** Draft  
**Research:** [`thoughts/shared/research/v2-operations-dashboard.md`](../thoughts/shared/research/v2-operations-dashboard.md)  
**Predecessor:** [`docs/PRD.md`](./PRD.md) (v1)

---

## Product Intent (PI)

### Problem Statement

AL runs three parallel workstreams (Celito, OpenDots.ai, personal projects) while spending most of his day in meetings. His AI assistant works asynchronously but there is no shared coordination surface. The v1 task viewer is a single-session Kanban with no concept of projects, no async handoff protocol, and no way to surface "what happened while you were away."

Specific gaps:
1. **No shared workspace** — Tasks are created in Discord or terminal sessions with no unified dashboard.
2. **Context soup** — All workstreams share one flat task space with no separation.
3. **No async protocol** — No structured way to hand off work, track AI progress, or report back.
4. **Morning blindness** — AL starts each day not knowing what the AI did, what's blocked, or what needs decision.

### Target Users

| User | Role | Interaction Pattern |
|------|------|-------------------|
| **AL** | Human executive | Evening: quick-capture tasks (10 min). Morning: review briefing, approve/reject (5 min). Mobile-friendly. |
| **AI assistant** | Async operator | Overnight: claim tasks via API, work, log activity, move to review. Structured JSON I/O. |

### Core Value Proposition

A shared operations dashboard purpose-built for human+AI pair workflows — opinionated async handoff protocol, multi-workspace separation, and a daily briefing that tells AL exactly what happened and what needs his attention.

### Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| 1 | AL can capture a task into a specific workspace in under 30 seconds | Timed user test |
| 2 | AI can claim, work, and move a task to review entirely via API | API integration test |
| 3 | Morning briefing accurately reflects all overnight activity | Briefing contains 100% of status changes from prior 24h |
| 4 | Tasks in `review` status are visible within 2 clicks from any view | UI navigation test |
| 5 | Workspace switching takes < 1 second | Client-side measurement |
| 6 | Activity log captures every task state transition with actor and timestamp | DB audit query |

### Non-Goals (Out of Scope for v2)

- User authentication / multi-tenant isolation
- Calendar integration (Phase 2)
- Metrics / analytics dashboard (Phase 2)
- Recurring tasks / habits (Phase 3)
- Discord slash commands (AI uses API directly)
- Mobile-native app (responsive web is sufficient)
- Task dependencies / blocking visualization (already in v1, maintained but not enhanced)

---

## User Stories — Phase 1

### US-100: Workspaces

**Description:** As AL, I need separate workspaces for each workstream (Celito, OpenDots, Personal) so tasks don't bleed together. As the AI, I need workspace-scoped API queries.

**Priority:** P0

**Acceptance Criteria:**
1. `workspaces` table exists with columns: `id` (UUID PK), `slug` (unique, varchar 50), `name` (varchar 100), `color` (varchar 7, hex), `icon` (varchar 50, nullable), `created_at` (timestamptz)
2. Three workspaces are seeded on first migration: `celito`, `opendots`, `personal`
3. `GET /api/v2/workspaces` returns all workspaces with task count per status
4. Every task belongs to exactly one workspace (`workspace_id` FK, NOT NULL after migration)
5. Existing v1 tasks are migrated to a `personal` workspace by default
6. UI shows a workspace switcher in the sidebar; clicking switches the board view
7. Keyboard shortcut `Cmd/Ctrl + 1/2/3` switches workspaces
8. Current workspace is reflected in the URL (`/w/celito`, `/w/opendots`, `/w/personal`)
9. Typecheck passes

---

### US-101: Async Work Queue (New Statuses)

**Description:** As the AI, I need a clear state machine for async work: `queued → claimed → in_progress → review → done`. As AL, I need to see what's waiting for me (`review`) vs. what the AI is working on (`in_progress`).

**Priority:** P0

**Acceptance Criteria:**
1. Task `status` column accepts values: `queued`, `claimed`, `in_progress`, `review`, `done`, `archived`
2. V1 status mapping migration: `pending` → `queued`, `in_progress` → `in_progress`, `completed` → `done`
3. Status transitions are validated server-side:
   - `queued` → `claimed` (AI only)
   - `claimed` → `in_progress` (AI only)
   - `in_progress` → `review` | `queued` (AI only; queued = unclaim)
   - `review` → `done` | `in_progress` (AL only; in_progress = request changes)
   - `done` → `archived` (either)
   - Any → `queued` (either; reset)
4. Kanban board shows columns for all active statuses (queued through done)
5. `assigned_to` field tracks `al`, `ai`, or `unassigned`
6. Tasks created by AL default to `queued` + `assigned_to: ai`
7. `PATCH /api/v2/tasks/:id/status` validates transitions and returns 422 on invalid transition with explanation
8. Each status change auto-creates an activity log entry (see US-103)
9. Typecheck passes

---

### US-102: Structured Handoff Templates

**Description:** As AL, I need structured templates when creating tasks so the AI gets consistent, actionable context. Five template types: feature, bug, architecture, research, code.

**Priority:** P0

**Acceptance Criteria:**
1. `template_type` column added to tasks: `feature`, `bug`, `architecture`, `research`, `code`, or `null` (freeform)
2. `template_data` JSONB column stores structured fields per template type
3. Template schemas:
   - **feature:** `{ problem: string, success_criteria: string, constraints?: string, references?: string[] }`
   - **bug:** `{ what_broken: string, repro_steps: string, expected: string, severity: 'low'|'medium'|'high'|'critical' }`
   - **architecture:** `{ context: string, options: string[], tradeoffs?: string, recommendation_needed: boolean }`
   - **research:** `{ question: string, scope: string, depth: 'quick'|'deep', output_format: string }`
   - **code:** `{ repo: string, branch?: string, description: string, acceptance_criteria: string, files?: string[] }`
4. UI task creation form changes dynamically based on selected template type
5. Template fields are validated on the server — required fields return 400 if missing
6. `POST /api/v2/tasks` accepts `template_type` and `template_data`
7. Task detail view renders template data in a structured, readable layout (not raw JSON)
8. Freeform tasks (no template) still work as before with just subject + description
9. Typecheck passes

---

### US-103: Activity Timeline

**Description:** As AL, I need to see a chronological log of everything that happened on a task — status changes, comments, AI work notes. This powers the briefing and provides audit trail.

**Priority:** P0

**Acceptance Criteria:**
1. `task_activity` table: `id` (UUID PK), `task_id` (FK), `actor` (varchar 20: `al`, `ai`, `system`), `action` (varchar 50), `details` (JSONB), `created_at` (timestamptz)
2. Actions logged automatically: `created`, `status_changed`, `assigned`, `commented`, `template_updated`
3. `status_changed` details include `{ from: string, to: string }`
4. `POST /api/v2/tasks/:id/activity` allows adding manual log entries (comments/notes)
5. `GET /api/v2/tasks/:id/activity` returns entries ordered by `created_at` desc, paginated (default 50, max 200)
6. Task detail view shows activity timeline below the task details
7. Activity entries display actor with icon (human/robot/gear), action description, timestamp (relative: "2h ago")
8. `GET /api/v2/activity?workspace_id=X&since=TIMESTAMP` returns cross-task activity for a workspace since a given time
9. Typecheck passes

---

### US-104: Morning Briefing Generator

**Description:** As AL, I want to open a briefing view that summarizes what happened overnight — organized by workspace, showing completed work, items needing review, and blockers.

**Priority:** P1

**Acceptance Criteria:**
1. `briefings` table: `id` (UUID PK), `date` (date), `workspace_id` (FK, nullable — null = cross-workspace), `content` (JSONB), `created_at` (timestamptz)
2. `POST /api/v2/briefings/generate` queries activity since last briefing (or last 24h) and produces structured summary
3. Briefing content structure:
   ```json
   {
     "period": { "from": "ISO", "to": "ISO" },
     "workspaces": [{
       "slug": "celito",
       "completed": [{ "task_id": "...", "subject": "...", "summary": "..." }],
       "needs_review": [{ "task_id": "...", "subject": "...", "review_notes": "..." }],
       "in_progress": [{ "task_id": "...", "subject": "...", "last_activity": "..." }],
       "blockers": [{ "task_id": "...", "subject": "...", "reason": "..." }]
     }]
   }
   ```
4. `GET /api/v2/briefings/latest` returns the most recent briefing
5. `GET /api/v2/briefings/:date` returns briefing for a specific date
6. Briefing view is accessible from the dashboard — shows the structured content with links to each task
7. Briefing generation completes in < 5 seconds for up to 100 activity entries
8. Typecheck passes

---

### US-105: AI API Endpoints

**Description:** As the AI assistant, I need dedicated API endpoints to claim tasks, update progress, and submit completed work — all authenticated by a simple API key.

**Priority:** P0

**Acceptance Criteria:**
1. `POST /api/v2/ai/claim` — body: `{ task_id }` — transitions task `queued → claimed`, sets `assigned_to: ai`, logs activity. Returns 409 if already claimed, 422 if not in `queued` status.
2. `PATCH /api/v2/ai/tasks/:id/progress` — body: `{ status?, notes?, review_notes? }` — updates task, logs activity. Only allows AI-permitted transitions (see US-101).
3. `POST /api/v2/ai/tasks/:id/complete` — body: `{ review_notes, artifacts?: string[] }` — transitions to `review`, sets `review_notes`, logs activity. Returns 422 if not in `in_progress`.
4. `GET /api/v2/ai/queue?workspace=SLUG` — returns tasks in `queued` status, ordered by priority desc then created_at asc. Optionally filtered by workspace.
5. All `/api/v2/ai/*` endpoints require `X-API-Key` header matching `AI_API_KEY` env var. Returns 401 without it.
6. All AI endpoints return consistent JSON: `{ ok: boolean, data?: any, error?: string }`
7. Rate limiting: 60 requests/minute per API key
8. Typecheck passes

---

### US-106: Dashboard View

**Description:** As AL, I need a single dashboard that shows highlights across all workspaces — items needing review, active AI work, recent completions — so I can get the full picture in one glance.

**Priority:** P1

**Acceptance Criteria:**
1. Dashboard is the default route (`/`)
2. `GET /api/v2/dashboard` returns aggregated data:
   - Per workspace: count of tasks by status, items in `review`
   - Global: total `review` items, total `in_progress`, total `queued`
   - Recent activity (last 10 entries across all workspaces)
3. Dashboard UI shows:
   - **Review Queue** section: all tasks in `review` across workspaces, grouped by workspace with color indicator
   - **Active Work** section: tasks in `claimed` or `in_progress`
   - **Recent Activity** feed: last 10 activity entries with workspace badge
   - **Quick Stats** per workspace: task counts by status
4. Clicking any task opens the task detail in context of its workspace
5. "View Briefing" button links to latest briefing (US-104)
6. Dashboard auto-refreshes via SSE when task states change
7. Typecheck passes

---

### US-107: Data Migration from v1

**Description:** Migrate existing v1 data (sessions, tasks, files) to v2 schema without data loss. Sessions map to workspaces conceptually but are preserved for backwards compatibility.

**Priority:** P0

**Acceptance Criteria:**
1. Migration is a single SQL script that can be run idempotently
2. `workspaces` table created and seeded with three default workspaces
3. `tasks` table gains: `workspace_id` (FK, NOT NULL after migration), `template_type`, `template_data` (JSONB), `assigned_to` (varchar 20, default `unassigned`), `review_notes` (text)
4. All existing tasks get `workspace_id` set to the `personal` workspace
5. Status mapping: `pending` → `queued`, `in_progress` → `in_progress`, `completed` → `done`. Any other values → `queued`.
6. `task_activity` and `briefings` tables created (empty — no retroactive activity generation)
7. `sessions` table is preserved; `session_id` FK on tasks remains (nullable for new tasks that don't originate from a session)
8. V1 API endpoints (`/api/v1/*`) continue to work (read-only or redirect to v2)
9. Migration script tested: runs on a fresh DB and on a DB with existing v1 data
10. Typecheck passes

---

## Technical Specification

### Architecture Changes from v1

```
v1: ClawdBot → REST API → PostgreSQL → SSE → React Kanban
v2: ClawdBot/AI API → REST API v2 → PostgreSQL → SSE → React Dashboard + Workspace Boards
                                                         ↑
                                                   Redis (pub/sub unchanged)
```

Key changes:
- **New v2 API layer** alongside v1 (v1 preserved for backward compat)
- **Workspace-scoped routing** in both API and client
- **AI-specific endpoints** with API key auth
- **Dashboard as default view** instead of single Kanban board
- **Activity logging middleware** — intercepts all task mutations

### Database Schema (Final State)

#### New Table: `workspaces`
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO workspaces (slug, name, color) VALUES
  ('celito', 'Celito', '#3b82f6'),
  ('opendots', 'OpenDots.ai', '#f59e0b'),
  ('personal', 'Personal', '#10b981');
```

#### Modified Table: `tasks`
```sql
-- New columns
ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN template_type VARCHAR(50);
ALTER TABLE tasks ADD COLUMN template_data JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN assigned_to VARCHAR(20) DEFAULT 'unassigned';
ALTER TABLE tasks ADD COLUMN review_notes TEXT;

-- Migrate statuses
UPDATE tasks SET status = 'queued' WHERE status = 'pending';
UPDATE tasks SET status = 'done' WHERE status = 'completed';

-- Set default workspace
UPDATE tasks SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'personal');
ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;

-- Make session_id nullable (new tasks may not have sessions)
ALTER TABLE tasks ALTER COLUMN session_id DROP NOT NULL;
```

#### New Table: `task_activity`
```sql
CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  actor VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON task_activity(created_at);
```

#### New Table: `briefings`
```sql
CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_briefings_date ON briefings(date);
```

### API Endpoints (Complete)

#### Workspace API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/workspaces` | List all workspaces with task counts |
| GET | `/api/v2/workspaces/:slug` | Get single workspace details |

#### Task API (v2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/workspaces/:slug/tasks` | List tasks in workspace (filterable by status) |
| POST | `/api/v2/tasks` | Create task (requires `workspace_id`, optional template) |
| GET | `/api/v2/tasks/:id` | Get task with activity |
| PATCH | `/api/v2/tasks/:id` | Update task fields |
| PATCH | `/api/v2/tasks/:id/status` | Change status (validated transitions) |
| DELETE | `/api/v2/tasks/:id` | Soft-delete (archive) |

#### Activity API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/tasks/:id/activity` | Task activity timeline |
| POST | `/api/v2/tasks/:id/activity` | Add manual activity entry |
| GET | `/api/v2/activity` | Cross-task activity (query params: `workspace_id`, `since`) |

#### AI API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/ai/queue` | Get queued tasks (optional `?workspace=slug`) |
| POST | `/api/v2/ai/claim` | Claim a queued task |
| PATCH | `/api/v2/ai/tasks/:id/progress` | Update progress / add notes |
| POST | `/api/v2/ai/tasks/:id/complete` | Move to review with notes |

#### Dashboard & Briefing API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/dashboard` | Aggregated cross-workspace data |
| POST | `/api/v2/briefings/generate` | Generate briefing from recent activity |
| GET | `/api/v2/briefings/latest` | Get most recent briefing |
| GET | `/api/v2/briefings/:date` | Get briefing for specific date |

#### Legacy (v1 — preserved)
All `/api/v1/*` endpoints remain functional. They operate within the `personal` workspace implicitly.

### Client Changes

#### New Views
- **Dashboard** (`/`) — cross-workspace overview, review queue, activity feed
- **Workspace Board** (`/w/:slug`) — Kanban with new status columns
- **Task Detail** (`/w/:slug/task/:id`) — enhanced with template view + activity timeline
- **Briefing** (`/briefing` or `/briefing/:date`) — morning summary view

#### Modified Components
- **Sidebar** — replace session list with workspace switcher + workspace colors/icons
- **KanbanColumn** — support new statuses (queued, claimed, in_progress, review, done)
- **TaskCreateDialog** — template type selector + dynamic form fields
- **TaskCard** — show workspace color badge, assigned_to indicator, template type icon
- **TaskDetailDialog** — add activity timeline section, template data display, review notes

#### New Components
- **WorkspaceSwitcher** — sidebar component with keyboard shortcuts
- **DashboardView** — review queue + active work + activity feed + stats
- **BriefingView** — structured briefing renderer
- **ActivityTimeline** — chronological activity log component
- **TemplateForm** — dynamic form that changes based on template type

### Integration Points

| System | Integration | Direction |
|--------|-------------|-----------|
| **OpenClaw** | AI calls `/api/v2/ai/*` endpoints to manage tasks | AI → Server |
| **Discord** | Briefing posted to Discord channel via OpenClaw message system | Server → Discord (via AI) |
| **SSE** | Real-time updates for all task/activity changes (existing, extended) | Server → Client |
| **Redis** | Pub/sub for SSE fan-out (existing, unchanged) | Internal |

---

## Phase Boundary

### Phase 1 — IN SCOPE (this PRD)
- ✅ Workspaces (US-100)
- ✅ Async work queue / new statuses (US-101)
- ✅ Structured handoff templates (US-102)
- ✅ Activity timeline (US-103)
- ✅ Morning briefing generator (US-104)
- ✅ AI API endpoints (US-105)
- ✅ Dashboard view (US-106)
- ✅ Data migration from v1 (US-107)

### Phase 2 — FUTURE (not spec'd)
- Quick capture via Discord slash commands
- Decision queue (binary/multiple-choice approvals)
- File/artifact attachments v2 (git commit links, PR previews)
- Calendar integration (meeting-free block detection)

### Phase 3 — FUTURE (not spec'd)
- Metrics dashboard (velocity, decision latency)
- Recurring tasks / habits
- Mobile-optimized views
- Multi-user support

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-29 | Initial v2 PRD draft |
