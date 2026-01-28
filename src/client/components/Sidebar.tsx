import { useTaskStore } from '../stores/tasks';
import { cn } from '../lib/utils';
import { Folder, Activity } from 'lucide-react';

export function Sidebar() {
  const { sessions, selectedSession, selectSession } = useTaskStore();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4">
        <h1 className="text-xl font-bold">ClawdBot Tasks</h1>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Sessions</h2>
        
        <button
          onClick={() => selectSession(null)}
          className={cn(
            'mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            selectedSession === null
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50'
          )}
        >
          <Folder className="h-4 w-4" />
          All Sessions
        </button>

        <div className="space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.sessionKey)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                selectedSession === session.sessionKey
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                {session.activeTaskCount > 0 && (
                  <Activity className="h-3 w-3 text-green-500 animate-pulse" />
                )}
                <span className="truncate">
                  {session.name || session.sessionKey.slice(0, 12)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {session.taskCount}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
