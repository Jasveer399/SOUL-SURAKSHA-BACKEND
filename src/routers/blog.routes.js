import { Router } from "express";
import { createBlog } from "../controllers/blog.controller.js";

const router = Router();

router.post("/createBlog", createBlog);


export { router as blogRoutes };