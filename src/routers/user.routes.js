import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createUser,
  editUser,
  getCurrentUser,
  loginUser,
} from "../controllers/user.controller.js";
import { validateUserType } from "../middleware/validateUserType.js";

const router = Router();

router.get(
  "/getcurrentuser",
  verifyJWT(["student", "therapist", "parent", "admin"]),
  getCurrentUser
);
router.post("/createUser", validateUserType, createUser);
router.post("/loginUser", validateUserType, loginUser);
router.put(
  "/editUser",
  validateUserType,
  verifyJWT(["student", "therapist", "parent"]),
  editUser
);
export { router as userRoutes };
