import { Router } from "express";
import { storyRoutes } from "./story.routes.js";
import { studentRoutes } from "./student.routes.js";
import therapistRoutes from "./therapist.routes.js";
import messagesRoutes from "./messages.routes.js";
import awsRoutes from "./aws.routes.js";

const router = Router();

router.use("/api/v1/student", studentRoutes);
router.use("/api/v1/story", storyRoutes);
router.use("/api/v1/therapist", therapistRoutes);
router.use("/api/v1/messages", messagesRoutes);
router.use("/api/v1/aws", awsRoutes);

export { router as routes };
