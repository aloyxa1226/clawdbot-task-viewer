import { Trash2, Link, Clock } from 'lucide-react';
import type { Task } from '@shared/types';
import { useTaskStore } from '../stores/tasks';
import { cn } from '../lib/utils';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { selectTask, selectedTaskId, deleteTask, sessions } = useTaskStore();
  const isSelected = selectedTaskId === task.id;
  const canDelete = task.status === 'pending';

  const session = sessions.find((s) => s.id === task.sessionId);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    
    if (session) {
      await deleteTask(session.sessionKey, task.taskNumber);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div
      onClick={() => selectTask(task.id)}
      className={cn(
        'cursor-pointer rounded-md border bg-card p-3 transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        task.status === 'in_progress' && 'border-blue-500/50'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-medium leading-tight">{task.subject}</h4>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {task.activeForm && task.status === 'in_progress' && (
        <p className="mb-2 text-sm text-blue-500 animate-pulse">
          {task.activeForm}
        </p>
      )}

      {task.description && (
        <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(task.updatedAt)}
        </div>

        {(task.blocks.length > 0 || task.blockedBy.length > 0) && (
          <div className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            {task.blocks.length > 0 && (
              <span>Blocks {task.blocks.length}</span>
            )}
            {task.blockedBy.length > 0 && (
              <span>Blocked by {task.blockedBy.length}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
