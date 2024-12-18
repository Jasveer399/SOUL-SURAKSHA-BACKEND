import { z } from "zod";
import { prisma } from "../DB/prismaClientConfig.js";

// Zod validation schema for creating a post
const CreatePostSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Post content cannot be empty" })
    .max(1000, { message: "Post content cannot exceed 1000 characters" }),

  image: z.string().optional(),

  audio: z.string().optional(),
});

// Zod schema for pagination query parameters
const PostPaginationSchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
});

// Zod validation schema for editing a post
const EditPostSchema = z.object({
  postId: z.string().uuid({ message: "Invalid post ID" }),
  content: z
    .string()
    .min(1, { message: "Post content cannot be empty" })
    .max(1000, { message: "Post content cannot exceed 1000 characters" })
    .optional(),

  image: z.string().optional().nullable(),

  audio: z.string().optional().nullable(),
});

const createPost = async (req, res) => {
  try {
    // Extract and validate input using Zod
    const authorId = req.user?.id;
    const { content, image, audio } = CreatePostSchema.parse(req.body);

    // Verify that the author (user) exists
    const authorExists = await prisma.user.findUnique({
      where: {
        id: authorId,
        userType: "Student",
      },
    });

    if (!authorExists) {
      return res.status(403).json({
        message: "Only Student users are allowed to create posts",
        status: false,
      });
    }

    // Create post
    const createdPost = await prisma.post.create({
      data: {
        content,
        image,
        audio,
        authorId,
      },
      select: {
        id: true,
        content: true,
        image: true,
        audio: true,
        createdAt: true,
        authorId: true,
      },
    });

    return res.status(201).json({
      data: createdPost,
      message: "Post created successfully",
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

const getPosts = async (req, res) => {
  try {
    // Validate and parse query parameters
    const { page, limit } = PostPaginationSchema.parse(req.query);

    // Calculate pagination details
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10); // Ensure max 10 posts per request
    const skip = (pageNumber - 1) * pageSize;

    // Fetch posts with pagination and detailed relations
    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        take: pageSize,
        skip: skip,
        orderBy: {
          createdAt: "asc", // Most recent posts first
        },
        include: {
          author: {
            select: {
              id: true,
              userName: true,
              userType: true,
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
      prisma.post.count(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalPosts / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: posts.map((post) => ({
        ...post,
        commentCount: post._count.comments,
        likeCount: post._count.likes,
        author: post.author,
      })),
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalPosts,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      message: "Posts retrieved successfully",
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
      message: "Error while retrieving posts",
      error: error.message,
      status: false,
    });
  }
};

const editPost = async (req, res) => {
  try {
    // Extract user ID from authenticated request
    const userId = req.user.id; // Assumes you have authentication middleware

    // Validate input using Zod
    const { postId, content, image, audio } = EditPostSchema.parse({
      ...req.body,
      postId: req.params.postId, // Get postId from URL parameter
    });

    // First, verify the post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
        authorId: userId,
      },
      select: {
        id: true,
        authorId: true,
        author: {
          select: {
            userType: true,
          },
        },
      },
    });

    // Check if post exists
    if (!existingPost) {
      return res.status(404).json({
        message: "Post not found or you are not authorized to edit this post",
        status: false,
      });
    }

    // Ensure only Student users can edit their posts
    if (existingPost.author.userType !== "Student") {
      return res.status(403).json({
        message: "Only Student users can edit their posts",
        status: false,
      });
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (image !== undefined) updateData.image = image;
    if (audio !== undefined) updateData.audio = audio;

    // If no update fields provided, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No update fields provided",
        status: false,
      });
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      select: {
        id: true,
        content: true,
        image: true,
        audio: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            userName: true,
            userType: true,
          },
        },
      },
    });

    return res.status(200).json({
      data: updatedPost,
      message: "Post updated successfully",
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
        message: "Post not found",
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

export { createPost, getPosts, editPost };
