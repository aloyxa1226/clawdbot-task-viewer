# Research: PATCH 422 on Kanban Drag

## Bug
Dragging tasks between Kanban columns returns HTTP 422 (Unprocessable Content).

## Root Cause
`server/src/lib/status-transitions.ts` enforces role-based transition rules. The UI sends `actor: 'al'` for all drags, but AL is restricted:
- AL **cannot** do: queued→claimed, queued→in_progress, claimed→in_progress, in_progress→review
- AL **can** do: review→done, review→in_progress, done→archived, any→queued

These rules were designed for an AI-agent workflow where AI claims/works tasks and AL reviews. But the Kanban UI needs AL to move tasks freely.

## Affected Files
- `server/src/lib/status-transitions.ts` — transition rules
- `server/src/routes/v2/tasks.ts` — PATCH /status endpoint returns 422
- `client/src/components/WorkspaceBoard.tsx` — drag handler (no changes needed)
- `client/src/lib/api.ts` — API client (no changes needed)

## Fix
Make AL a superuser: allow ALL valid status transitions regardless of role. AL owns the board.

Approach: In `isValidTransition()`, if actor is 'al', allow any transition between valid statuses.

## E2E Test Coverage Needed
No tests exist currently. Need:
1. All valid drag flows (5 columns × 4 possible destinations = 20 combinations)
2. Verify optimistic rollback on error
3. API-level tests for all actor/transition combos
