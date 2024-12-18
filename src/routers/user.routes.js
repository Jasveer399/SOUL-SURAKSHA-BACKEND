import { Router } from "express";
import {
  createUser,
  getUserProfile,
  loginUser,
  logoutUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT(["user"]), logoutUser);
router.get("/profile", verifyJWT(["user"]), getUserProfile);

export { router as userRoutes };