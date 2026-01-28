# BEADS — ClawdBot Task Viewer

## Bead Dependency Graph

```
[B1: Project Setup] ──┬──▶ [B2: Database Schema]
                      │           │
                      │           ▼
                      ├──▶ [B3: Server Core] ◀── [B2]
                      │           │
                      │           ▼
                      ├──▶ [B4: Ingestion API] ◀── [B3]
                      │           │
                      │           ▼
                      ├──▶ [B5: Real-time (SSE)] ◀── [B3]
                      │           │
                      │           ▼
                      └──▶ [B6: Frontend Core] 
                                  │
                                  ▼
                      [B7: Kanban Board] ◀── [B6]
                                  │
                                  ▼
                      [B8: Task Details] ◀── [B7]
                                  │
                                  ▼
                      [B9: Search & Filter] ◀── [B7]
                                  │
                                  ▼
                      [B10: Docker Compose] ◀── [B4, B5, B9]
                                  │
                                  ▼
                      [B11: Auto-Cleanup] ◀── [B10]
                                  │
                                  ▼
                      [B12: Integration Test] ◀── [B11]
```

---

## B1: Project Setup
**Status:** pending  
**Blocks:** B2, B3, B6  
**Estimated:** 30 min

### Deliverables
- TypeScript configuration (server + client)
- Package.json with dependencies
- Monorepo structure (src/server, src/client, src/shared)
- ESLint + Prettier config
- Vite config for React
- Basic Express server skeleton

### Files
```
package.json
tsconfig.json
tsconfig.server.json
tsconfig.client.json
vite.config.ts
.eslintrc.js
.prettierrc
src/server/index.ts (skeleton)
src/client/main.tsx (skeleton)
src/shared/types.ts
```

---

## B2: Database Schema
**Status:** pending  
**Blocked by:** B1  
**Blocks:** B3, B4  
**Estimated:** 20 min

### Deliverables
- PostgreSQL schema (sessions, tasks, task_files)
- Migration files
- Database connection module
- Type definitions matching schema

### Files
```
src/server/db/schema.sql
src/server/db/migrations/001_initial.sql
src/server/db/connection.ts
src/shared/types/db.ts
```

---

## B3: Server Core
**Status:** pending  
**Blocked by:** B1, B2  
**Blocks:** B4, B5  
**Estimated:** 45 min

### Deliverables
- Express app with middleware (CORS, JSON, error handling)
- Database pool initialization
- Redis client initialization
- Health check endpoint
- Static file serving for frontend
- Environment config module

### Files
```
src/server/app.ts
src/server/config.ts
src/server/middleware/error.ts
src/server/middleware/cors.ts
src/server/routes/health.ts
src/server/services/redis.ts
```

---

## B4: Ingestion API
**Status:** pending  
**Blocked by:** B3  
**Blocks:** B10  
**Estimated:** 60 min

### Deliverables
- Session CRUD endpoints
- Task CRUD endpoints
- File upload endpoint (multipart/form-data)
- Input validation (zod)
- Rate limiting middleware
- File storage service (filesystem)

### Endpoints
- POST `/api/v1/sessions`
- POST `/api/v1/sessions/:sessionKey/tasks`
- POST `/api/v1/sessions/:sessionKey/tasks/:taskNumber/files`
- DELETE `/api/v1/sessions/:sessionKey`
- DELETE `/api/v1/sessions/:sessionKey/tasks/:taskNumber` (pending only)

### Files
```
src/server/routes/sessions.ts
src/server/routes/tasks.ts
src/server/services/session.service.ts
src/server/services/task.service.ts
src/server/services/file.service.ts
src/server/middleware/rateLimit.ts
src/server/middleware/validate.ts
src/shared/schemas/task.schema.ts
src/shared/schemas/session.schema.ts
```

---

## B5: Real-time (SSE)
**Status:** pending  
**Blocked by:** B3  
**Blocks:** B10  
**Estimated:** 45 min

### Deliverables
- SSE endpoint with client connection management
- Redis pub/sub integration
- Event types: task_created, task_updated, task_deleted, session_activity
- Heartbeat to keep connections alive
- Publish events from ingestion API

### Files
```
src/server/routes/events.ts
src/server/services/pubsub.ts
src/shared/types/events.ts
```

---

## B6: Frontend Core
**Status:** pending  
**Blocked by:** B1  
**Blocks:** B7  
**Estimated:** 45 min

### Deliverables
- React app with TailwindCSS
- shadcn/ui setup (button, card, dialog, input, etc.)
- Layout component (header, sidebar, main)
- Theme provider (dark/light mode)
- API client with fetch wrapper
- SSE hook for real-time updates
- Basic routing (react-router)

### Files
```
src/client/App.tsx
src/client/main.tsx
src/client/index.css
src/client/components/Layout.tsx
src/client/components/Header.tsx
src/client/components/Sidebar.tsx
src/client/components/ui/* (shadcn)
src/client/hooks/useSSE.ts
src/client/hooks/useApi.ts
src/client/lib/api.ts
src/client/lib/theme.ts
tailwind.config.js
components.json (shadcn)
```

---

## B7: Kanban Board
**Status:** pending  
**Blocked by:** B6  
**Blocks:** B8, B9  
**Estimated:** 90 min

### Deliverables
- Kanban board component with three columns
- Task card component
- Session list in sidebar
- Column: Pending, In Progress, Completed
- Active task highlighting
- Session activity indicators
- Delete button for pending tasks

### Files
```
src/client/components/KanbanBoard.tsx
src/client/components/KanbanColumn.tsx
src/client/components/TaskCard.tsx
src/client/components/SessionList.tsx
src/client/components/SessionItem.tsx
src/client/pages/Dashboard.tsx
src/client/stores/tasks.ts (zustand or context)
```

---

## B8: Task Details
**Status:** pending  
**Blocked by:** B7  
**Blocks:** B9  
**Estimated:** 60 min

### Deliverables
- Task detail slide-out panel
- Dependency visualization (blocks/blocked by)
- File list with download links
- Task metadata display
- Activity history (status changes)
- Keyboard shortcut (Esc to close)

### Files
```
src/client/components/TaskDetail.tsx
src/client/components/DependencyGraph.tsx
src/client/components/FileList.tsx
src/client/components/TaskHistory.tsx
```

---

## B9: Search & Filter
**Status:** pending  
**Blocked by:** B7, B8  
**Blocks:** B10  
**Estimated:** 45 min

### Deliverables
- Search bar in header (fuzzy search)
- Search API endpoint
- Filter by session
- Filter by status
- Filter by date range
- Keyboard shortcut (/ to focus search)

### Files
```
src/client/components/SearchBar.tsx
src/client/components/FilterPanel.tsx
src/server/routes/search.ts
src/server/services/search.service.ts
```

---

## B10: Docker Compose
**Status:** pending  
**Blocked by:** B4, B5, B9  
**Blocks:** B11  
**Estimated:** 45 min

### Deliverables
- Dockerfile (multi-stage build)
- docker-compose.yml (server, db, redis, ngrok)
- Volume configuration (postgres, redis, files)
- Environment variable handling
- Health checks
- Ngrok integration

### Files
```
Dockerfile
docker-compose.yml
.env.example
scripts/init-db.sh
scripts/wait-for-it.sh
```

---

## B11: Auto-Cleanup
**Status:** pending  
**Blocked by:** B10  
**Blocks:** B12  
**Estimated:** 30 min

### Deliverables
- Cron job for 30-day cleanup
- Delete old tasks, orphaned sessions, orphaned files
- Filesystem cleanup (delete expired file directories)
- Logging for cleanup operations
- node-cron integration or external cron container

### Files
```
src/server/jobs/cleanup.ts
src/server/services/cleanup.service.ts
```

---

## B12: Integration Test
**Status:** pending  
**Blocked by:** B11  
**Estimated:** 60 min

### Deliverables
- End-to-end test: ClawdBot → API → DB → UI
- Test SSE real-time updates
- Test file upload/download
- Test task deletion (pending only)
- Test auto-cleanup
- Docker Compose test environment

### Files
```
tests/integration/e2e.test.ts
tests/integration/sse.test.ts
tests/integration/cleanup.test.ts
scripts/test-e2e.sh
```

---

## Execution Plan

### Phase 1: Foundation (B1 → B2 → B3)
Sequential — each depends on previous.

### Phase 2: API + Frontend (B4, B5, B6)
**Parallel** — B4, B5, B6 can run simultaneously after B3.

### Phase 3: UI Components (B7 → B8 → B9)
Sequential — UI builds on itself.

### Phase 4: Deployment (B10 → B11 → B12)
Sequential — containerize, then cleanup, then test.

---

## Summary

| Bead | Name | Est. Time | Dependencies |
|------|------|-----------|--------------|
| B1 | Project Setup | 30 min | - |
| B2 | Database Schema | 20 min | B1 |
| B3 | Server Core | 45 min | B1, B2 |
| B4 | Ingestion API | 60 min | B3 |
| B5 | Real-time (SSE) | 45 min | B3 |
| B6 | Frontend Core | 45 min | B1 |
| B7 | Kanban Board | 90 min | B6 |
| B8 | Task Details | 60 min | B7 |
| B9 | Search & Filter | 45 min | B7, B8 |
| B10 | Docker Compose | 45 min | B4, B5, B9 |
| B11 | Auto-Cleanup | 30 min | B10 |
| B12 | Integration Test | 60 min | B11 |

**Total estimated:** ~9.5 hours

---

## Approval

- [ ] AL approves bead breakdown
- [ ] Ready for execution
