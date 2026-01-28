import { useState, useEffect } from 'react';
import { Search, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useSSE } from '../hooks/useSSE';
import { useTaskStore } from '../stores/tasks';
import { cn } from '../lib/utils';

export function Header() {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchSessions, fetchTasks, addTask, updateTask } = useTaskStore();

  const { isConnected } = useSSE({
    task_created: (event) => {
      const { task } = event.data as { task: unknown };
      addTask(task as never);
    },
    task_updated: (event) => {
      const { task } = event.data as { task: unknown };
      updateTask(task as never);
    },
    session_activity: () => {
      fetchSessions();
    },
  });

  useEffect(() => {
    fetchSessions();
    fetchTasks();
  }, [fetchSessions, fetchTasks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search
    console.log('Search:', searchQuery);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tasks... (Press /)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            isConnected ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Disconnected</span>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-md p-2 hover:bg-accent"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
}
