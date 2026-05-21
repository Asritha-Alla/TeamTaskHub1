import { Router } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { Activity } from "../models/Activity.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/summary
router.get("/summary", async (req: AuthRequest, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      myTasks,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: "done" }),
      Task.countDocuments({ status: "in_progress" }),
      Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: "done" } }),
      Project.countDocuments({ $or: [{ ownerId: userId }, { memberIds: userId }] }),
      Project.countDocuments({
        $or: [{ ownerId: userId }, { memberIds: userId }],
      }),
      Task.countDocuments({ assigneeId: userId }),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects,
      myTasks,
      completionRate,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/activity
router.get("/activity", async (req: AuthRequest, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(20);
    const result = activities.map((a) => ({
      id: a._id.toString(),
      type: a.type,
      message: a.message,
      userId: a.userId.toString(),
      userName: a.userName,
      entityId: a.entityId,
      entityName: a.entityName,
      createdAt: a.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
