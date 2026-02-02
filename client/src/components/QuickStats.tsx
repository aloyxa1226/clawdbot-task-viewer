import type { DashboardWorkspace } from '../hooks/useDashboard';

interface QuickStatsProps {
  workspaces: DashboardWorkspace[];
  global: { review: number; in_progress: number; queued: number };
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  claimed: 'Claimed',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export function QuickStats({ workspaces, global }: QuickStatsProps) {
  return (
    <div className="space-y-4">
      {/* Global summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-500">{global.review}</div>
          <div className="text-xs text-muted-foreground">Needs Review</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-blue-500">{global.in_progress}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{global.queued}</div>
          <div className="text-xs text-muted-foreground">Queued</div>
        </div>
      </div>

      {/* Per-workspace cards */}
      <div className="space-y-2">
        {workspaces.map((ws) => {
          const total = Object.values(ws.counts).reduce((s, n) => s + n, 0);
          return (
            <div key={ws.workspace_id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
                <span className="font-medium text-sm">{ws.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{total} tasks</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                  const count = ws.counts[status] || 0;
                  if (count === 0) return null;
                  return (
                    <span key={status} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {label}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
