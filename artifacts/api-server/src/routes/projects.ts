import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Activity } from "../models/Activity.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function enrichProject(project: InstanceType<typeof Project>) {
  const [taskCount, completedTaskCount] = await Promise.all([
    Task.countDocuments({ projectId: project._id }),
    Task.countDocuments({ projectId: project._id, status: "done" }),
  ]);
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    ownerId: project.ownerId.toString(),
    memberIds: project.memberIds.map((id) => id.toString()),
    taskCount,
    completedTaskCount,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// GET /api/projects
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const projects = await Project.find({
      $or: [{ ownerId: userId }, { memberIds: userId }],
    }).sort({ updatedAt: -1 });
    const enriched = await Promise.all(projects.map(enrichProject));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const userId = new mongoose.Types.ObjectId(req.userId);
    const project = await Project.create({
      name,
      description,
      color,
      ownerId: userId,
      memberIds: [userId],
    });

    await Activity.create({
      type: "project_created",
      message: `Created project "${project.name}"`,
      userId,
      userName: req.userName,
      entityId: project._id.toString(),
      entityName: project.name,
    });

    res.status(201).json(await enrichProject(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:id
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(await enrichProject(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const { name, description, color } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params["id"],
      { ...(name && { name }), ...(description !== undefined && { description }), ...(color && { color }) },
      { new: true }
    );
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(await enrichProject(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await Project.findByIdAndDelete(req.params["id"]);
    await Task.deleteMany({ projectId: req.params["id"] });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
