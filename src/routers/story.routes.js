import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  addComment,
  createStory,
  deleteStory,
  editStory,
  getCurrentUserStories,
  getStories,
  getStoryComments,
  toggleStoryLike,
} from "../controllers/story.controller.js";

const router = Router();

router.post("/createstory", verifyJWT(["student"]), createStory);
router.get(
  "/getStories",
  verifyJWT(["student", "parent", "therapist"]),
  getStories
);
router.put("/editstory/:stotyId", verifyJWT(["student"]), editStory);
router.delete("/deletestory/:stotyId", verifyJWT(["student"]), deleteStory);
router.post("/addcomment/:stotyId", verifyJWT(["student"]), addComment);
router.get(
  "/getCurrentUserStories",
  verifyJWT(["student"]),
  getCurrentUserStories
);
router.post(
  "/like/:storyId",
  verifyJWT(["student", "parent"]),
  toggleStoryLike
);
router.get("/getStoryComments", getStoryComments);

export { router as storyRoutes };
