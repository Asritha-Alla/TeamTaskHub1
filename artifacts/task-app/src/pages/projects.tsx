import { useState } from "react";
import { Link } from "wouter";
import { useListProjects, getListProjectsQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  if (isLoading) return <div className="p-8">Loading projects...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input placeholder="Project Name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <Input type="color" value={color} onChange={e => setColor(e.target.value)} />
              </div>
              <Button type="submit" disabled={createProject.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.length === 0 ? (
          <p className="text-muted-foreground">No projects found.</p>
        ) : (
          projects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4" style={{ borderLeftColor: project.color }}>
                <CardHeader>
                  <CardTitle className="truncate">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground truncate">{project.description || "No description"}</p>
                  <div className="mt-4 flex items-center space-x-4 text-xs">
                    <div>{project.taskCount} tasks</div>
                    <div>{project.completedTaskCount} done</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}