# ClawdBot Task Viewer v2: Personal Operations Dashboard

## Problem Analysis

AL runs three parallel workstreams — Celito (day job), OpenDots.ai (wife's startup), and personal projects — while spending most of his day in meetings. His AI assistant (me) does async work but there's no shared surface to coordinate. The current task viewer is a single-session Kanban board with no concept of projects, no async handoff protocol, and no way to surface "what happened while you were in meetings."

**Core problems:**
1. **No shared workspace** — AL tells me things in Discord, I do work in files. There's no dashboard where we both see the same state.
2. **Context soup** — Celito bugs, OpenDots GTM tasks, and personal SaaS ideas all live in the same mental space with no separation.
3. **No async protocol** — When AL says "look into X tonight," there's no structured way to hand off, track, or report back.
4. **Morning blindness** — AL starts each day not knowing what I did, what's blocked, or what needs his decision.

## What Existing Tools Get Right (and Wrong)

| Tool | What's Good | Why It Won't Work for AL |
|------|-------------|--------------------------|
| **Linear** | Fast keyboard-driven UI, cycles/sprints, AI triage, issue dependencies | Built for teams, not human+AI pairs. No async handoff concept. |
| **Notion** | Flexible databases, multiple views, good for docs | Too unstructured. AL needs opinionated workflows, not a blank canvas. |
| **Todoist** | Simple capture, natural language dates, projects | Too simple. No rich context, no AI integration surface. |
| **Things 3** | Areas → Projects → Tasks hierarchy, evening review | Right mental model (areas = workstreams) but no API, no AI. |
| **Reclaim.ai** | Smart scheduling, habit stacking | Good for calendar, not for async AI work queues. |

**Key insight:** Nothing exists for the "human executive + AI operator" workflow. Linear is closest in UX philosophy (fast, opinionated) but the interaction model is fundamentally different — AL isn't managing a team of humans, he's coordinating with an always-on AI that needs structured input and delivers structured output.

## Proposed Features (Prioritized)

### P0 — The Foundation (Phase 1)

**1. Workspaces (Multi-Project)**
- Three workspaces: `celito`, `opendots`, `personal`
- Each has its own board, queue, and context
- Single dashboard view that shows highlights from all three
- Quick-switch between workspaces (keyboard shortcut)

**2. Async Work Queue**
- New task states: `queued` → `claimed` → `in_progress` → `review` → `done`
- `queued` = AL dropped it, AI hasn't started
- `claimed` = AI picked it up
- `review` = AI finished, needs AL's eyes
- Tasks in `review` surface prominently — these are the "what happened overnight" items

**3. Structured Handoff Templates**
- **Feature Request**: problem statement, success criteria, constraints, relevant code/docs
- **Bug Report**: what's broken, repro steps, expected behavior, severity
- **Architecture Question**: context, options considered, tradeoffs, recommendation needed
- **Research Task**: question, scope, depth (quick scan vs. deep dive), output format
- **Code Task**: repo, branch, description, acceptance criteria, related files
- Templates are just structured JSON — AL fills what he can, AI fills the rest

**4. Daily Briefing View**
- Auto-generated each morning (or on-demand)
- Sections: What I did → What needs your input → What's coming up → Blockers
- Per-workspace breakdown
- Links directly to tasks/artifacts

### P1 — Making It Smart (Phase 2)

**5. Activity Log / Timeline**
- Every action on a task is logged: status changes, comments, file attachments, AI work sessions
- "What happened on this task?" is always answerable
- Powers the daily briefing

**6. Quick Capture**
- Discord command: `/task "Fix the auth bug in middleware" --workspace celito --priority high`
- Or just paste in Discord and I create the task with the right template
- API endpoint for programmatic task creation

**7. Decision Queue**
- Separate view for things that need AL's decision
- Binary or multiple-choice format: "Should we use approach A or B?"
- AL can approve/reject from mobile in 30 seconds
- Unblocks AI work without a full conversation

**8. File/Artifact Attachments v2**
- Link tasks to git commits, PRs, documents
- "Here's the PR I created for this task" auto-links
- Preview diffs inline

### P2 — Nice to Have (Phase 3+)

**9. Calendar Integration**
- Show meeting-free blocks where AI work could be reviewed
- Auto-schedule briefing delivery

**10. Metrics Dashboard**
- Tasks completed per week per workspace
- Average time in queue → done
- AL's decision latency (how fast he unblocks things)

**11. Recurring Tasks / Habits**
- Weekly digest compilation
- Monthly project health checks

## Technical Approach

### Build on existing stack — don't rewrite.

The current stack (Node/TS + PostgreSQL + Redis + React) is solid. Rewriting would waste weeks for no gain. Here's what changes:

**Database changes:**
```sql
-- New: workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,  -- 'celito', 'opendots', 'personal'
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),  -- hex color for UI
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify: tasks gets workspace_id, new statuses, template type
ALTER TABLE tasks
  ADD COLUMN workspace_id UUID REFERENCES workspaces(id),
  ADD COLUMN template_type VARCHAR(50),  -- 'feature', 'bug', 'architecture', 'research', 'code'
  ADD COLUMN assigned_to VARCHAR(20) DEFAULT 'unassigned',  -- 'al', 'ai', 'unassigned'
  ADD COLUMN review_notes TEXT;

-- Expand status enum: queued, claimed, in_progress, review, done, archived

-- New: activity log
CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  actor VARCHAR(20) NOT NULL,  -- 'al', 'ai', 'system'
  action VARCHAR(50) NOT NULL,  -- 'created', 'status_changed', 'commented', 'attached_file'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New: daily briefings (cached/generated)
CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  content JSONB NOT NULL,  -- structured briefing data
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API additions:**
- `GET /api/workspaces` — list workspaces
- `GET /api/workspaces/:slug/board` — kanban for one workspace
- `GET /api/dashboard` — cross-workspace highlights
- `POST /api/tasks` — enhanced with workspace_id, template_type
- `GET /api/tasks/:id/activity` — activity timeline
- `GET /api/briefing/:date` — daily briefing
- `POST /api/briefing/generate` — trigger briefing generation
- `PATCH /api/tasks/:id/decide` — quick decision endpoint

**Client changes:**
- Workspace switcher in sidebar (replace sessions sidebar)
- Dashboard home view (all workspaces at a glance)
- Task creation with template selection
- Review queue view (filtered to `status=review`)
- Briefing view (morning dashboard)
- Activity timeline on task detail

**Integration with OpenClaw/Discord:**
- New API endpoint that I (the AI) call to update task status, add activity, attach artifacts
- SSE still works for real-time — AL sees updates as I work
- Briefing gets posted to Discord each morning via the existing message system

## Phase 1 Scope (2-3 weekends of building)

Build exactly this:

1. **DB migration** — workspaces table, task table changes, activity log
2. **Workspace CRUD + seeding** — create the three workspaces
3. **Updated Kanban** — workspace-scoped, new status columns (queued → claimed → in_progress → review → done)
4. **Dashboard view** — shows review items across all workspaces, recent activity
5. **Task templates** — structured creation forms for the 5 template types
6. **Activity logging** — auto-log all state changes
7. **Briefing generator** — API that queries recent activity and produces a structured summary
8. **API for AI** — endpoints I can call to claim tasks, update status, add notes

**What Phase 1 does NOT include:** Calendar integration, metrics, recurring tasks, Discord slash commands (I can create tasks via the API directly).

## How It Works Day-to-Day

**AL's evening (10 min):**
1. Opens dashboard, quick-captures 2-3 tasks across workspaces
2. Uses templates — "Celito bug: auth middleware returning 403 for admin users"
3. Sets priority, closes laptop

**AI overnight:**
1. Checks queue via API, claims highest-priority tasks
2. Works on them, logging activity as I go
3. Moves completed work to `review` with notes + artifacts

**AL's morning (5 min):**
1. Opens briefing view — sees what I did, what needs decisions
2. Approves/rejects review items
3. Makes quick decisions on anything blocked
4. Goes to meetings knowing the state of everything

This is the loop. Everything else is optimization.
