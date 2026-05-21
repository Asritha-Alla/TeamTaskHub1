import { Router } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { Activity } from "../models/Activity.js";
import { User } from "../models/User.js";
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
      myTasks,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: "done" }),
      Task.countDocuments({ status: "in_progress" }),
      Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: "done" } }),
      Project.countDocuments({ "members.userId": userId }),
      Task.countDocuments({ assigneeId: userId }),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects,
      activeProjects: totalProjects,
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

// GET /api/dashboard/analytics
router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    const now = new Date();

    // Tasks by status
    const statusAgg = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byStatus = ["todo", "in_progress", "in_review", "done"].map((s) => ({
      status: s,
      label: s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : s === "in_review" ? "In Review" : "Done",
      count: statusAgg.find((a) => a._id === s)?.count ?? 0,
    }));

    // Tasks by priority
    const priorityAgg = await Task.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);
    const byPriority = ["low", "medium", "high", "urgent"].map((p) => ({
      priority: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      count: priorityAgg.find((a) => a._id === p)?.count ?? 0,
    }));

    // Tasks per user (assignees)
    const userAgg = await Task.aggregate([
      { $match: { assigneeId: { $exists: true, $ne: null } } },
      { $group: { _id: "$assigneeId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const userIds = userAgg.map((a) => a._id);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const byUser = userAgg.map((a) => {
      const u = userMap.get(a._id.toString());
      return {
        userId: a._id.toString(),
        userName: u?.name ?? "Unknown",
        avatarColor: u?.avatarColor ?? "#6366f1",
        count: a.count,
      };
    });

    // Overdue tasks (not done, past due date)
    const overdueRaw = await Task.find({
      dueDate: { $lt: now },
      status: { $ne: "done" },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    const overdueTasks = await Promise.all(
      overdueRaw.map(async (task) => {
        let assignee = null;
        if (task.assigneeId) {
          const u = await User.findById(task.assigneeId);
          if (u) assignee = { id: u._id.toString(), name: u.name, avatarColor: u.avatarColor };
        }
        return {
          id: task._id.toString(),
          title: task.title,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate!.toISOString(),
          projectId: task.projectId.toString(),
          assignee,
        };
      })
    );

    res.json({ byStatus, byPriority, byUser, overdueTasks });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
