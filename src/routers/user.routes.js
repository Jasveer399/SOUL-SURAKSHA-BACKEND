import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createUser,
  createUserAndGetOtp,
  editUser,
  getCurrentUser,
  googleOauthHandler,
  loginUser,
  verifyOtp,
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

router.get("/googleAuth", googleOauthHandler);
router.post("/createUserAndGetOtp", createUserAndGetOtp);
router.post("/verifyOtp", verifyOtp);
export { router as userRoutes };
