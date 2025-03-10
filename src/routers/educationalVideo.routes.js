import { Router } from "express";
import { createEducationalVideo } from "../controllers/educationalVideo.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/createEducationalVideo",
  //   verifyJWT(["admin"]),
  createEducationalVideo
);

export { router as educationalVideoRoutes };
