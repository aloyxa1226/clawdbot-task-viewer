import { useEffect, useState } from "react";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            ClawdBot Task Viewer
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">System Status</h2>
            {error ? (
              <p className="text-destructive">Error: {error}</p>
            ) : health ? (
              <div className="space-y-2">
                <p>
                  Status:{" "}
                  <span
                    className={
                      health.status === "healthy"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {health.status}
                  </span>
                </p>
                <p>Database: {health.services.database}</p>
                <p>Redis: {health.services.redis}</p>
                <p className="text-sm text-muted-foreground">
                  Last checked: {health.timestamp}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading...</p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Kanban Board</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-medium">Pending</h3>
                <p className="text-sm text-muted-foreground">
                  Tasks will appear here
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-medium">In Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Active tasks will appear here
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-medium">Completed</h3>
                <p className="text-sm text-muted-foreground">
                  Done tasks will appear here
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
