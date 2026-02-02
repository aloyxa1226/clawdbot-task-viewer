// V2 Type Definitions

export type V2Status = 'queued' | 'claimed' | 'in_progress' | 'review' | 'done' | 'archived';
export type Actor = 'al' | 'ai' | 'system';
export type AssignedTo = 'al' | 'ai' | 'unassigned';
export type TemplateType = 'feature' | 'bug' | 'architecture' | 'research' | 'code';
export type ActivityAction = 'created' | 'status_changed' | 'assigned' | 'commented' | 'template_updated';

// Template data schemas
export interface FeatureTemplateData {
  problem: string;
  success_criteria: string;
  constraints?: string;
  references?: string[];
}

export interface BugTemplateData {
  what_broken: string;
  repro_steps: string;
  expected: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ArchitectureTemplateData {
  context: string;
  options: string[];
  tradeoffs?: string;
  recommendation_needed: boolean;
}

export interface ResearchTemplateData {
  question: string;
  scope: string;
  depth: 'quick' | 'deep';
  output_format: string;
}

export interface CodeTemplateData {
  repo: string;
  branch?: string;
  description: string;
  acceptance_criteria: string;
  files?: string[];
}

export type TemplateData =
  | FeatureTemplateData
  | BugTemplateData
  | ArchitectureTemplateData
  | ResearchTemplateData
  | CodeTemplateData
  | Record<string, unknown>;

// Core models
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: Date;
}

export interface V2Task {
  id: string;
  session_id: string | null;
  workspace_id: string;
  task_number: number;
  subject: string;
  description: string | null;
  active_form: string | null;
  status: V2Status;
  priority: number;
  blocks: string[];
  blocked_by: string[];
  metadata: Record<string, unknown>;
  template_type: TemplateType | null;
  template_data: TemplateData;
  assigned_to: AssignedTo;
  review_notes: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor: Actor;
  action: ActivityAction;
  details: Record<string, unknown>;
  created_at: Date;
}

export interface Briefing {
  id: string;
  date: string;
  workspace_id: string | null;
  content: BriefingContent;
  created_at: Date;
}

export interface BriefingContent {
  period: { from: string; to: string };
  workspaces: BriefingWorkspace[];
}

export interface BriefingWorkspace {
  slug: string;
  name: string;
  color: string;
  completed: Array<{ task_id: string; subject: string; summary: string }>;
  needs_review: Array<{ task_id: string; subject: string; review_notes: string }>;
  in_progress: Array<{ task_id: string; subject: string; last_activity: string }>;
  blockers: Array<{ task_id: string; subject: string; reason: string }>;
}

// API response format
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
