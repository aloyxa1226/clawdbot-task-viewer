# PRD: Bug Fix — PATCH 422 on Kanban Drag

## PRODUCT INTENT (PI)

### Problem Statement
Dragging tasks between columns on the Kanban board fails with HTTP 422. Users cannot change task status via drag-and-drop.

### Classification
Bug Fix

### Success Criteria
1. AL can drag any task to any column without errors
2. Status transitions via drag reflect immediately on the board
3. All drag flows covered by E2E tests
4. AI and system actors retain their existing restricted transitions

## TECHNICAL SPEC (TS)

### Changes

#### Bead 1: Fix AL Superuser Transitions
**Files:** `server/src/lib/status-transitions.ts`
- Make `isValidTransition()` return `true` for actor `'al'` for any from→to combo (except same status)
- Update `getAllowedTransitions()` for `'al'` to return all statuses except current
- Keep AI and system rules unchanged

#### Bead 2: E2E Tests for Status Transitions
**Files:** `server/src/__tests__/status-transitions.test.ts` (CREATE), `package.json` (add test script + vitest)
- Unit tests for `isValidTransition()` covering all actor × from × to combos
- Unit tests for `getAllowedTransitions()` 
- API integration tests for PATCH /api/v2/tasks/:id/status with all drag scenarios

### Acceptance Criteria
- [ ] AL can transition from any status to any other status
- [ ] AI transitions unchanged (queued→claimed, claimed→in_progress, etc.)
- [ ] System transitions unchanged
- [ ] All tests pass
- [ ] Typecheck passes
- [ ] Build passes
