# PRD: ClawdBot Task Viewer

## Product Intent (PI) — LOCKED AFTER APPROVAL

### Problem Statement
When ClawdBot breaks down complex work into tasks, visibility is limited to the terminal session. Users need a persistent, visual dashboard to understand what ClawdBot is working on across all sessions, track task dependencies, and see historical context.

### Target Users
- ClawdBot operators (AL and anyone with the link)
- Multi-user access via link sharing (no authentication)

### Core Value Proposition
Real-time Kanban board that shows exactly what ClawdBot is doing, has done, and plans to do — with full task history and dependency visualization.

### Success Criteria
1. Tasks appear on the board within 2 seconds of ClawdBot pushing them
2. Users can see all active sessions and their tasks in one view
3. Task dependencies are clearly visualized
4. Historical tasks are searchable for 30 days
5. Zero-config deployment via Docker Compose

---

## Technical Specification (TS) — CAN EVOLVE

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│    ClawdBot     │     │           Docker Compose Stack           │
│                 │     │  ┌────────────────────────────────────┐  │
│  (pushes tasks  │────▶│  │         Node.js Server             │  │
│   via REST API) │     │  │  - REST API (task ingestion)       │  │
│                 │     │  │  - SSE (real-time updates)         │  │
└─────────────────┘     │  │  - Static file serving (React)     │  │
                        │  └──────────────┬─────────────────────┘  │
                        │                 │                        │
                        │     ┌───────────┴───────────┐            │
                        │     │                       │            │
                        │  ┌──▼──────────┐  ┌────────▼────────┐   │
                        │  │ PostgreSQL  │  │     Redis       │   │
                        │  │ (history)   │  │  (pub/sub)      │   │
                        │  └─────────────┘  └─────────────────┘   │
                        │                                          │
                        │  ┌────────────────────────────────────┐  │
                        │  │            Ngrok                   │  │
                        │  │  (public tunnel to server)         │  │
                        │  └────────────────────────────────────┘  │
                        └──────────────────────────────────────────┘
```

### Tech Stack
| Layer | Technology |
|-------|------------|
| Server | Node.js + TypeScript + Express |
| Database | PostgreSQL 16 |
| Cache/PubSub | Redis 7 |
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| Build | Vite |
| Container | Docker + Docker Compose |
| Tunnel | Ngrok (free tier) |

### Data Model

#### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    project_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    task_number INTEGER NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    active_form TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    blocks UUID[],
    blocked_by UUID[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, task_number)
);

CREATE INDEX idx_tasks_session ON tasks(session_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at);
```

#### Task Files Table
```sql
CREATE TABLE task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    file_path TEXT NOT NULL,  -- Filesystem path, not inline content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_files_task ON task_files(task_id);
```

**File Storage Location:** `/data/files/{session_key}/{task_number}/{filename}`
- Mounted as Docker volume for persistence
- Auto-cleanup job deletes files when tasks expire

### API Endpoints

#### Ingestion API (ClawdBot → Viewer)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sessions` | Create or update session |
| POST | `/api/v1/sessions/:sessionKey/tasks` | Create or update task |
| POST | `/api/v1/sessions/:sessionKey/tasks/:taskNumber/files` | Attach file to task |
| DELETE | `/api/v1/sessions/:sessionKey` | Delete session and tasks |
| DELETE | `/api/v1/sessions/:sessionKey/tasks/:taskNumber` | Delete specific task |

#### Query API (Frontend → Server)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sessions` | List all sessions |
| GET | `/api/v1/sessions/:sessionKey` | Get session details |
| GET | `/api/v1/sessions/:sessionKey/tasks` | Get tasks for session |
| GET | `/api/v1/tasks` | Get all tasks (with filters) |
| GET | `/api/v1/tasks/search` | Search tasks |
| GET | `/api/v1/events` | SSE stream for real-time updates |

#### Request/Response Examples

**Create/Update Task:**
```json
POST /api/v1/sessions/abc123/tasks
{
    "taskNumber": 1,
    "subject": "Implement user authentication",
    "description": "Add JWT-based auth with refresh tokens",
    "activeForm": "Setting up auth middleware",
    "status": "in_progress",
    "priority": 1,
    "blocks": [2, 3],
    "blockedBy": [],
    "metadata": {
        "estimatedMinutes": 30,
        "tags": ["auth", "security"]
    }
}
```

**SSE Event Stream:**
```
event: task_created
data: {"sessionKey":"abc123","task":{...}}

event: task_updated  
data: {"sessionKey":"abc123","task":{...}}

event: session_activity
data: {"sessionKey":"abc123","lastActivity":"2026-01-27T21:00:00Z"}
```

### Frontend Components

#### Layout
- **Header:** Logo, search bar, connection status indicator
- **Sidebar:** Session list with activity indicators
- **Main:** Kanban board with columns (Pending, In Progress, Completed)
- **Detail Panel:** Slide-out panel for task details

#### Kanban Columns
- **Pending:** Tasks not yet started
- **In Progress:** Active tasks (highlighted)
- **Completed:** Done tasks (auto-collapse after 24h)

#### Features
- Real-time updates via SSE
- Task dependency visualization (lines/arrows)
- Fuzzy search across sessions and tasks
- Dark/light mode toggle
- Session filtering (active only, date range)
- Task detail view with files and history

### Auto-Cleanup

Cron job running daily at 3 AM:
```sql
-- Delete tasks older than 30 days
DELETE FROM tasks 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete orphaned sessions (no tasks)
DELETE FROM sessions 
WHERE id NOT IN (SELECT DISTINCT session_id FROM tasks);

-- Delete orphaned files
DELETE FROM task_files
WHERE task_id NOT IN (SELECT id FROM tasks);
```

### Docker Compose Structure

```yaml
services:
  server:
    build: .
    ports:
      - "3456:3456"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/taskviewer
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=taskviewer
      - POSTGRES_PASSWORD=postgres

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  ngrok:
    image: ngrok/ngrok:latest
    environment:
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN:-}
    command: http server:3456
    ports:
      - "4040:4040"

volumes:
  postgres_data:
  redis_data:
```

### Security Considerations
- No authentication (link-based access)
- Rate limiting on ingestion API (100 req/min per session)
- Input validation and sanitization
- File size limit: 1MB per file, 10MB per task
- SQL injection prevention via parameterized queries

### Performance Targets
- Task creation to UI update: < 2 seconds
- Search response: < 500ms
- Dashboard load: < 3 seconds
- Support 1000+ tasks without degradation

---

## Non-Goals (Out of Scope)
- Task creation from UI (ClawdBot owns task lifecycle)
- User authentication
- Multi-tenant isolation
- Mobile-specific UI
- Task editing from UI (observation-only, like L1AD viewer)

---

## Resolved Questions
1. **Task deletion:** Allowed from UI only for tasks in "pending" status (not yet started)
2. **File storage:** Filesystem with path references in DB (not inline)
3. **Ngrok URL:** Free tier with random URLs is acceptable

---

## Approval

- [ ] AL approves Product Intent
- [ ] Technical Specification reviewed

Once PI is approved, it locks. TS can evolve during implementation.
