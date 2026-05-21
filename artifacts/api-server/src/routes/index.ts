import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";
import usersRouter from "./users.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/users", usersRouter);
router.use("/dashboard", dashboardRouter);

export default router;
