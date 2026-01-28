import type { Task, TaskStatus } from '@shared/types';
import { TaskCard } from './TaskCard';
import { cn } from '../lib/utils';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  color: string;
}

export function KanbanColumn({ title, tasks, status, color }: KanbanColumnProps) {
  return (
    <div className="flex flex-col rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className={cn('h-3 w-3 rounded-full', color)} />
        <h3 className="font-semibold">{title}</h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          
          {tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No {status.replace('_', ' ')} tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
