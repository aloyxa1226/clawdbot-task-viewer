import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useSSE } from '../hooks/useSSE';
import { QuickStats } from './QuickStats';
import { ReviewQueue } from './ReviewQueue';
import { ActivityFeed } from './ActivityFeed';
import { RefreshCw, FileText } from 'lucide-react';

export function DashboardView() {
  const { data, loading, error, refresh } = useDashboard();
  useSSE(refresh, 10000);
  const navigate = useNavigate();

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <button onClick={refresh} className="text-sm text-muted-foreground hover:text-foreground">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/briefing')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Briefing
          </button>
          <button
            onClick={refresh}
            className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left column: Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Overview
            </h2>
            <QuickStats workspaces={data.workspaces} global={data.global} />
          </div>
        </div>

        {/* Right column: Review + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Queue */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Needs Review
              {data.global.review > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold">
                  {data.global.review}
                </span>
              )}
            </h2>
            <ReviewQueue items={data.review_items} />
          </div>

          {/* Active Work */}
          {data.active_items.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active Work
              </h2>
              <ActiveWork items={data.active_items} />
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Recent Activity
            </h2>
            <ActivityFeed activities={data.recent_activity} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline active work component
function ActiveWork({ items }: { items: Array<{ id: string; task_number: number; subject: string; status: string; assigned_to: string; workspace_slug: string; workspace_name: string; workspace_color: string; updated_at: string }> }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => navigate(`/w/${item.workspace_slug}/task/${item.id}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.workspace_color }}
          />
          <span className="text-sm font-medium truncate flex-1">
            #{item.task_number} {item.subject}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
            {item.status.replace('_', ' ')}
          </span>
        </div>
      ))}
    </div>
  );
}
