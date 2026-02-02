-- ClawdBot Task Viewer Database Schema (v2)

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    project_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces Table (v2)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    task_number INTEGER NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    active_form TEXT,
    status VARCHAR(50) DEFAULT 'queued',
    priority INTEGER DEFAULT 0,
    blocks UUID[],
    blocked_by UUID[],
    metadata JSONB DEFAULT '{}'::jsonb,
    template_type VARCHAR(50),
    template_data JSONB DEFAULT '{}'::jsonb,
    assigned_to VARCHAR(20) DEFAULT 'unassigned',
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);

-- Task Files Table
CREATE TABLE IF NOT EXISTS task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_files_task ON task_files(task_id);

-- Task Activity Table (v2)
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

-- Briefings Table (v2)
CREATE TABLE IF NOT EXISTS briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);

-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed default workspaces
INSERT INTO workspaces (slug, name, color) VALUES
    ('celito', 'Celito', '#3b82f6'),
    ('opendots', 'OpenDots.ai', '#f59e0b'),
    ('personal', 'Personal', '#10b981')
ON CONFLICT (slug) DO NOTHING;
