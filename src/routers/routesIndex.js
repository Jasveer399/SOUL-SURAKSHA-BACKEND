import { Router } from "express";
import { storyRoutes } from "./story.routes.js";
import { studentRoutes } from "./student.routes.js";

const router = Router();

router.use("/api/v1/student", studentRoutes);
router.use("/api/v1/story", storyRoutes);

export { router as routes };
