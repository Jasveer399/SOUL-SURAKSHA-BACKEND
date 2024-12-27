import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { handleSingleUpload } from "../controllers/aws.controller.js";

const router = Router();

router.get("/getputurl", handleSingleUpload);

export default router
