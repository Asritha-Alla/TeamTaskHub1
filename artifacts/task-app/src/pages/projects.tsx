import { useState } from "react";
import { Link } from "wouter";
import { useListProjects, getListProjectsQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const createProject = useCreateProject();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject.mutateAsync({ data: { name, description, color } });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    setOpen(false);
    setName("");
    setDescription("");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} required data-testid="input-project-name" />
              </div>
              <div>
                <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-project-description" />
              </div>
              <div>
                <Input type="color" value={color} onChange={e => setColor(e.target.value)} data-testid="input-project-color" />
              </div>
              <Button type="submit" disabled={createProject.isPending} data-testid="button-submit-project">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))
        ) : projects?.length === 0 ? (
          <p className="text-muted-foreground col-span-full">No projects found.</p>
        ) : (
          projects?.map((project) => {
            const progress = project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} data-testid={`link-project-${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4" style={{ borderLeftColor: project.color }}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="truncate text-lg">{project.name}</CardTitle>
                      <Badge variant={project.myRole === 'admin' ? 'default' : 'secondary'}>
                        {project.myRole === 'admin' ? 'Admin' : 'Member'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{project.description || "No description"}</p>
                    
                    <div className="flex justify-between items-center text-xs">
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {project.members?.length || 0} members
                      </Badge>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{project.completedTaskCount} of {project.taskCount} tasks completed</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  );
}