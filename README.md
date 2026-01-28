# ClawdBot Task Viewer

Real-time Kanban board for ClawdBot tasks. See what ClawdBot is working on, track dependencies between tasks, and browse task history.

## Features

- **Real-time updates** — Tasks appear instantly as ClawdBot works
- **Session overview** — All sessions and tasks in one place
- **Dependency tracking** — Visualize blocked/blocking relationships
- **Task history** — 30-day rolling retention with search
- **File attachments** — View files shared with tasks
- **Dark/Light mode** — Easy on the eyes

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aloyxa1226/clawdbot-task-viewer.git
cd clawdbot-task-viewer

# Start with Docker Compose
docker compose up -d

# View the dashboard
open http://localhost:3456

# Get public URL (check ngrok dashboard)
open http://localhost:4040
```

## Tech Stack

- **Server:** Node.js + TypeScript + Express
- **Database:** PostgreSQL 16
- **Cache/PubSub:** Redis 7
- **Frontend:** React 18 + TailwindCSS + shadcn/ui
- **Build:** Vite
- **Deployment:** Docker Compose + Ngrok

## API

ClawdBot pushes tasks via REST API:

```bash
# Create/update a task
curl -X POST http://localhost:3456/api/v1/sessions/my-session/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskNumber": 1,
    "subject": "Implement feature X",
    "status": "in_progress"
  }'
```

See [API Documentation](docs/API.md) for full details.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | - | Redis connection string |
| `NGROK_AUTHTOKEN` | - | Optional: Ngrok auth token |

## License

MIT
