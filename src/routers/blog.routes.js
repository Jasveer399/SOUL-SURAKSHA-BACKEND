import { Router } from "express";
import {
  createBlog,
  getBlog,
  getBlogs,
} from "../controllers/blog.controller.js";

const router = Router();

router.post("/createBlog", createBlog);
router.get("/getBlogs", getBlogs);
router.get("/getBlog/:id", getBlog);

export { router as blogRoutes };
