import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createStudent, getStudentProfile, loginStudent, logoutStudent } from "../controllers/student.controller.js";

const router = Router();

router.post("/register", createStudent);
router.post("/login", loginStudent);
router.post("/logout", verifyJWT(["student"]), logoutStudent);
router.get("/profile", verifyJWT(["student"]), getStudentProfile);

export { router as studentRoutes };