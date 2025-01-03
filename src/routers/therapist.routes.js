import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createTherapist, editTherapist, getAllTherapist, loginTherapist, logoutTherapist } from "../controllers/therapist.controller.js";

const router = Router();

router.post("/createTherapist", createTherapist);
router.post("/login", loginTherapist);
router.get("/logout", verifyJWT(["therapist"]), logoutTherapist);
router.put("/editTherapist", verifyJWT(["therapist"]), editTherapist);
router.get("/getAllTherapist", getAllTherapist);

export default router
