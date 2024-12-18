import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createPost, getPosts } from "../controllers/post.controller.js";

const router = Router();

router.post("/createpost", verifyJWT(["user"]), createPost);
// router.post("/login", loginUser);
// router.post("/logout", verifyJWT(["user"]), logoutUser);
router.get("/getPosts", getPosts);

export { router as postRoutes };
