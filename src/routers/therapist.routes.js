import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createTherapist, loginTherapist, logoutTherapist } from "../controllers/therapist.controller.js";

const router = Router();

router.post("/createTherapist", createTherapist);
router.post("/login", loginTherapist);
router.get("/logout", verifyJWT(["therapist"]), logoutTherapist);

export default router
