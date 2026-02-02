import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { Briefing, BriefingWorkspace } from '../types/v2';

export function BriefingView() {
  const { date } = useParams<{ date?: string }>();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = date ? `/briefings/${date}` : '/briefings/latest';
      const res = await apiFetch<{ ok: boolean; briefing: Briefing }>(endpoint);
      setBriefing(res.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  };

  const generateBriefing = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; briefing: Briefing }>('/briefings/generate', {
        method: 'POST',
      });
      setBriefing(res.briefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, [date]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading briefing...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Morning Briefing</h1>
        <button
          onClick={generateBriefing}
          disabled={generating}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
        >
          {generating ? 'Generating...' : 'Generate New'}
        </button>
      </div>

      {error && !briefing && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={generateBriefing}
            disabled={generating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? 'Generating...' : 'Generate Briefing'}
          </button>
        </div>
      )}

      {briefing && (
        <>
          <div className="mb-6 text-sm text-muted-foreground">
            <span>Period: </span>
            <span>{new Date(briefing.content.period.from).toLocaleString()}</span>
            <span> → </span>
            <span>{new Date(briefing.content.period.to).toLocaleString()}</span>
          </div>

          {briefing.content.workspaces.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No activity in this period.</p>
          )}

          {briefing.content.workspaces.map((ws) => (
            <WorkspaceSection key={ws.slug} workspace={ws} />
          ))}
        </>
      )}
    </div>
  );
}

function WorkspaceSection({ workspace: ws }: { workspace: BriefingWorkspace }) {
  const totalItems = ws.completed.length + ws.needs_review.length + ws.in_progress.length + ws.blockers.length;
  if (totalItems === 0) return null;

  return (
    <div className="mb-8 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: ws.color + '15' }}>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
        <h2 className="font-semibold text-lg">{ws.name}</h2>
      </div>

      <div className="p-4 space-y-4">
        {ws.completed.length > 0 && (
          <TaskSection title="✅ Completed" items={ws.completed} slug={ws.slug} renderDetail={(t) => (
            <span className="text-xs text-muted-foreground">{t.summary}</span>
          )} />
        )}

        {ws.needs_review.length > 0 && (
          <TaskSection title="👀 Needs Review" items={ws.needs_review} slug={ws.slug} renderDetail={(t) => (
            <span className="text-xs text-muted-foreground">{t.review_notes}</span>
          )} />
        )}

        {ws.in_progress.length > 0 && (
          <TaskSection title="🔧 In Progress" items={ws.in_progress} slug={ws.slug} renderDetail={(t) => (
            <span className="text-xs text-muted-foreground">Last activity: {new Date(t.last_activity).toLocaleString()}</span>
          )} />
        )}

        {ws.blockers.length > 0 && (
          <TaskSection title="🚫 Blockers" items={ws.blockers} slug={ws.slug} renderDetail={(t) => (
            <span className="text-xs text-red-500">{t.reason}</span>
          )} />
        )}
      </div>
    </div>
  );
}

function TaskSection<T extends { task_id: string; subject: string }>({
  title,
  items,
  slug,
  renderDetail,
}: {
  title: string;
  items: T[];
  slug: string;
  renderDetail: (item: T) => React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title} ({items.length})</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.task_id} className="flex flex-col gap-0.5 pl-2 border-l-2 border-border py-1">
            <Link
              to={`/w/${slug}/task/${item.task_id}`}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {item.subject}
            </Link>
            {renderDetail(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
