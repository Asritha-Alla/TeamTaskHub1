import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey, 
  useListTasks, getListTasksQueryKey, 
  useCreateTask, useUpdateProject, 
  useDeleteProject, getListProjectsQueryKey, 
  TaskStatus,
  useGetProjectMembers, getGetProjectMembersQueryKey,
  useAddProjectMember, useRemoveProjectMember, useUpdateMemberRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { asArray } from "@/lib/utils";

export default function ProjectDetail() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading: isProjectLoading } = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const { data: tasks, isLoading: isTasksLoading } = useListTasks({ projectId: id }, { query: { enabled: !!id, queryKey: getListTasksQueryKey({ projectId: id }) } });
  const { data: members, isLoading: isMembersLoading } = useGetProjectMembers(id, { query: { enabled: !!id, queryKey: getGetProjectMembersQueryKey(id) } });
  const taskList = asArray(tasks);
  const memberList = asArray(members);
  
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const updateRole = useUpdateMemberRole();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");

  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<'admin' | 'member'>('member');

  // Load edit fields
  const handleOpenEdit = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      setEditColor(project.color);
      setIsEditOpen(true);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProject.mutateAsync({ id, data: { name: editName, description: editDescription, color: editColor } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setIsEditOpen(false);
      toast({ title: "Project updated successfully" });
    } catch (err: any) {
      toast({ title: "Error updating project", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteProject = async () => {
    if (confirm("Delete this project?")) {
      try {
        await deleteProject.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation("/projects");
        toast({ title: "Project deleted" });
      } catch (err: any) {
        toast({ title: "Error deleting project", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask.mutateAsync({ data: { title: taskTitle, projectId: id, status: TaskStatus.todo } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: id }) });
      setIsTaskOpen(false);
      setTaskTitle("");
      toast({ title: "Task created" });
    } catch (err: any) {
      toast({ title: "Error creating task", description: err.message, variant: "destructive" });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMember.mutateAsync({ id, data: { email: addMemberEmail, role: addMemberRole as any } });
      queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(id) });
      setAddMemberEmail("");
      setAddMemberRole('member');
      toast({ title: "Member added" });
    } catch (err: any) {
      toast({ title: "Error adding member", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (confirm("Remove this member from the project?")) {
      try {
        await removeMember.mutateAsync({ id, userId });
        queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(id) });
        toast({ title: "Member removed" });
      } catch (err: any) {
        toast({ title: "Error removing member", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ id, userId, data: { role: role as any } });
      queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(id) });
      toast({ title: "Role updated" });
    } catch (err: any) {
      toast({ title: "Error updating role", description: err.message, variant: "destructive" });
    }
  };

  const isAdmin = project?.myRole === 'admin';
  const adminCount = memberList.filter(m => m.role === 'admin').length || 0;

  if (isProjectLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <Skeleton className="h-16 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!project) return <div className="p-8">Project not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: project.color }}></div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        
        {isAdmin && (
          <div className="space-x-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenEdit} data-testid="button-edit-project">Edit Project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div>
                    <Input placeholder="Project Name" value={editName} onChange={e => setEditName(e.target.value)} required data-testid="input-edit-project-name" />
                  </div>
                  <div>
                    <Input placeholder="Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} data-testid="input-edit-project-description" />
                  </div>
                  <div>
                    <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} data-testid="input-edit-project-color" />
                  </div>
                  <Button type="submit" disabled={updateProject.isPending} data-testid="button-submit-edit-project">Save Changes</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={handleDeleteProject} data-testid="button-delete-project">Delete</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold tracking-tight">Project Tasks</h2>
            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-task">Add Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <Input placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required data-testid="input-task-title" />
                  <Button type="submit" disabled={createTask.isPending} data-testid="button-submit-task">Create</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {isTasksLoading ? (
               Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : taskList.length === 0 ? (
              <div className="p-8 text-center border rounded-md bg-muted/20 text-muted-foreground">No tasks yet. Create one above!</div>
            ) : (
              taskList.map(task => (
                <div key={task.id} className="p-4 border rounded-md bg-card flex justify-between items-center shadow-sm" data-testid={`task-row-${task.id}`}>
                  <div>
                    <h3 className="font-medium text-foreground">{task.title}</h3>
                    <div className="flex gap-2 items-center mt-2">
                      <Badge variant="outline" className="text-xs uppercase">{task.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{task.priority || "Normal"}</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-2xl font-semibold tracking-tight">Project Members</h2>
          </div>

            {isAdmin && (
            <div className="p-6 border rounded-lg bg-card shadow-sm space-y-4">
              <h3 className="font-medium">Invite new member</h3>
              <form onSubmit={handleAddMember} className="flex gap-4 items-start">
                <div className="flex-1">
                  <Input type="email" placeholder="Email address" value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} required data-testid="input-add-member-email" />
                </div>
                <div className="w-[180px]">
                  <Select value={addMemberRole} onValueChange={(val: any) => setAddMemberRole(val)}>
                    <SelectTrigger data-testid="select-add-member-role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={addMember.isPending} data-testid="button-submit-add-member">Add to Project</Button>
              </form>
            </div>
          )}

          <div className="border rounded-lg bg-card shadow-sm divide-y">
            {isMembersLoading ? (
               Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : members?.map(member => {
              const isLastAdmin = member.role === 'admin' && adminCount === 1;

              return (
                <div key={member.userId} className="p-4 flex justify-between items-center" data-testid={`member-row-${member.userId}`}>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: member.avatarColor || '#ccc' }} className="text-white">
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{member.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {!isAdmin ? (
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>{member.role}</Badge>
                    ) : (
                      <>
                        <Select value={member.role} onValueChange={(val) => handleRoleChange(member.userId, val)} disabled={isLastAdmin}>
                          <SelectTrigger className="w-[120px]" data-testid={`select-role-${member.userId}`}>
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveMember(member.userId)} disabled={isLastAdmin} data-testid={`button-remove-member-${member.userId}`}>
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}