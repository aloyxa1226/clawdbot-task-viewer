import { Bot, User, Cpu } from 'lucide-react';

export interface TimelineEntry {
  id: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  task_subject?: string;
  task_number?: number;
  workspace_slug?: string;
  workspace_name?: string;
  workspace_color?: string;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getActorIcon(actor: string) {
  switch (actor) {
    case 'ai': return <Bot className="w-3.5 h-3.5" />;
    case 'al': return <User className="w-3.5 h-3.5" />;
    default: return <Cpu className="w-3.5 h-3.5" />;
  }
}

function formatAction(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'status_changed':
      return `${details.from || '?'} → ${details.to || '?'}`;
    case 'created':
      return 'created';
    case 'assigned':
      return `assigned to ${details.assigned_to || '?'}`;
    case 'commented':
      return 'commented';
    case 'template_updated':
      return 'updated template';
    default:
      return action.replace('_', ' ');
  }
}

interface ActivityTimelineProps {
  entries: TimelineEntry[];
  showWorkspaceBadge?: boolean;
  onEntryClick?: (entry: TimelineEntry) => void;
}

export function ActivityTimeline({ entries, showWorkspaceBadge = false, onEntryClick }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => onEntryClick?.(entry)}
          className={`flex items-start gap-2 px-3 py-2 rounded-md text-sm ${onEntryClick ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
        >
          <div className="mt-0.5 text-muted-foreground">
            {getActorIcon(entry.actor)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {showWorkspaceBadge && entry.workspace_color && (
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.workspace_color }}
                  title={entry.workspace_name}
                />
              )}
              <span className="font-medium truncate">
                {entry.task_number ? `#${entry.task_number}` : ''} {entry.task_subject || ''}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatAction(entry.action, entry.details)}
              <span className="ml-2">{getRelativeTime(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
