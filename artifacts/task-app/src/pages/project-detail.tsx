import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetProject, getGetProjectQueryKey, useListTasks, getListTasksQueryKey, useCreateTask, useUpdateProject, useDeleteProject, getListProjectsQueryKey, TaskStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProjectDetail() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: project, isLoading: isProjectLoading } = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const { data: tasks, isLoading: isTasksLoading } = useListTasks({ projectId: id }, { query: { enabled: !!id, queryKey: getListTasksQueryKey({ projectId: id }) } });
  
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  
  const [taskTitle, setTaskTitle] = useState("");

  if (isProjectLoading || isTasksLoading) return <div className="p-8">Loading project...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  const handleDelete = async () => {
    if (confirm("Delete this project?")) {
      await deleteProject.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setLocation("/projects");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask.mutateAsync({ data: { title: taskTitle, projectId: id, status: TaskStatus.todo } });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: id }) });
    setIsTaskOpen(false);
    setTaskTitle("");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }}></div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>Edit</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Tasks</h2>
          <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
            <DialogTrigger asChild>
              <Button>Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <Input placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
                <Button type="submit" disabled={createTask.isPending}>Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {tasks?.length === 0 ? (
            <p className="text-muted-foreground">No tasks yet.</p>
          ) : (
            tasks?.map(task => (
              <div key={task.id} className="p-4 border rounded bg-card flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Status: {task.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}