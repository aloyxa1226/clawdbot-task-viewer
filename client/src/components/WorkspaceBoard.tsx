import { useParams } from 'react-router-dom';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import type { V2Task, V2Status, Workspace } from '../types/v2';
import { KanbanColumn } from './KanbanColumn';
import { useTasks } from '../hooks/useTasks';
import { updateTaskStatus } from '../lib/api';

const V2_COLUMNS: { status: V2Status; title: string }[] = [
  { status: 'queued', title: 'Queued' },
  { status: 'claimed', title: 'Claimed' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
];

interface WorkspaceBoardProps {
  workspaces: Workspace[];
}

export function WorkspaceBoard({ workspaces }: WorkspaceBoardProps) {
  const { slug } = useParams<{ slug: string }>();
  const { tasks, setTasks, loading, error, refresh } = useTasks(slug);
  const workspace = workspaces.find(w => w.slug === slug);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destStatus = destination.droppableId as V2Status;
    const previousTasks = [...tasks];

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === draggableId ? { ...t, status: destStatus } : t
    ));

    try {
      await updateTaskStatus(draggableId, destStatus, 'al');
    } catch {
      setTasks(previousTasks);
    }
  };

  const getColumnTasks = (status: V2Status): V2Task[] => {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.priority - b.priority);
  };

  if (!slug) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Workspace header bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3">
        {workspace && (
          <>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: workspace.color }}
            />
            <h2 className="text-lg font-semibold">{workspace.name}</h2>
            <span className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
          </>
        )}
        {loading && (
          <span className="text-xs text-muted-foreground ml-auto">Loading...</span>
        )}
        {error && (
          <span className="text-xs text-destructive ml-auto">{error}</span>
        )}
        <button
          onClick={refresh}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Kanban */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {V2_COLUMNS.map(({ status }) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                totalTasks={tasks.length}
                onTaskClick={() => {}}
                onTaskDelete={undefined}
              />
            ))}
          </div>
        </DragDropContext>
      </main>
    </div>
  );
}
