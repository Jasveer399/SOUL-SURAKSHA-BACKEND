import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";
import { timeAgo } from "../utils/Helper.js";
import { deleteSingleObjectFromS3 } from "./aws.controller.js";

// Zod validation schema for creating a post
const CreateStorySchema = z.object({
  content: z
    .string()
    .min(1, { message: "Story content cannot be empty" })
    .max(2500, { message: "Story content cannot exceed 2500 characters" }),
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
  storyId: z.string().uuid({ message: "Invalid Story ID" }),
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" })
    .optional(),
  content: z
    .string()
    .min(1, { message: "Story content cannot be empty" })
    .max(2500, { message: "Story content cannot exceed 2500 characters" })
    .optional(),

  image: z.string().optional().nullable(),
  imageBeforeChange: z.string().optional().nullable(),

  audio: z.string().optional().nullable(),
  audioBeforeChange: z.string().optional().nullable(),
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
        image: image || "",
        audio: audio || "",
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
    const userId = req.user?.id || null;
    const role = req.role || null;

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
              id: true,
              fullName: true,
              studentImage: true,
            },
          },
          // Only include likes check if user is logged in
          ...(userId && {
            likes: {
              where: {
                OR: [
                  { studentId: role === "student" ? userId : undefined },
                  { parentId: role === "parent" ? userId : undefined },
                  { therapistId: role === "therapist" ? userId : undefined },
                ],
              },
              select: {
                id: true,
              },
            },
          }),
          // comments: {
          //   select: {
          //     content: true,
          //     createdAt: true,
          //     student: {
          //       select: {
          //         studentImage: true,
          //         fullName: true,
          //       },
          //     },
          //   },
          // },
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
        timeAgo: timeAgo(story.createdAt),
        commentCount: story._count.comments,
        likeCount: story._count.likes,
        isLiked: userId ? story.likes?.length > 0 : false,
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

const getCurrentUserStories = async (req, res) => {
  try {
    // Validate and parse query parameters
    const { page, limit } = StoryPaginationSchema.parse(req.query);

    // Calculate pagination details
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10); // Ensure max 10 posts per request
    const skip = (pageNumber - 1) * pageSize;

    // Get the current user's ID from the authenticated session
    const userId = req.user.id;

    // Fetch current user's stories with pagination and detailed relations
    const [stories, totalStories] = await Promise.all([
      prisma.story.findMany({
        where: {
          studentId: userId, // Filter stories by current user's ID
        },
        take: pageSize,
        skip: skip,
        orderBy: {
          createdAt: "desc", // Most recent stories first
        },
        include: {
          student: {
            select: {
              fullName: true,
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
                  fullName: true,
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
      prisma.story.count({
        where: {
          studentId: userId, // Count only current user's stories
        },
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalStories / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: stories.map((story) => ({
        ...story,
        comments: story?.comments?.map((comment) => ({
          content: comment?.content,
          studentImage: comment.student?.studentImage,
          fullName: comment.student?.fullName,
          timeAgo: timeAgo(comment?.createdAt),
        })),
        timeAgo: timeAgo(story?.createdAt),
        commentCount: story._count?.comments,
        likeCount: story._count?.likes,
      })),
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalStories,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      message: "Your stories retrieved successfully",
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
      message: "Error while retrieving your stories",
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
    const {
      storyId,
      title,
      content,
      image,
      audio,
      imageBeforeChange,
      audioBeforeChange,
    } = EditStorySchema.parse({
      ...req.body,
      storyId: req.params.storyId, // Get storyId from URL parameter
    });

    // First, verify the post exists and belongs to the user
    const existingStory = await prisma.story.findUnique({
      where: {
        id: storyId,
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

    if (imageBeforeChange) {
      await deleteSingleObjectFromS3(imageBeforeChange);
    }
    if (audioBeforeChange) {
      await deleteSingleObjectFromS3(audioBeforeChange);
    }

    // Update the post
    const updatedStory = await prisma.story.update({
      where: { id: storyId },
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
            fullName: true,
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
    const { storyId } = req.params;

    // First, verify the story exists and belongs to the user
    const existingStory = await prisma.story.findUnique({
      where: {
        id: storyId,
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
    const deletedStory = await prisma.story.delete({
      where: { id: storyId },
      select: {
        image: true,
        audio: true,
      },
    });

    if (deletedStory.image) {
      await deleteSingleObjectFromS3(deletedStory.image);
    }
    if (deletedStory.audio) {
      await deleteSingleObjectFromS3(deletedStory.audio);
    }

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
    const { storyId } = req.params;
    const { comment } = req.body;
    const userRole = req.role;
    const userId = req.user.id;

    // Find the story
    const story = await prisma.story.findUnique({
      where: { id: storyId },
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
        ...(userRole === "student"
          ? { studentId: userId }
          : userRole === "parent"
          ? { parentId: userId }
          : {
              therapistId: userId,
            }),
        storyId: storyId,
      },
      select: {
        content: true,
        createdAt: true,

        ...(userRole === "student"
          ? {
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentImage: true,
                },
              },
            }
          : userRole === "parent"
          ? {
              parent: {
                select: {
                  id: true,
                  fullName: true,
                  parentImage: true,
                },
              },
            }
          : {
              therapist: {
                select: {
                  id: true,
                  userName: true,
                  therapistImage: true,
                },
              },
            }),
      },
    });

    let newCommentData;
    if (userRole === "student") {
      newCommentData = {
        id: newComment.student.id,
        name: newComment.student.fullName,
        image: newComment.student.studentImage,
        createdAt: newComment.createdAt,
        content: newComment.content,
      };
    }
    if (userRole === "parent") {
      newCommentData = {
        id: newComment.parent.id,
        name: newComment.parent.fullName,
        image: newComment.parent.parentImage,
        createdAt: newComment.createdAt,
        content: newComment.content,
      };
    }
    if (userRole === "therapist") {
      newCommentData = {
        id: newComment.therapist.id,
        name: newComment.therapist.userName,
        image: newComment.therapist.therapistImage,
        createdAt: newComment.createdAt,
        content: newComment.content,
      };
    }
    return res.status(200).json({
      data: {
        user: newCommentData,
        content: newComment.content,
        createdAt: newComment.createdAt,
        userType: userRole.toUpperCase(),
      },
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

// const getStoryComments = async (req, res) => {
//   try {
//     const { storyId, page = 1, limit = 10 } = req.query;

//     // Convert to numbers and validate
//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     // Validate page and limit
//     if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
//       return res.status(400).json({
//         message: "Invalid pagination parameters",
//         status: false,
//       });
//     }

//     // Calculate skip value for pagination
//     const skip = (pageNum - 1) * limitNum;

//     // Get total count of comments
//     const totalComments = await prisma.comment.count({
//       where: { storyId },
//     });

//     // Get paginated comments
//     const storyComments = await prisma.story.findFirstOrThrow({
//       where: { id: storyId },
//       select: {
//         comments: {
//           skip,
//           take: limitNum,
//           select: {
//             content: true,
//             createdAt: true,
//             student: {
//               select: {
//                 id: true,
//                 fullName: true,
//                 studentImage: true,
//               },
//             },
//             parent: {
//               select: {
//                 id: true,
//                 fullName: true,
//                 parentImage: true,
//               },
//             },
//             therapist: {
//               select: {
//                 id: true,
//                 userName: true,
//                 therapistImage: true,
//               },
//             },
//           },
//           orderBy: {
//             createdAt: "desc", // Most recent comments first
//           },
//         },
//       },
//     });

//     // Calculate pagination metadata
//     const totalPages = Math.ceil(totalComments / limitNum);
//     const hasNextPage = pageNum < totalPages;
//     const hasPrevPage = pageNum > 1;

//     return res.status(200).json({
//       data: storyComments.comments,
//       pagination: {
//         currentPage: pageNum,
//         totalPages,
//         totalComments,
//         hasNextPage,
//         hasPrevPage,
//         limit: limitNum,
//       },
//       message: "Comments retrieved successfully",
//       status: true,
//     });
//   } catch (error) {
//     if (error.code === "P2025") {
//       return res.status(404).json({
//         message: "Story not found",
//         status: false,
//       });
//     }

//     return res.status(500).json({
//       message: "Error while getting comments",
//       error: error.message,
//       status: false,
//     });
//   }
// };
const getStoryComments = async (req, res) => {
  try {
    const { storyId, page = 1, limit = 10 } = req.query;

    // Convert to numbers and validate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Validate page and limit
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        message: "Invalid pagination parameters",
        status: false,
      });
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Get total count of comments
    const totalComments = await prisma.comment.count({
      where: { storyId },
    });

    // Get paginated comments
    const storyComments = await prisma.story.findFirstOrThrow({
      where: { id: storyId },
      select: {
        comments: {
          skip,
          take: limitNum,
          select: {
            id: true,
            content: true,
            createdAt: true,
            student: {
              select: {
                id: true,
                fullName: true,
                studentImage: true,
              },
            },
            parent: {
              select: {
                id: true,
                fullName: true,
                parentImage: true,
              },
            },
            therapist: {
              select: {
                id: true,
                userName: true,
                therapistImage: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc", // Most recent comments first
          },
        },
      },
    });

    // Transform the comments to include userType and normalize the user data
    const transformedComments = storyComments.comments.map((comment) => {
      let userData = null;
      let userType = null;

      if (comment.student) {
        userData = {
          id: comment.student.id,
          name: comment.student.fullName,
          image: comment.student.studentImage,
        };
        userType = "STUDENT";
      } else if (comment.parent) {
        userData = {
          id: comment.parent.id,
          name: comment.parent.fullName,
          image: comment.parent.parentImage,
        };
        userType = "PARENT";
      } else if (comment.therapist) {
        userData = {
          id: comment.therapist.id,
          name: comment.therapist.userName,
          image: comment.therapist.therapistImage,
        };
        userType = "THERAPIST";
      }

      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        userType,
        user: userData,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalComments / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return res.status(200).json({
      data: transformedComments,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalComments,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
      message: "Comments retrieved successfully",
      status: true,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Story not found",
        status: false,
      });
    }

    return res.status(500).json({
      message: "Error while getting comments",
      error: error.message,
      status: false,
    });
  }
};
const toggleStoryLike = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;
    const userRole = req.role;

    // Verify story exists
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return res.status(404).json({
        message: "Story not found",
        status: false,
      });
    }

    // Check for existing like
    const existingLike = await prisma.like.findFirst({
      where: {
        storyId,
        ...(userRole === "student"
          ? { studentId: userId }
          : userRole === "parent"
          ? { parentId: userId }
          : {
              therapistId: userId,
            }),
      },
    });

    if (existingLike) {
      // Unlike if like exists
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      return res.status(200).json({
        message: "Successfully unliked the story",
        status: true,
        liked: false,
      });
    }

    // Create new like
    await prisma.like.create({
      data: {
        storyId,
        ...(userRole === "student"
          ? { studentId: userId }
          : userRole === "parent"
          ? { parentId: userId }
          : {
              therapistId: userId,
            }),
      },
    });

    return res.status(200).json({
      message: "Successfully liked the story",
      status: true,
      liked: true,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);
    return res.status(500).json({
      message: "Error while toggling like",
      status: false,
      error: error.message,
    });
  }
};

const getTopThreeLikedStoryes = async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      take: 3,
      orderBy: {
        likes: {
          _count: "desc",
        },
      },
      select: {
        image: true,
        title: true,
        content: true,
        student: {
          select: {
            studentImage: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });
    return res.status(200).json({
      data: stories,
      message: "Top 3 liked stories retrieved successfully",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error while retrieving top 3 liked stories",
      error: error.message,
      status: false,
    });
  }
};

export {
  createStory,
  getStories,
  getCurrentUserStories,
  editStory,
  deleteStory,
  addComment,
  getStoryComments,
  toggleStoryLike,
  getTopThreeLikedStoryes,
};
