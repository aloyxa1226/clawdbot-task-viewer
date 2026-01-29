# Research: ClawdBot Task Viewer UI Overhaul

**Date:** 2026-01-28  
**Author:** Agent  
**Status:** COMPLETE

---

## 1. Problem Statement

AL's request: Transform the Task Viewer from a "developer tool" into a "product dashboard" inspired by Auto-Claude's Kanban aesthetic.

Key ask:
- Shift from "log viewer" to "control center"
- Build user trust through professional, organized appearance
- Reduce eye strain for extended monitoring sessions

---

## 2. Current Codebase Analysis

### 2.1 File Structure

```
client/src/
├── App.tsx              # Main app with inline Kanban rendering
├── index.css            # CSS variables (shadcn/ui pattern)
├── types/
│   ├── task.ts          # Task, TaskFile, Session types
│   └── session.ts       # Session type (duplicate)
├── components/
│   ├── TaskCard.tsx     # Individual task card
│   ├── TaskSearch.tsx   # Full search section with filters
│   ├── SessionsSidebar.tsx  # Left sidebar for sessions
│   ├── TaskDetailDialog.tsx # Task detail modal
│   ├── TaskEditDialog.tsx   # Edit pending tasks
│   ├── TaskCreateDialog.tsx # Create new tasks
│   └── KanbanBoard.tsx  # UNUSED - not imported anywhere
└── lib/
    └── utils.ts         # cn() utility for Tailwind merging
```

### 2.2 Current Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | Core framework |
| @radix-ui/* | Various | Primitives (Dialog, Dropdown, etc.) |
| tailwindcss | ^3.4.12 | Utility CSS |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| lucide-react | ^0.441.0 | Icons |
| class-variance-authority | ^0.7.0 | Variant handling |
| clsx + tailwind-merge | - | Class name utilities |

**Key observation:** No drag-and-drop library currently installed.

### 2.3 Current CSS Architecture

Uses shadcn/ui CSS variable pattern:
- `:root` defines light theme (currently active)
- `.dark` class defines dark theme tokens (exists but unused)
- Theme colors use HSL via `hsl(var(--color))`
- `darkMode: ["class"]` in tailwind.config.js — dark mode ready but not enabled

**Existing dark theme tokens:**
```css
.dark {
  --background: 222.2 84% 4.9%;   /* Deep blue-black */
  --foreground: 210 40% 98%;      /* Near white */
  --card: 222.2 84% 4.9%;
  --muted: 217.2 32.6% 17.5%;
  --border: 217.2 32.6% 17.5%;
  /* ... rest defined */
}
```

### 2.4 Current Component Patterns

**TaskCard.tsx:**
- Hardcoded `bg-white` (doesn't use theme variables)
- Priority as colored border (0-4 scale)
- Shows blockers/blocks icons
- Status badge with color coding
- Click handler for detail view

**SessionsSidebar.tsx:**
- Fixed 256px width (`w-64`)
- Polls sessions every 30s
- Shows activity indicator (green dot if active < 1hr)
- Uses theme variables (bg-card, text-foreground)

**TaskSearch.tsx:**
- Full-width search section
- Includes status/priority filters
- Results shown in grid below
- Takes significant vertical space

**App.tsx:**
- Inline Kanban rendering (not using KanbanBoard.tsx)
- Polls tasks every 5 seconds
- Health status block takes prime space
- Layout: min-h-screen, flex column, sidebar + main

### 2.5 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health status (DB, Redis) |
| `/api/v1/sessions` | GET | List all sessions |
| `/api/v1/sessions/:key/tasks` | GET/POST | Tasks for session |
| `/api/v1/sessions/tasks/:id` | PATCH/DELETE | Update/delete task |
| `/api/v1/tasks/search` | GET | Search tasks |
| `/api/v1/tasks/:id/files` | GET/POST/DELETE | File attachments |

---

## 3. Reference Analysis: Auto-Claude Kanban

### 3.1 Layout

- **Two-panel:** Fixed sidebar (~220px) + fluid main
- **100vh fixed:** No page scroll, columns scroll independently
- **5 columns:** Planning → In Progress → AI Review → Human Review → Done
- **Column width:** ~200-220px each

### 3.2 Color Palette

| Element | Color |
|---------|-------|
| App background | `#0D1117` (deep blue-black) |
| Sidebar | `#161B22` (slightly elevated) |
| Cards | `#21262D` (elevated surface) |
| Primary text | `#E6EDF3` (near white) |
| Muted text | `#8B949E` |
| Borders | `#30363D` |

**Column accents:**
- Planning: `#8B5CF6` (purple)
- In Progress: `#06B6D4` (cyan)
- Review: `#6366F1` (indigo)
- Done: `#10B981` (emerald)

### 3.3 Card Design

- Semi-transparent backgrounds (glassmorphism)
- Left-side priority indicator (colored bar/pip)
- Title + truncated description
- Status badge (colored pill)
- Timestamp in corner
- Hover state reveals actions

### 3.4 Visual Effects

- Glassmorphism (backdrop-blur + transparency)
- Subtle shadows for depth
- Glow effects on active items
- Pulsing LED indicators for status
- Smooth transitions on all interactions

---

## 4. Gap Analysis

| Current State | Target State | Gap |
|---------------|--------------|-----|
| Light theme default | Dark theme only | Change :root vars, remove .dark class |
| Sidebar always visible | Dropdown in header | New component, remove sidebar |
| Separate search section | Integrated in header | Move logic, remove component |
| Health block in main | LED indicators in header | New header component |
| Inline Kanban in App | Dedicated column components | Extract components |
| No drag-drop | Drag-drop within columns | Add @hello-pangea/dnd |
| `bg-white` hardcoded | Theme-aware colors | Update TaskCard |
| min-h-screen scroll | 100vh fixed layout | Change App layout |
| No timestamps on cards | Relative time visible | Add to TaskCard |
| No hover actions | Quick-action buttons | Add to TaskCard |

---

## 5. Technical Constraints

### 5.1 Must Preserve

- Task CRUD functionality
- Session filtering logic
- Real-time polling (5s tasks, 30s sessions)
- Health check display (can relocate, not remove)
- File attachments support
- Blocker/blocks visualization

### 5.2 API Limitations

- No API for task reordering within column (drag-drop = client-only)
- No API for changing status via PATCH (cross-column drag not possible without API change)
- Task edits only allowed for `pending` status

### 5.3 Browser Support

- Modern browsers only (uses CSS backdrop-blur)
- No IE11 support required

---

## 6. Recommended Approach

### 6.1 Theme Strategy

**Option A:** Replace :root with dark values, delete .dark class
**Option B:** Add `class="dark"` to html, keep both themes
**Recommendation:** Option A — simpler, dark-only per requirements

### 6.2 Component Strategy

**Refactor:**
- TaskCard.tsx → Add priority pips, timestamps, status styling, hover actions
- App.tsx → 100vh layout, remove inline Kanban

**New:**
- Header.tsx → Logo, search, session dropdown, health LEDs, actions
- KanbanColumn.tsx → Stats header, droppable area, card list

**Remove:**
- SessionsSidebar.tsx → Replaced by dropdown in Header
- TaskSearch.tsx → Integrated into Header
- KanbanBoard.tsx → Already unused, can delete

### 6.3 Dependencies to Add

```json
{
  "@hello-pangea/dnd": "^16.6.0"  // Maintained react-beautiful-dnd fork
}
```

### 6.4 Font Strategy

Option A: Google Fonts import (Inter + JetBrains Mono)
Option B: System fonts with fallback
**Recommendation:** Option A for consistency with Auto-Claude aesthetic

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing dialog styles | Medium | High | Test all dialogs after theme change |
| Performance with many cards + blur | Low | Low | Disable blur on 50+ cards |
| Drag-drop library issues | Medium | Low | @hello-pangea/dnd is well-maintained |
| Missing theme variables | Medium | Medium | Audit all hardcoded colors |

---

## 8. Success Criteria

1. Dark theme applies consistently (no white flashes, no hardcoded colors)
2. Header consolidates search, sessions, health, actions
3. Kanban columns have stats and independent scroll
4. Cards show priority pips, timestamps, hover actions
5. Drag-drop reorders tasks within columns
6. All existing functionality preserved
7. Lighthouse accessibility score ≥ 90

---

## 9. Next Step

→ Proceed to PRD with this research as foundation.
