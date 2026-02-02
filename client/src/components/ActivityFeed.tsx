import { useNavigate } from 'react-router-dom';
import { ActivityTimeline } from './ActivityTimeline';
import type { DashboardActivity } from '../hooks/useDashboard';
import type { TimelineEntry } from './ActivityTimeline';

interface ActivityFeedProps {
  activities: DashboardActivity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const navigate = useNavigate();

  const entries: TimelineEntry[] = activities.map((a) => ({
    id: a.id,
    actor: a.actor,
    action: a.action,
    details: a.details,
    created_at: a.created_at,
    task_subject: a.task_subject,
    task_number: a.task_number,
    workspace_slug: a.workspace_slug,
    workspace_name: a.workspace_name,
    workspace_color: a.workspace_color,
  }));

  const handleClick = (entry: TimelineEntry) => {
    if (entry.workspace_slug) {
      const activity = activities.find((a) => a.id === entry.id);
      if (activity) {
        navigate(`/w/${activity.workspace_slug}/task/${activity.task_id}`);
      }
    }
  };

  return (
    <ActivityTimeline
      entries={entries}
      showWorkspaceBadge
      onEntryClick={handleClick}
    />
  );
}
