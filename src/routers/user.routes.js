import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getCurrentUser } from "../controllers/user.controller.js";

const router = Router();

router.get(
  "/getcurrentuser",
  verifyJWT(["student", "therapist", "parent"]),
  getCurrentUser
);

export { router as userRoutes };
