import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getConversation, getMessages, sendMessage } from "../controllers/messages.controller.js";

const router = Router();

router.post("/sendMessage", verifyJWT(["student", "therapist"]), sendMessage);
router.get("/getMessages/:otherUserId", verifyJWT(["student", "therapist"]), getMessages);
router.get("/getConversation", verifyJWT(["student", "therapist"]), getConversation);

export default router
