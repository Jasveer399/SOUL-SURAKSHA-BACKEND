import { Router } from "express";
import { userRoutes } from "./user.routes.js";
import { postRoutes } from "./post.routes.js";

const router = Router();

router.use("/api/v1/user", userRoutes);
router.use("/api/v1/post", postRoutes);

export { router as routes };
