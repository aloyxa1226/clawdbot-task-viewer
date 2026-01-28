import { useMemo } from 'react';
import { useTaskStore } from '../stores/tasks';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskDetail } from '../components/TaskDetail';

export function Dashboard() {
  const { tasks, selectedSession, selectedTaskId } = useTaskStore();

  const filteredTasks = useMemo(() => {
    if (!selectedSession) return tasks;
    return tasks.filter((t) => t.sessionId === selectedSession);
  }, [tasks, selectedSession]);

  const columns = useMemo(() => ({
    pending: filteredTasks.filter((t) => t.status === 'pending'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    completed: filteredTasks.filter((t) => t.status === 'completed'),
  }), [filteredTasks]);

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1">
        <KanbanBoard columns={columns} />
      </div>
      
      {selectedTaskId && (
        <TaskDetail taskId={selectedTaskId} />
      )}
    </div>
  );
}
