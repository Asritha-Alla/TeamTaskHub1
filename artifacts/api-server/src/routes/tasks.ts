import { Router } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Activity } from "../models/Activity.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getProjectRole(projectId: string, userId: string): Promise<"admin" | "member" | null> {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const member = project.members.find((m) => m.userId.toString() === userId);
  return member?.role ?? null;
}

async function enrichTask(task: InstanceType<typeof Task>) {
  let assignee = null;
  if (task.assigneeId) {
    const u = await User.findById(task.assigneeId);
    if (u) {
      assignee = {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        createdAt: u.createdAt.toISOString(),
      };
    }
  }
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId.toString(),
    assigneeId: task.assigneeId?.toString() ?? null,
    assignee,
    dueDate: task.dueDate?.toISOString() ?? null,
    tags: task.tags,
    createdBy: task.createdBy.toString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// GET /api/tasks
router.get("/", async (req: AuthRequest, res) => {
  try {
    const { projectId, status, assigneeId } = req.query;
    const filter: Record<string, unknown> = {};

    if (projectId) {
      // Ensure user is a member of that project
      const role = await getProjectRole(projectId as string, req.userId!);
      if (!role) {
        res.status(403).json({ error: "You are not a member of that project" });
        return;
      }
      filter["projectId"] = projectId;
      // Members can only see tasks assigned to them
      if (role === "member") {
        filter["assigneeId"] = new mongoose.Types.ObjectId(req.userId);
      }
    } else {
      // No projectId filter: only tasks in projects the user belongs to,
      // and for member role only their assigned tasks
      const userProjects = await Project.find({ "members.userId": new mongoose.Types.ObjectId(req.userId) });
      const adminProjectIds = userProjects
        .filter((p) => p.members.some((m) => m.userId.toString() === req.userId && m.role === "admin"))
        .map((p) => p._id);
      const memberProjectIds = userProjects
        .filter((p) => p.members.some((m) => m.userId.toString() === req.userId && m.role === "member"))
        .map((p) => p._id);

      const userId = new mongoose.Types.ObjectId(req.userId);
      filter["$or"] = [
        { projectId: { $in: adminProjectIds } },
        { projectId: { $in: memberProjectIds }, assigneeId: userId },
      ];
    }

    if (status) filter["status"] = status;
    if (assigneeId) filter["assigneeId"] = assigneeId;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    const enriched = await Promise.all(tasks.map(enrichTask));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tasks — any project member can create
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { title, description, status, priority, projectId, assigneeId, dueDate, tags } = req.body;
    if (!title || !projectId) {
      res.status(400).json({ error: "title and projectId are required" });
      return;
    }
    const role = await getProjectRole(projectId, req.userId!);
    if (!role) {
      res.status(403).json({ error: "You are not a member of that project" });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const task = await Task.create({
      title,
      description,
      status: status ?? "todo",
      priority: priority ?? "medium",
      projectId,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags ?? [],
      createdBy: userId,
    });

    await Activity.create({
      type: "task_created",
      message: `Created task "${task.title}"`,
      userId,
      userName: req.userName,
      entityId: task._id.toString(),
      entityName: task.title,
    });

    if (assigneeId && assigneeId !== req.userId) {
      await Activity.create({
        type: "task_assigned",
        message: `Assigned task "${task.title}"`,
        userId,
        userName: req.userName,
        entityId: task._id.toString(),
        entityName: task.title,
      });
    }

    res.status(201).json(await enrichTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const task = await Task.findById(req.params["id"]);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(task.projectId.toString(), req.userId!);
    if (!role) {
      res.status(403).json({ error: "You are not a member of that project" });
      return;
    }
    // Members can only see their assigned tasks
    if (role === "member" && task.assigneeId?.toString() !== req.userId) {
      res.status(403).json({ error: "Members can only view their own assigned tasks" });
      return;
    }
    res.json(await enrichTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id — admin only (full edit)
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const task = await Task.findById(req.params["id"]);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(task.projectId.toString(), req.userId!);
    if (role !== "admin") {
      res.status(403).json({ error: "Only project admins can edit task details" });
      return;
    }
    const { title, description, status, priority, assigneeId, dueDate, tags } = req.body;
    const updated = await Task.findByIdAndUpdate(
      req.params["id"],
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || undefined }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : undefined }),
        ...(tags && { tags }),
      },
      { new: true }
    );
    res.json(await enrichTask(updated!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id — admin only
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const task = await Task.findById(req.params["id"]);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(task.projectId.toString(), req.userId!);
    if (role !== "admin") {
      res.status(403).json({ error: "Only project admins can delete tasks" });
      return;
    }
    await Task.findByIdAndDelete(req.params["id"]);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id/status — any project member (on their assigned task; admin on any)
router.patch("/:id/status", async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }
    const task = await Task.findById(req.params["id"]);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(task.projectId.toString(), req.userId!);
    if (!role) {
      res.status(403).json({ error: "You are not a member of that project" });
      return;
    }
    // Members can only update status on their own assigned tasks
    if (role === "member" && task.assigneeId?.toString() !== req.userId) {
      res.status(403).json({ error: "Members can only update status on their assigned tasks" });
      return;
    }

    const updated = await Task.findByIdAndUpdate(req.params["id"], { status }, { new: true });
    const userId = new mongoose.Types.ObjectId(req.userId);
    const activityType = status === "done" ? "task_completed" : "status_changed";
    await Activity.create({
      type: activityType,
      message: status === "done"
        ? `Completed task "${task.title}"`
        : `Changed status of "${task.title}" to ${status.replace(/_/g, " ")}`,
      userId,
      userName: req.userName,
      entityId: task._id.toString(),
      entityName: task.title,
    });

    res.json(await enrichTask(updated!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
