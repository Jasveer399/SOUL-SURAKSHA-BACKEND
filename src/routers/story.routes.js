import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addComment,
  createStory,
  deleteStory,
  editStory,
  getStories,
} from "../controllers/story.controller.js";

const router = Router();

router.post("/createstory", verifyJWT(["student"]), createStory);
router.get("/getStories", getStories);
router.put("/editstory/:stotyId", verifyJWT(["student"]), editStory);
router.delete("/deletestory/:stotyId", verifyJWT(["student"]), deleteStory);
router.post("/addcomment/:stotyId", verifyJWT(["student"]), addComment);

export { router as storyRoutes };
