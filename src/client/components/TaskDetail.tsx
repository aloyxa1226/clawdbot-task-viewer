import { useEffect, useState } from 'react';
import { X, FileText, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import type { TaskWithFiles } from '@shared/types';
import { api } from '../lib/api';
import { useTaskStore } from '../stores/tasks';
import { cn } from '../lib/utils';

interface TaskDetailProps {
  taskId: string;
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const { selectTask } = useTaskStore();
  const [task, setTask] = useState<TaskWithFiles | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getTask(taskId)
      .then(setTask)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [taskId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectTask(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectTask]);

  if (isLoading) {
    return (
      <div className="w-96 animate-pulse rounded-lg border bg-card p-6">
        <div className="h-6 w-3/4 rounded bg-muted" />
        <div className="mt-4 h-4 w-full rounded bg-muted" />
        <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const statusColors = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
  };

  return (
    <div className="w-96 overflow-auto rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Task Details</h3>
        <button
          onClick={() => selectTask(null)}
          className="rounded p-1 hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white',
              statusColors[task.status]
            )}
          >
            {task.status.replace('_', ' ')}
          </span>
          <span className="text-sm text-muted-foreground">
            Task #{task.taskNumber}
          </span>
        </div>

        {/* Subject */}
        <div>
          <h4 className="text-lg font-medium">{task.subject}</h4>
          {task.activeForm && task.status === 'in_progress' && (
            <p className="mt-1 text-sm text-blue-500">{task.activeForm}</p>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h5 className="mb-1 text-sm font-medium text-muted-foreground">
              Description
            </h5>
            <p className="text-sm">{task.description}</p>
          </div>
        )}

        {/* Session info */}
        <div>
          <h5 className="mb-1 text-sm font-medium text-muted-foreground">
            Session
          </h5>
          <p className="text-sm">{task.session.name || task.session.sessionKey}</p>
          {task.session.projectPath && (
            <p className="text-xs text-muted-foreground">{task.session.projectPath}</p>
          )}
        </div>

        {/* Dependencies */}
        {(task.blocks.length > 0 || task.blockedBy.length > 0) && (
          <div>
            <h5 className="mb-2 text-sm font-medium text-muted-foreground">
              Dependencies
            </h5>
            {task.blocks.length > 0 && (
              <div className="mb-2 flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-orange-500" />
                <span>Blocks: {task.blocks.join(', ')}</span>
              </div>
            )}
            {task.blockedBy.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ArrowLeft className="h-4 w-4 text-red-500" />
                <span>Blocked by: {task.blockedBy.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Files */}
        {task.files.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-medium text-muted-foreground">
              Files ({task.files.length})
            </h5>
            <div className="space-y-1">
              {task.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span className="flex-1 truncate">{file.filename}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((file.sizeBytes || 0) / 1024)}KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
          </div>
          {task.completedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Completed: {new Date(task.completedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
