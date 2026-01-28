# Ngrok Tunnel Implementation

## Overview
The ClawdBot Task Viewer now includes automatic public URL generation using Ngrok tunnels.

## Implementation Details

### Files Added/Modified
- `server/src/ngrok/index.ts` - Ngrok tunnel management module
- `server/src/index.ts` - Updated to integrate Ngrok tunnel creation
- `docker-compose.yml` - Added `NGROK_AUTHTOKEN` environment variable support
- `server/package.json` - Added `ngrok@5.0.0-beta.2` dependency

### Features
- ✅ Automatic tunnel creation on server startup
- ✅ Public URL displayed in console output
- ✅ Application accessible via Ngrok URL
- ✅ Graceful tunnel cleanup on shutdown
- ✅ Health check endpoint includes tunnel status
- ✅ Optional authentication token support
- ✅ Error handling for Ngrok failures

### Usage

#### Development
```bash
# Start server with tunnel
npm run dev:server

# Output will show:
# ✅ Database pool created
# ✅ Redis connected
# 🚀 Server running on http://localhost:3456
# 🔍 Health check: http://localhost:3456/api/health
# 🆓 No NGROK_AUTHTOKEN provided - using free tunnel
# 🌐 Ngrok tunnel created successfully!
# 🔗 Public URL: https://abc123.ngrok.io
# 📡 Application is publicly accessible at: https://abc123.ngrok.io
```

#### Production (Docker Compose)
```bash
# Set optional auth token
export NGROK_AUTHTOKEN=your_token_here

# Start stack
docker compose up

# Ngrok tunnel will be created automatically
```

#### Environment Variables
- `NGROK_AUTHTOKEN` (optional) - Ngrok auth token for enhanced features
- If not provided, uses free tier with random URLs

### API Integration
The health check endpoint now includes tunnel status:

```json
GET /api/health
{
  "status": "healthy",
  "timestamp": "2026-01-27T22:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "tunnel": {
    "url": "https://abc123.ngrok.io",
    "active": true
  }
}
```

### Error Handling
- If Ngrok fails to start, the application continues running locally
- Console shows appropriate warnings
- Tunnel status is reflected in health check endpoint

## Acceptance Criteria Status
- ✅ On startup, the application creates an Ngrok tunnel
- ✅ The public URL is displayed in the console output  
- ✅ The application remains accessible via the Ngrok URL
- ✅ Typecheck passes
