import { Router } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Activity } from "../models/Activity.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

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
    if (projectId) filter["projectId"] = projectId;
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

// POST /api/tasks
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { title, description, status, priority, projectId, assigneeId, dueDate, tags } = req.body;
    if (!title || !projectId) {
      res.status(400).json({ error: "title and projectId are required" });
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
    res.json(await enrichTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const { title, description, status, priority, assigneeId, dueDate, tags } = req.body;
    const task = await Task.findByIdAndUpdate(
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
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(await enrichTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await Task.findByIdAndDelete(req.params["id"]);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id/status
router.patch("/:id/status", async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }
    const task = await Task.findByIdAndUpdate(
      req.params["id"],
      { status },
      { new: true }
    );
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const userId = new mongoose.Types.ObjectId(req.userId);
    const activityType = status === "done" ? "task_completed" : "status_changed";
    await Activity.create({
      type: activityType,
      message: status === "done"
        ? `Completed task "${task.title}"`
        : `Changed status of "${task.title}" to ${status.replace("_", " ")}`,
      userId,
      userName: req.userName,
      entityId: task._id.toString(),
      entityName: task.title,
    });

    res.json(await enrichTask(task));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
