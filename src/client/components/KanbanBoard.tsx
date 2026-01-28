import type { Task } from '@shared/types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  columns: {
    pending: Task[];
    in_progress: Task[];
    completed: Task[];
  };
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  return (
    <div className="grid h-full grid-cols-3 gap-4">
      <KanbanColumn
        title="Pending"
        tasks={columns.pending}
        status="pending"
        color="bg-yellow-500"
      />
      <KanbanColumn
        title="In Progress"
        tasks={columns.in_progress}
        status="in_progress"
        color="bg-blue-500"
      />
      <KanbanColumn
        title="Completed"
        tasks={columns.completed}
        status="completed"
        color="bg-green-500"
      />
    </div>
  );
}
