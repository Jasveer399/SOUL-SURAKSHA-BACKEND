import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";

const CreateEducationalVideoSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" }),
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters long" })
    .max(1000, { message: "Description cannot exceed 1000 characters" }),
  thumbnailUrl: z.string().url({ message: "Invalid URL format" }),
  videoUrl: z.string().url({ message: "Invalid URL format" }),
  IsForStudent: z.boolean(),
});

const createEducationalVideo = async (req, res) => {
  try {
    const { title, description, thumbnailUrl, videoUrl, IsForStudent } =
      CreateEducationalVideoSchema.parse(req.body);

    const newEducationalVideo = await prisma.educationalVideo.create({
      data: {
        title,
        description,
        thumbnailUrl,
        videoUrl,
        IsForStudent,
      },
    });
    if (!newEducationalVideo) {
      return res.status(400).json({ message: "Video creation failed" });
    }
    return res.status(200).json({ message: "Video created successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
        status: false,
      });
    }
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
      status: false,
    });
  }
};

export { createEducationalVideo };
