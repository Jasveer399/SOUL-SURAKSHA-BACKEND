import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createUser, getCurrentUser } from "../controllers/user.controller.js";
import { validateUserType } from "../middleware/validateUserType.js";

const router = Router();

router.get(
  "/getcurrentuser",
  verifyJWT(["student", "therapist", "parent"]),
  getCurrentUser
);
router.post('/createUser', validateUserType, createUser);
export { router as userRoutes };
