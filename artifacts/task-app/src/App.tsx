import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { Layout } from "@/components/layout";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Tasks from "@/pages/tasks";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (isError || (!isLoading && !user)) {
      setLocation("/login");
    }
  }, [isError, isLoading, user, setLocation]);

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  if (user) return null;

  return <Component />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/login"><AuthRoute component={Login} /></Route>
            <Route path="/register"><AuthRoute component={Register} /></Route>
            <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/projects"><ProtectedRoute component={Projects} /></Route>
            <Route path="/projects/:id"><ProtectedRoute component={ProjectDetail} /></Route>
            <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
            <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;