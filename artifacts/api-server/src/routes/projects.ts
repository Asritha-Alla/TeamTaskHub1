import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Activity } from "../models/Activity.js";
import { User } from "../models/User.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getMemberDetails(project: InstanceType<typeof Project>) {
  const userIds = project.members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  return project.members.map((m) => {
    const u = userMap.get(m.userId.toString());
    return {
      userId: m.userId.toString(),
      role: m.role,
      name: u?.name ?? "Unknown",
      email: u?.email ?? "",
      avatarColor: u?.avatarColor ?? "#6366f1",
    };
  });
}

async function enrichProject(project: InstanceType<typeof Project>, requestingUserId: string) {
  const [taskCount, completedTaskCount] = await Promise.all([
    Task.countDocuments({ projectId: project._id }),
    Task.countDocuments({ projectId: project._id, status: "done" }),
  ]);
  const myMember = project.members.find((m) => m.userId.toString() === requestingUserId);
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    ownerId: project.ownerId.toString(),
    members: project.members.map((m) => ({ userId: m.userId.toString(), role: m.role })),
    taskCount,
    completedTaskCount,
    myRole: myMember?.role ?? "member",
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function isMember(project: InstanceType<typeof Project>, userId: string): boolean {
  return project.members.some((m) => m.userId.toString() === userId);
}

function isAdmin(project: InstanceType<typeof Project>, userId: string): boolean {
  return project.members.some((m) => m.userId.toString() === userId && m.role === "admin");
}

// GET /api/projects
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const projects = await Project.find({ "members.userId": userId }).sort({ updatedAt: -1 });
    const enriched = await Promise.all(projects.map((p) => enrichProject(p, req.userId!)));
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
      members: [{ userId, role: "admin" }],
    });

    await Activity.create({
      type: "project_created",
      message: `Created project "${project.name}"`,
      userId,
      userName: req.userName,
      entityId: project._id.toString(),
      entityName: project.name,
    });

    res.status(201).json(await enrichProject(project, req.userId!));
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
    if (!isMember(project, req.userId!)) {
      res.status(403).json({ error: "You are not a member of this project" });
      return;
    }
    res.json(await enrichProject(project, req.userId!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isAdmin(project, req.userId!)) {
      res.status(403).json({ error: "Only project admins can update this project" });
      return;
    }
    const { name, description, color } = req.body;
    Object.assign(project, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
    });
    await project.save();
    res.json(await enrichProject(project, req.userId!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isAdmin(project, req.userId!)) {
      res.status(403).json({ error: "Only project admins can delete this project" });
      return;
    }
    await Project.findByIdAndDelete(req.params["id"]);
    await Task.deleteMany({ projectId: req.params["id"] });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/projects/:id/members
router.get("/:id/members", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isMember(project, req.userId!)) {
      res.status(403).json({ error: "You are not a member of this project" });
      return;
    }
    res.json(await getMemberDetails(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects/:id/members
router.post("/:id/members", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isAdmin(project, req.userId!)) {
      res.status(403).json({ error: "Only project admins can add members" });
      return;
    }
    const { email, role = "member" } = req.body;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      res.status(404).json({ error: `No user found with email ${email}` });
      return;
    }
    const alreadyMember = project.members.some(
      (m) => m.userId.toString() === targetUser._id.toString()
    );
    if (alreadyMember) {
      res.status(400).json({ error: "User is already a member of this project" });
      return;
    }
    project.members.push({ userId: targetUser._id, role: role as "admin" | "member" });
    await project.save();
    res.json(await getMemberDetails(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete("/:id/members/:userId", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isAdmin(project, req.userId!)) {
      res.status(403).json({ error: "Only project admins can remove members" });
      return;
    }
    const targetUserId = req.params["userId"];
    const targetMember = project.members.find((m) => m.userId.toString() === targetUserId);
    if (!targetMember) {
      res.status(404).json({ error: "Member not found in this project" });
      return;
    }
    // Prevent removing the last admin
    const admins = project.members.filter((m) => m.role === "admin");
    if (targetMember.role === "admin" && admins.length === 1) {
      res.status(400).json({ error: "Cannot remove the last admin. Promote another member first." });
      return;
    }
    project.members = project.members.filter((m) => m.userId.toString() !== targetUserId) as typeof project.members;
    await project.save();
    res.json(await getMemberDetails(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/projects/:id/members/:userId/role
router.patch("/:id/members/:userId/role", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findById(req.params["id"]);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!isAdmin(project, req.userId!)) {
      res.status(403).json({ error: "Only project admins can change member roles" });
      return;
    }
    const { role } = req.body;
    if (!role || !["admin", "member"].includes(role)) {
      res.status(400).json({ error: "role must be 'admin' or 'member'" });
      return;
    }
    const targetUserId = req.params["userId"];
    const targetMember = project.members.find((m) => m.userId.toString() === targetUserId);
    if (!targetMember) {
      res.status(404).json({ error: "Member not found in this project" });
      return;
    }
    // Prevent demoting the last admin
    if (targetMember.role === "admin" && role === "member") {
      const admins = project.members.filter((m) => m.role === "admin");
      if (admins.length === 1) {
        res.status(400).json({ error: "Cannot demote the last admin. Promote another member first." });
        return;
      }
    }
    targetMember.role = role as "admin" | "member";
    await project.save();
    res.json(await getMemberDetails(project));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
