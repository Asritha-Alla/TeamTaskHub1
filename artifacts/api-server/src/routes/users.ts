import { Router } from "express";
import { User } from "../models/User.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/users
router.get("/", async (req: AuthRequest, res) => {
  try {
    const users = await User.find({}, "-password").sort({ name: 1 });
    const result = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
