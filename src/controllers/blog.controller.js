import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";

const CreateBlogSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" }),
  content: z.string().min(1, { message: "Story content cannot be empty" }),
  image: z.string().optional(),
});

const createBlog = async (req, res) => {
    const { title, content, image } = CreateBlogSchema.parse(req.body);
  try {
    const blog = await prisma.blog.create({
      data: {
        title,
        content,
        image,
      },
    });
    return res.status(200).json({
      message: "Blog created successfully",
      data: blog,
      status: true,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: error.message,
      image: image,
      error: error,
      status: false,
    });
  }
};

export { createBlog };
