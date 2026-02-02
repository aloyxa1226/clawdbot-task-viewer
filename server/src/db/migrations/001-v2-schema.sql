-- Migration 001: v2 schema
-- Idempotent: safe to run on fresh DB or existing v1 DB

-- ============================================================
-- 1. Workspaces table
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed workspaces (idempotent via ON CONFLICT)
INSERT INTO workspaces (slug, name, color) VALUES
    ('celito', 'Celito', '#3b82f6'),
    ('opendots', 'OpenDots.ai', '#f59e0b'),
    ('personal', 'Personal', '#10b981')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. Tasks table modifications
-- ============================================================

-- Add new columns (idempotent: IF NOT EXISTS via DO block)
DO $$
BEGIN
    -- workspace_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'workspace_id') THEN
        ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
    END IF;

    -- template_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'template_type') THEN
        ALTER TABLE tasks ADD COLUMN template_type VARCHAR(50);
    END IF;

    -- template_data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'template_data') THEN
        ALTER TABLE tasks ADD COLUMN template_data JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- assigned_to
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to VARCHAR(20) DEFAULT 'unassigned';
    END IF;

    -- review_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'review_notes') THEN
        ALTER TABLE tasks ADD COLUMN review_notes TEXT;
    END IF;
END $$;

-- Migrate existing tasks to personal workspace
UPDATE tasks
SET workspace_id = (SELECT id FROM workspaces WHERE slug = 'personal')
WHERE workspace_id IS NULL;

-- Set workspace_id NOT NULL (idempotent: check if already NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'workspace_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;
    END IF;
END $$;

-- Make session_id nullable (idempotent: check if currently NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'session_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE tasks ALTER COLUMN session_id DROP NOT NULL;
    END IF;
END $$;

-- Status mapping: pending→queued, completed→done, backlog→queued, blocked→queued
UPDATE tasks SET status = 'queued' WHERE status IN ('pending', 'backlog', 'blocked');
UPDATE tasks SET status = 'done' WHERE status = 'completed';

-- Index on workspace_id
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);

-- ============================================================
-- 3. Task Activity table
-- ============================================================
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    actor VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON task_activity(created_at);

-- ============================================================
-- 4. Briefings table
-- ============================================================
CREATE TABLE IF NOT EXISTS briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);

-- ============================================================
-- 5. Schema migrations tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001-v2-schema')
ON CONFLICT (version) DO NOTHING;
