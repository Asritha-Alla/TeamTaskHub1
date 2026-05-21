import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setLocation("/login");
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="font-bold text-xl tracking-tight text-primary">TaskMaster</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className={`block px-4 py-2 rounded-md ${location === '/' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>Dashboard</Link>
          <Link href="/projects" className={`block px-4 py-2 rounded-md ${location.startsWith('/projects') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>Projects</Link>
          <Link href="/tasks" className={`block px-4 py-2 rounded-md ${location === '/tasks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>Tasks</Link>
          <Link href="/settings" className={`block px-4 py-2 rounded-md ${location === '/settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>Settings</Link>
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: user?.avatarColor }}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">{user?.name}</div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted rounded-md">Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}