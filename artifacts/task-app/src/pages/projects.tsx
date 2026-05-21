import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListProjects, getListProjectsQueryKey, useCreateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FolderOpen } from "lucide-react";

export default function Projects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: projects, isLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const createProject = useCreateProject();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync({ data: { name, description, color } });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setOpen(false);
      setName("");
      setDescription("");
      setColor("#3b82f6");
      toast({ title: "Project created" });
    } catch (err: any) {
      toast({
        title: "Failed to create project",
        description: err?.data?.error || err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects ? `${projects.length} project${projects.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Add a new project to your workspace.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Name</Label>
                <Input
                  id="proj-name"
                  placeholder="e.g. Website Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="input-project-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Input
                  id="proj-desc"
                  placeholder="Short description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-project-description"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-color">Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="proj-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-9 p-1 cursor-pointer"
                    data-testid="input-project-color"
                  />
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending} data-testid="button-submit-project">
                  {createProject.isPending ? "Creating…" : "Create Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-muted-foreground">
              {search ? "No projects match your search" : "No projects yet"}
            </p>
            {!search && (
              <p className="text-sm text-muted-foreground mt-1">
                Create your first project to get started.
              </p>
            )}
          </div>
        ) : (
          filtered.map((project) => {
            const progress =
              project.taskCount > 0
                ? (project.completedTaskCount / project.taskCount) * 100
                : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                data-testid={`link-project-${project.id}`}
              >
                <Card
                  className="hover:shadow-md transition-all cursor-pointer h-full border-l-4 group"
                  style={{ borderLeftColor: project.color }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="truncate text-base group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant={project.myRole === "admin" ? "default" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {project.myRole === "admin" ? "Admin" : "Member"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {project.description || "No description"}
                    </p>

                    <div className="flex justify-between items-center text-xs">
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {project.members?.length || 0}{" "}
                        {(project.members?.length || 0) === 1 ? "member" : "members"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {project.completedTaskCount} of {project.taskCount} tasks
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
