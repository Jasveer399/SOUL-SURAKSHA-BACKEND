import { Router } from "express";
import {
  createBlog,
  getBlog,
  getBlogs,
  getTopViewedBlogs,
  searchBlogs,
} from "../controllers/blog.controller.js";

const router = Router();

router.post("/createBlog", createBlog);
router.get("/getBlogs", getBlogs);
router.get("/getBlog/:id", getBlog);
router.get("/getTopViewedBlogs", getTopViewedBlogs);
router.get("/searchBlogs", searchBlogs);
export { router as blogRoutes };
