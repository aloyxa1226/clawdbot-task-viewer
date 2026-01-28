import { Task } from '../types/task';
import { Lock, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const hasBlockers = task.blocked_by.length > 0;
  const blocksOthers = task.blocks.length > 0;

  const priorityColor = {
    0: 'border-border',
    1: 'border-blue-400',
    2: 'border-yellow-400',
    3: 'border-orange-400',
    4: 'border-red-400',
  }[task.priority] || 'border-border';

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border-2 ${priorityColor} bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm line-clamp-2 flex-1">
          #{task.task_number} {task.subject}
        </h4>
        <div className="flex gap-1 ml-2">
          {hasBlockers && (
            <div className="flex items-center text-red-500" title={`Blocked by ${task.blocked_by.length} task(s)`}>
              <Lock className="w-4 h-4" />
            </div>
          )}
          {blocksOthers && (
            <div className="flex items-center text-yellow-600" title={`Blocks ${task.blocks.length} task(s)`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={`px-2 py-0.5 rounded ${
          task.status === 'completed' ? 'bg-green-900 text-green-200' :
          task.status === 'in_progress' ? 'bg-blue-900 text-blue-200' :
          'bg-muted text-foreground'
        }`}>
          {task.status.replace('_', ' ')}
        </span>

        {(hasBlockers || blocksOthers) && (
          <span className="text-xs">
            {hasBlockers && `🔒 ${task.blocked_by.length}`}
            {hasBlockers && blocksOthers && ' | '}
            {blocksOthers && `⚠️ ${task.blocks.length}`}
          </span>
        )}
      </div>
    </div>
  );
}
