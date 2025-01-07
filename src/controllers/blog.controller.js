import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";
import { generateBlogContext, timeAgo } from "../utils/Helper.js";

const CreateBlogSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Title must be at least 2 characters long" })
    .max(50, { message: "Title cannot exceed 50 characters" }),
  content: z.string().min(1, { message: "Blog content cannot be empty" }),
  blogCategory: z.string().optional(),
  image: z.string().optional(),
});

const BlogPaginationSchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10"),
});

const createBlog = async (req, res) => {
  const { title, content, image, blogCategory } = CreateBlogSchema.parse(
    req.body
  );
  const summary = await generateBlogContext(content);
  try {
    const blog = await prisma.blog.create({
      data: {
        title,
        content,
        summary,
        blogCategory,
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

const getBlogs = async (req, res) => {
  try {
    const { page, limit } = BlogPaginationSchema.parse(req.query);

    const pageNumber = Math.max(page, 1);
    const pageSize = Math.min(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Fix: Add count query to Promise.all
    const [blogs, totalBlogs] = await Promise.all([
      prisma.blog.findMany({
        take: pageSize,
        skip: skip,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          image: true,
          summary: true,
          title: true,
          createdAt: true,
        },
      }),
      prisma.blog.count(), // Add this count query
    ]);

    const totalPages = Math.ceil(totalBlogs / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return res.status(200).json({
      data: blogs.map((blog) => ({
        ...blog,
        timeAgo: timeAgo(blog.createdAt),
      })),
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalBlogs,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      message: "Blogs retrieved successfully",
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
      message: "Error while retrieving blogs",
      error: error.message,
      status: false,
    });
  }
};

const getBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Get blog and increment view count in a single transaction
    const blog = await prisma.$transaction(async (prisma) => {
      // First get the blog
      const blog = await prisma.blog.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          summary: true,
          image: true,
          viewCount: true,
          createdAt: true,
          blogCategory: true,
        },
      });

      if (!blog) {
        return null;
      }

      // Increment view count
      await prisma.blog.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return blog;
    });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
        status: false,
      });
    }

    const createdOn = new Date(blog.createdAt).toLocaleDateString("en-us", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata", // Indian timezone
    });

    return res.status(200).json({
      data: {
        ...blog,
        viewCount: blog.viewCount + 1,
        createdOn,
        timeAgo: timeAgo(blog.createdAt),
      },
      message: "Blog retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while retrieving blog",
      error: error.message,
      status: false,
    });
  }
};

// Get top 5 most viewed blogs
const getTopViewedBlogs = async (req, res) => {
  try {
    const topBlogs = await prisma.blog.findMany({
      take: 5,
      orderBy: {
        viewCount: "desc",
      },
      select: {
        id: true,
        image: true,
      },
    });

    if (!topBlogs.length) {
      return res.status(404).json({
        success: false,
        message: "No blogs found",
      });
    }

    return res.status(200).json({
      success: true,
      data: topBlogs,
      message: "Top 5 viewed blogs retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching top viewed blogs",
      error: error,
    });
  }
};

export { createBlog, getBlogs, getBlog, getTopViewedBlogs };
