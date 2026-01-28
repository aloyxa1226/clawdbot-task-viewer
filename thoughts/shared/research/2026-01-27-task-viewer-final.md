# Research: ClawdBot Task Viewer

**Date:** 2026-01-27  
**Task Type:** Greenfield  
**Iteration:** v1 (final)

---

## Problem Statement

When ClawdBot breaks down complex work into tasks, visibility is limited to the terminal session. Users need a persistent, visual dashboard to:
- See what ClawdBot is working on across all sessions
- Track task dependencies and understand blocking relationships
- View historical task data with file attachments
- Access the dashboard from anywhere via public URL

---

## Reference Implementation

**Source:** https://github.com/L1AD/claude-task-viewer

### What It Does
- Real-time Kanban board for Claude Code tasks
- Watches `~/.claude/tasks/` directory
- SSE (Server-Sent Events) for live updates
- Session discovery and task visualization
- Dependency tracking (blocks/blockedBy)
- Delete pending tasks

### Architecture
- **Server:** Node.js + Express
- **Real-time:** SSE via filesystem watching
- **Storage:** JSON files on disk (~/.claude/tasks/)
- **Frontend:** React (assumed from screenshot)
- **Deployment:** `npx claude-task-viewer` (local only)

### Limitations for Our Use Case
1. **Filesystem-based** — Only works locally, no persistence
2. **Claude Code specific** — Reads from ~/.claude/tasks/, not a generic API
3. **No database** — No historical retention, no search
4. **No file attachments** — Tasks are text-only
5. **Local only** — No public access (no ngrok/tunnel)

---

## Requirements (From AL)

### Scope
- **ClawdBot-specific** — ClawdBot pushes tasks via REST API (not filesystem watching)
- **Multi-user** — Link-based access, no authentication

### Persistence
- **PostgreSQL** — Historical data with 30-day rolling retention
- **File attachments** — Store on filesystem, paths in DB
- **Auto-cleanup** — Cron job to purge old data

### Real-time
- **Redis pub/sub** — For SSE updates across clients

### Deployment
- **Docker Compose** — Single-command deployment
- **Ngrok** — Public URL (free tier, random URL acceptable)
- **Target:** ClawdBot server

### Tech Stack (Specified by AL)
- Node.js + TypeScript
- PostgreSQL 16
- Redis 7
- React 18
- TailwindCSS + shadcn/ui
- Docker + Docker Compose
- Ngrok

---

## Technical Considerations

### API Design (ClawdBot → Viewer)
```
POST /api/v1/sessions/:sessionKey/tasks
{
  taskNumber: number,
  subject: string,
  description?: string,
  activeForm?: string,
  status: 'pending' | 'in_progress' | 'completed',
  blocks?: number[],
  blockedBy?: number[]
}
```

### Data Model
- **Sessions:** id, session_key, name, project_path, timestamps
- **Tasks:** id, session_id, task_number, subject, description, status, blocks, blocked_by, timestamps
- **Task Files:** id, task_id, filename, content_type, file_path

### Real-time Flow
```
ClawdBot → REST API → PostgreSQL + Redis PUBLISH
                              ↓
                    SSE clients ← Redis SUBSCRIBE
```

### UI Structure
- Sidebar: Session list with activity indicators
- Main: Kanban board (Pending → In Progress → Completed)
- Detail panel: Task details, files, dependencies

### Constraints
- Task deletion only for `pending` status (observation-focused)
- File storage on filesystem (not inline in DB)
- Ngrok free tier = random URLs on restart

---

## Open Questions

None blocking. All scope questions resolved with AL.

---

## Success Criteria

1. Tasks appear on board within 2 seconds of push
2. All sessions visible in sidebar with activity indicators
3. Task dependencies visualized (blocks/blockedBy)
4. Historical tasks searchable for 30 days
5. Zero-config Docker Compose deployment
6. Public access via Ngrok tunnel

---

## Recommendation

Proceed to PRD. All requirements clear, tech stack defined, reference implementation understood.
