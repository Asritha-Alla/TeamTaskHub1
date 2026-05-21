import { useState } from "react";
import { useListTasks, getListTasksQueryKey, useUpdateTaskStatus, TaskStatusUpdateStatus, useDeleteTask, useUpdateTask, useGetTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function EditTaskDialog({ taskId, open, onOpenChange }: { taskId: string, open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useGetTask(taskId, { query: { enabled: open && !!taskId } });
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState("");

  // Set initial value when loaded
  if (task && !title && !isLoading) {
    setTitle(task.title);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTask.mutateAsync({ id: taskId, data: { title } });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Button type="submit" disabled={updateTask.isPending}>Save</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useListTasks({}, { query: { queryKey: getListTasksQueryKey({}) } });
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  if (isLoading) return <div className="p-8">Loading tasks...</div>;

  const handleStatusChange = async (id: string, status: TaskStatusUpdateStatus) => {
    await updateStatus.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete task?")) {
      await deleteTask.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-6">All Tasks</h1>
      <div className="space-y-4">
        {tasks?.length === 0 ? (
          <p className="text-muted-foreground">No tasks found.</p>
        ) : (
          tasks?.map(task => (
            <div key={task.id} className="p-4 border rounded-lg bg-card flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <p className="text-sm text-muted-foreground">{task.status}</p>
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setEditTaskId(task.id)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(task.id, 'done')}>Mark Done</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(task.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {editTaskId && (
        <EditTaskDialog 
          taskId={editTaskId} 
          open={!!editTaskId} 
          onOpenChange={(open) => !open && setEditTaskId(null)} 
        />
      )}
    </div>
  );
}