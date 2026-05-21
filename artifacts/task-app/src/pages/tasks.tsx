import { useState, useMemo } from "react";
import { 
  useListTasks, getListTasksQueryKey, 
  useCreateTask, useUpdateTask, useDeleteTask, useUpdateTaskStatus, 
  useListProjects, 
  useListUsers, 
  useGetMe,
  TaskStatus, TaskPriority, Task
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Edit, CalendarIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { asArray } from "@/lib/utils";

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

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Data queries
  const { data: currentUser } = useGetMe();
  const { data: tasks, isLoading: isTasksLoading } = useListTasks({});
  const { data: projects } = useListProjects();
  const { data: users } = useListUsers();
  const projectList = asArray<{ id: string; myRole?: string; name?: string }>(projects);
  const taskList = asArray<Task>(tasks);
  const userList = asArray<{ id: string; name: string; email?: string }>(users);

  // Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const deleteTaskMutation = useDeleteTask();

  // Derived data
  const projectRoles = useMemo(() => {
    const roles: Record<string, string> = {};
    projectList.forEach(p => { roles[p.id] = p.myRole || 'member'; });
    return roles;
  }, [projectList]);

  const adminProjects = useMemo(() => projectList.filter(p => p.myRole === 'admin'), [projectList]);

  const filteredTasks = useMemo(() => {
    if (!taskList.length) return [];
    return taskList.filter(t => {
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
      const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchPriority && matchSearch;
    });
  }, [taskList, filterStatus, filterPriority, searchQuery]);

  // Form states
  const [formData, setFormData] = useState({
    title: "", description: "", projectId: "", status: "todo", priority: "medium", assigneeId: "unassigned", dueDate: ""
  });

  const resetForm = () => {
    setFormData({
      title: "", description: "", projectId: adminProjects[0]?.id || "", status: "todo", priority: "medium", assigneeId: "unassigned", dueDate: ""
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || "",
      projectId: task.projectId,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId || "unassigned",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""
    });
    setEditTask(task);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.projectId) return;

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status as TaskStatus,
        priority: formData.priority as TaskPriority,
        projectId: formData.projectId,
        assigneeId: formData.assigneeId === "unassigned" ? undefined : formData.assigneeId,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined
      };

      if (editTask) {
        await updateTaskMutation.mutateAsync({ 
          id: editTask.id, 
          data: { ...payload } 
        });
        toast({ title: "Task updated successfully" });
        setEditTask(null);
      } else {
        await createTaskMutation.mutateAsync({ data: { ...payload, tags: [] } });
        toast({ title: "Task created successfully" });
        setIsCreateOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (err) {
      toast({ title: "Error saving task", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTaskMutation.mutateAsync({ id: deleteTaskId });
      toast({ title: "Task deleted" });
      setDeleteTaskId(null);
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (err) {
      toast({ title: "Error deleting task", variant: "destructive" });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: taskId, data: { status: newStatus as TaskStatus } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Status updated" });
    } catch (err) {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage and track your team's work</p>
        </div>
        {adminProjects.length > 0 && (
          <Button onClick={openCreateDialog} data-testid="btn-create-task" className="gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTasksLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map(task => {
                const isAdmin = projectRoles[task.projectId] === 'admin';
                const isAssignee = task.assigneeId === currentUser?.id;
                
                return (
                  <TableRow key={task.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{task.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin || isAssignee ? (
                        <Select value={task.status} onValueChange={(val) => handleStatusChange(task.id, val)}>
                          <SelectTrigger className="h-8 text-xs w-[130px] border-dashed">
                            <SelectValue>{getStatusBadge(task.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(task.status)
                      )}
                    </TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {task.assignee.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className={`text-sm flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{projects.find(p => p.id === task.projectId)?.name || 'Unknown Project'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isCreateOpen || !!editTask} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditTask(null); }}}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveTask}>
            <DialogHeader>
              <DialogTitle>{editTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                {editTask ? 'Make changes to the task details.' : 'Add a new task to your project.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="E.g., Update landing page copy" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="project">Project *</Label>
                <Select disabled={!!editTask} value={formData.projectId} onValueChange={v => setFormData({...formData, projectId: v})}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {editTask ? (
                      <SelectItem value={formData.projectId}>{projectList.find(p => p.id === formData.projectId)?.name || 'Project'}</SelectItem>
                    ) : (
                      adminProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={formData.assigneeId} onValueChange={v => setFormData({...formData, assigneeId: v})}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {userList.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Task details and context..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setEditTask(null); }}>Cancel</Button>
              <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending || !formData.projectId || !formData.title}>
                {editTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTaskMutation.isPending}>Delete Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
