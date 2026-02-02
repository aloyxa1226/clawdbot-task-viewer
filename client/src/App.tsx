import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { WorkspaceBoard } from './components/WorkspaceBoard';
import { DashboardView } from './components/DashboardView';
import { BriefingView } from './components/BriefingView';
import { useWorkspaces } from './hooks/useWorkspaces';

function AppLayout() {
  const { workspaces, loading } = useWorkspaces();

  if (loading && workspaces.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading workspaces...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <WorkspaceSwitcher workspaces={workspaces} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/w/:slug" element={<WorkspaceBoard workspaces={workspaces} />} />
          <Route path="/w/:slug/task/:id" element={<WorkspaceBoard workspaces={workspaces} />} />
          <Route path="/briefing" element={<BriefingView />} />
          <Route path="/briefing/:date" element={<BriefingView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
