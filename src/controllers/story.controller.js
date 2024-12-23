import { z } from "zod";
import { prisma } from "../DB/prismaClientConfig.js";
import { timeAgo } from "../utils/Helper.js";

// Zod validation schema for creating a post
const CreateStorySchema = z.object({
  content: z
    .string()
    .min(1, { message: "Story content cannot be empty" })
    .max(1000, { message: "Story content cannot exceed 1000 characters" }),
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" })
    .optional(),

  image: z.string().optional(),

  audio: z.string().optional(),
});

// Zod schema for pagination query parameters
const StoryPaginationSchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
});

// Zod validation schema for editing a post
const EditStorySchema = z.object({
  stotyId: z.string().uuid({ message: "Invalid Story ID" }),
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" })
    .optional(),
  content: z
    .string()
    .min(1, { message: "Story content cannot be empty" })
    .max(1000, { message: "Story content cannot exceed 1000 characters" })
    .optional(),

  image: z.string().optional().nullable(),

  audio: z.string().optional().nullable(),
});

const createStory = async (req, res) => {
  try {
    // Extract and validate input using Zod
    const studentId = req.user?.id;
    const { title, content, image, audio } = CreateStorySchema.parse(req.body);

    // Verify that the author (user) exists
    const authorExists = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!authorExists) {
      return res.status(403).json({
        message: "You are not authorized to create a post",
        status: false,
      });
    }

    // Create post
    const createdPost = await prisma.story.create({
      data: {
        title,
        content,
        image,
        audio,
        studentId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        audio: true,
        createdAt: true,
        studentId: true,
      },
    });

    return res.status(201).json({
      data: createdPost,
      message: "Story created successfully",
      status: true,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    // Handle other errors
    console.error(error);
    return res.status(500).json({
      message: "Error while creating post",
      error: error.message,
      status: false,
    });
  }
};

const getStories = async (req, res) => {
  try {
    // Validate and parse query parameters
    const { page, limit } = StoryPaginationSchema.parse(req.query);

    // Calculate pagination details
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10); // Ensure max 10 posts per request
    const skip = (pageNumber - 1) * pageSize;

    // Fetch posts with pagination and detailed relations
    const [stories, totalStories] = await Promise.all([
      prisma.story.findMany({
        take: pageSize,
        skip: skip,
        orderBy: {
          createdAt: "desc", // Most recent stories first
        },
        include: {
          student: {
            select: {
              userName: true,
              studentImage: true,
            },
          },
          comments: {
            select: {
              content: true,
              createdAt: true,
              student: {
                select: {
                  studentImage: true,
                  userName: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.story.count(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalStories / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: stories.map((story) => ({
        ...story,
        comments: story.comments.map((comment) => ({
          content: comment.content,
          studentImage: comment.student.studentImage,
          userName: comment.student.userName,
          timeAgo: timeAgo(comment.createdAt),
        })),
        timeAgo: timeAgo(story.createdAt),
        commentCount: story._count.comments,
        likeCount: story._count.likes,
      })),
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalStories,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      message: "Stories retrieved successfully",
      status: true,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    // Handle other errors
    console.error(error);
    return res.status(500).json({
      message: "Error while retrieving story",
      error: error.message,
      status: false,
    });
  }
};

const editStory = async (req, res) => {
  try {
    // Extract user ID from authenticated request
    const userId = req.user.id; // Assumes you have authentication middleware

    // Validate input using Zod
    const { stotyId, title, content, image, audio } = EditStorySchema.parse({
      ...req.body,
      stotyId: req.params.stotyId, // Get stotyId from URL parameter
    });

    // First, verify the post exists and belongs to the user
    const existingStory = await prisma.story.findUnique({
      where: {
        id: stotyId,
        studentId: userId,
      },
      select: {
        id: true,
        studentId: true,
      },
    });

    // Check if story exists
    if (!existingStory) {
      return res.status(404).json({
        message: "Story not found or you are not authorized to edit this post",
        status: false,
      });
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (image !== undefined) updateData.image = image;
    if (title !== undefined) updateData.title = title;
    if (audio !== undefined) updateData.audio = audio;

    // If no update fields provided, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No update fields provided",
        status: false,
      });
    }

    // Update the post
    const updatedStory = await prisma.story.update({
      where: { id: stotyId },
      data: updateData,
      select: {
        id: true,
        content: true,
        image: true,
        audio: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            userName: true,
          },
        },
      },
    });

    return res.status(200).json({
      data: updatedStory,
      message: "Story updated successfully",
      status: true,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    // Handle Prisma not found errors
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Story not found",
        status: false,
      });
    }

    // Handle other errors
    console.error(error);
    return res.status(500).json({
      message: "Error while updating post",
      error: error.message,
      status: false,
    });
  }
};

const deleteStory = async (req, res) => {
  try {
    const { stotyId } = req.params;

    // First, verify the story exists and belongs to the user
    const existingStory = await prisma.story.findUnique({
      where: {
        id: stotyId,
        studentId: req.user.id,
      },
      select: {
        id: true,
        studentId: true,
      },
    });

    // Check if story exists
    if (!existingStory) {
      return res.status(404).json({
        message:
          "Story not found or you are not authorized to delete this post",
        status: false,
      });
    }

    // Delete the post
    await prisma.story.delete({
      where: { id: stotyId },
    });

    return res.status(200).json({
      message: "Story deleted successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while deleting post",
      error: error.message,
      status: false,
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { stotyId } = req.params;
    const { comment } = req.body;

    // Find the story
    const story = await prisma.story.findUnique({
      where: { id: stotyId },
    });

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
        status: false,
      });
    }

    // Create the comment
    const newComment = await prisma.comment.create({
      data: {
        content: comment,
        studentId: req.user.id,
        storyId: stotyId,
      },
    });

    return res.status(200).json({
      data: newComment,
      message: "Comment added successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while adding comment",
      error: error.message,
      status: false,
    });
  }
};

export { createStory, getStories, editStory, deleteStory, addComment };
