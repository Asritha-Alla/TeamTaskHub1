import { useMemo } from "react";
import { 
  useGetDashboardSummary, getGetDashboardSummaryQueryKey, 
  useGetDashboardAnalytics, getGetDashboardAnalyticsQueryKey, 
  useGetRecentActivity, getGetRecentActivityQueryKey 
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function getStatusBadge(status: string) {
  switch (status) {
    case 'todo': return <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">To Do</Badge>;
    case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300">In Progress</Badge>;
    case 'in_review': return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300">In Review</Badge>;
    case 'done': return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">Done</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'low': return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">Low</Badge>;
    case 'medium': return <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900 dark:text-blue-300">Medium</Badge>;
    case 'high': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300">High</Badge>;
    case 'urgent': return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300">Urgent</Badge>;
    default: return <Badge variant="outline">{priority}</Badge>;
  }
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  in_review: '#f59e0b',
  done: '#22c55e',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: analytics, isLoading: isAnalyticsLoading } = useGetDashboardAnalytics({ query: { queryKey: getGetDashboardAnalyticsQueryKey() } });
  const { data: activities, isLoading: isActivitiesLoading } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });

  const recentActivities = useMemo(() => {
    if (Array.isArray(activities)) {
      return activities;
    }

    if (activities && typeof activities === "object") {
      const candidate = activities as Record<string, unknown>;
      if (Array.isArray(candidate.activities)) {
        return candidate.activities;
      }

      if (Array.isArray(candidate.data)) {
        return candidate.data;
      }

      if (Array.isArray(candidate.items)) {
        return candidate.items;
      }
    }

    return [];
  }, [activities]);

  const hasOverdue = (summary?.overdueTasks ?? 0) > 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold" data-testid="stat-total-tasks">{summary?.totalTasks}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{summary?.completedTasks}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold text-blue-600" data-testid="stat-in-progress">{summary?.inProgressTasks}</div>}
          </CardContent>
        </Card>
        <Card className={hasOverdue ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={`text-sm font-medium ${hasOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className={`text-2xl font-bold ${hasOverdue ? 'text-red-600 dark:text-red-400' : ''}`} data-testid="stat-overdue">{summary?.overdueTasks}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{summary?.myTasks}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{summary?.totalProjects}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{summary?.completionRate}%</div>}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
            <CardDescription>Current distribution of task statuses</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {isAnalyticsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : analytics?.byStatus && analytics.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                  >
                    {analytics.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
            <CardDescription>Breakdown of task priority levels</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {isAnalyticsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : analytics?.byPriority && analytics.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.byPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || '#8884d8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tasks per Assignee</CardTitle>
            <CardDescription>Top active team members</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {isAnalyticsLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : analytics?.byUser && analytics.byUser.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.byUser} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="userName" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in your projects</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isActivitiesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">No recent activity.</div>
            ) : (
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-start p-3 rounded-lg border bg-card/50 text-sm transition-colors hover:bg-accent/50">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{activity.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 gap-1">
                      <p className="leading-snug">
                        <span className="font-semibold text-foreground">{activity.userName}</span>{' '}
                        <span className="text-muted-foreground">{activity.message}</span>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Tasks</CardTitle>
          <CardDescription>Tasks that have passed their due date</CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyticsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !analytics?.overdueTasks || analytics.overdueTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No overdue tasks 🎉
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="text-right">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.overdueTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">{task.assignee?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                        {new Date(task.dueDate!).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
