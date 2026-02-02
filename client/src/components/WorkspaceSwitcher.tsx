import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Workspace } from '../types/v2';
import { cn } from '../lib/utils';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
}

export function WorkspaceSwitcher({ workspaces }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  // Keyboard shortcuts: Cmd/Ctrl + 1/2/3
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const index = parseInt(e.key, 10) - 1;
      if (index >= 0 && index < workspaces.length) {
        e.preventDefault();
        navigate(`/w/${workspaces[index].slug}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [workspaces, navigate]);

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-2 border-r border-border bg-muted/30 min-w-[56px]">
      {/* Dashboard dot */}
      <button
        onClick={() => navigate('/')}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all hover:scale-110',
          !slug
            ? 'bg-foreground text-background shadow-lg'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
        title="Dashboard"
      >
        🏠
      </button>

      <div className="w-6 h-px bg-border" />

      {/* Workspace dots */}
      {workspaces.map((ws, i) => (
        <button
          key={ws.id}
          onClick={() => navigate(`/w/${ws.slug}`)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-110',
            slug === ws.slug
              ? 'shadow-lg ring-2 ring-white/30 scale-105'
              : 'opacity-60 hover:opacity-100'
          )}
          style={{ backgroundColor: ws.color }}
          title={`${ws.name} (⌘${i + 1})`}
        >
          {ws.name.charAt(0).toUpperCase()}
        </button>
      ))}

      <div className="w-6 h-px bg-border" />

      {/* Briefing */}
      <button
        onClick={() => navigate('/briefing')}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all hover:scale-110',
          'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
        title="Briefing"
      >
        📋
      </button>
    </div>
  );
}
