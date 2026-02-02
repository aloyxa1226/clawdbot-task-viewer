import { useNavigate } from 'react-router-dom';
import type { DashboardReviewItem } from '../hooks/useDashboard';

interface ReviewQueueProps {
  items: DashboardReviewItem[];
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

export function ReviewQueue({ items }: ReviewQueueProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No tasks awaiting review ✨
      </p>
    );
  }

  // Group by workspace
  const grouped = new Map<string, DashboardReviewItem[]>();
  for (const item of items) {
    const key = item.workspace_slug;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([slug, wsItems]) => (
        <div key={slug}>
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: wsItems[0].workspace_color }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {wsItems[0].workspace_name}
            </span>
          </div>
          <div className="space-y-1">
            {wsItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/w/${slug}/task/${item.id}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors border border-yellow-500/20 bg-yellow-500/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    #{item.task_number} {item.subject}
                  </div>
                  {item.review_notes && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {item.review_notes}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {getRelativeTime(item.updated_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
