import { z } from "zod";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer"; // Import Nodemailer
import { generateAccessToken } from "../utils/generateAccessToken.js";
import { prisma } from "../db/prismaClientConfig.js";
import { deleteSingleObjectFromS3 } from "./aws.controller.js";
import { accessTokenGenerator } from "../utils/Helper.js";
import { timeAgo } from "../utils/Helper.js";
import { generateOTP } from "../utils/otpUtils.js"; // Import generateOTP

// Zod validation schema for user creation
const CreateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "fullName must be at least 2 characters long" })
    .max(50, { message: "fullName cannot exceed 50 characters" }),

  phone: z.string(),

  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      {
        message:
          "Password must include uppercase, lowercase, number, and special character",
      }
    ),

  // age: z.number().int().min(0).max(120).optional(),

  dob: z.string().optional(),

  profileImage: z.string().optional(),

  gender: z.string().optional(),

  trustPhoneNo: z.string().optional(),
});

const EditUserSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "fullName must be at least 2 characters long" })
    .max(50, { message: "fullName cannot exceed 50 characters" }),

  age: z.number().int().min(0).max(120).optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),

  profileImage: z.string().optional(),

  trustPhoneNo: z.string().optional(),
  imageBeforeChange: z.string().optional().nullable(),
});

// Zod validation schema for user login
const UserLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
  password: z.string().min(1, { message: "Password is required" }),
  otp: z.string().optional(), // OTP is optional initially
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // e.g., 'gmail'
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

// Function to send OTP via email
export const sendOTP = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // Sender address
      to: email, // List of receivers
      subject: "OTP Verification", // Subject line
      html: `<p>Your OTP for login is: <b>${otp}</b></p>`, // HTML body content
    });
    console.log("OTP email sent successfully");
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

const createStudent = async (req, res) => {
  try {
    // Validate input using Zod
    const {
      fullName,
      phone,
      email,
      password,
      dob,
      profileImage,
      trustPhoneNo,
      gender,
    } = CreateUserSchema.parse(req.body);

    const [parentCheck, therapistCheck] = await prisma.$transaction([
      prisma.parent.findUnique({
        where: { email: email },
        select: { phone: true },
      }),
      prisma.therapist.findUnique({
        where: { email: email },
        select: { phone: true },
      }),
    ]);

    if (parentCheck) {
      return res.status(409).json({
        message: "Email already registered as a parent",
        status: false,
      });
    }
    if (therapistCheck) {
      return res.status(409).json({
        message: "Email already registered as a therapist",
        status: false,
      });
    }
    // Check if email already exists
    const emailExists = await prisma.student.findUnique({
      where: { email },
    });

    if (emailExists) {
      return res.status(409).json({
        message: "Email already exists",
        status: false,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const createdStudent = await prisma.student.update({
      where: {
        phone,
      },
      data: {
        fullName,
        phone,
        email,
        studentImage: profileImage,
        password: hashedPassword,
        gender,
        trustPhoneNo,
        dob,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        dob: true,
        createdAt: true,
        gender: true,
        trustPhoneNo: true,
      },
    });
    const { accessToken } = await accessTokenGenerator(
      createStudent.id,
      "student"
    );

    return res.status(201).json({
      data: createdStudent,
      userType: "student",
      accessToken,
      message: "User created successfully",
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
      message: "Error while creating user",
      error: error.message,
      status: false,
    });
  }
};

const editStudent = async (req, res) => {
  try {
    const {
      fullName,
      age,
      profileImage,
      gender,
      dob,
      trustPhoneNo,
      imageBeforeChange,
    } = EditUserSchema.parse(req.body);

    const studentId = req.user.id;

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        fullName,
        age,
        studentImage: profileImage,
        gender,
        dob,
        trustPhoneNo,
      },
      select: {
        fullName: true,
        age: true,
        studentImage: true,
        gender: true,
        dob: true,
        trustPhoneNo: true,
      },
    });
    if (imageBeforeChange) {
      await deleteSingleObjectFromS3(imageBeforeChange);
    }
    return res.status(200).json({
      data: updatedStudent,
      message: "User updated successfully",
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
      message: "Error while updating user",
      error: error.message,
      status: false,
    });
  }
};

const loginStudent = async (req, res) => {
  try {
    // Validate input using Zod
    const { email, password, otp } = UserLoginSchema.parse(req.body);

    // Find user
    const user = await prisma.student.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Check your email correctly",
        status: false,
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Password",
        status: false,
      });
    }

    // Check if this is an OTP verification request
    if (otp) {
      // If OTP is provided, verify it
      if (user.otp !== otp) {
        return res.status(400).json({
          message: "Invalid OTP",
          status: false,
        });
      }

      // Clear OTP after successful verification
      await prisma.student.update({
        where: { email: email },
        data: { otp: null, isMailOtpVerify: true },
      });

      // Generate access token
      const { accessToken } = await accessTokenGenerator(user.id, "student");

      // Respond with token and user details
      return res.status(200).json({
        data: {
          id: user.id,
          email: user.email,
          userType: "student",
        },
        accessToken,
        message: "Logged In Successfully",
        status: true,
      });
    } else {
      // If OTP is not provided, generate and send OTP
      const generatedOTP = generateOTP(); // Generate 4-digit OTP
      console.log("otp:", generatedOTP);

      // Store OTP in the database
      await prisma.student.update({
        where: { email: email },
        data: { otp: generatedOTP },
      });

      // Send OTP via email
      try {
        await sendOTP(email, generatedOTP);
      } catch (error) {
        return res.status(500).json({
          message: "Failed to send OTP email",
          status: false,
        });
      }

      return res.status(200).json({
        message: "OTP sent to your email. Please verify.",
        status: true,
        requiresOTP: true, // Indicate that OTP is required
      });
    }
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
      message: "Error while logging in",
      error: error.message,
      status: false,
    });
  }
};

const logoutStudent = async (req, res) => {
  try {
    // Verify user exists
    await prisma.student.findFirstOrThrow({
      where: { id: req.user?.id },
    });

    return res.status(200).json({
      message: "Logged out Successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while logging out user",
      error: error.message,
      status: false,
    });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    // Get user profile
    const user = await prisma.student.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        age: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    return res.status(200).json({
      data: user,
      message: "User profile retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while retrieving user profile",
      error: error.message,
      status: false,
    });
  }
};

const getAllStudents = async (_, res) => {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        studentImage: true,
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    const formattedStudents = students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      studentImage: student.studentImage,
      storiesCount: student._count.stories,
    }));

    return res.status(200).json({
      data: formattedStudents,
      message: "All Students fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while fetching all students",
      error: error.message,
      status: false,
    });
  }
};

const getStudentProfileDetails = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Parse and validate pagination parameters
    const { page, limit } = StudentStoriesPaginationSchema.parse({
      page: req.query.page || "1",
      limit: req.query.limit || "10",
    });

    // Calculate pagination offsets
    const skip = (page - 1) * limit;

    // Get student details
    const studentDetails = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        studentImage: true,
        quizScore: true,
        _count: {
          select: {
            stories: true,
          },
        },
      },
    });

    if (!studentDetails) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    // Get total stories count for this student
    const totalStories = studentDetails._count.stories;

    // Get paginated stories with comments and likes
    const stories = await prisma.story.findMany({
      where: {
        studentId: studentId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        audio: true,
        audioDuration: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentImage: true,
          },
        },
        comments: {
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
          },
        },
        likes: {
          select: {
            id: true,
            student: {
              select: {
                id: true,
                fullName: true,
                studentImage: true,
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
      orderBy: {
        createdAt: "desc",
      },
      skip: skip,
      take: limit,
    });

    // Format stories with additional data
    const formattedStories = stories.map((story) => ({
      id: story.id,
      title: story.title,
      content: story.content,
      image: story.image,
      audio: story.audio,
      audioDuration: story.audioDuration,
      createdAt: story.createdAt,
      timeAgo: timeAgo(story.createdAt),
      student: story.student,
      comments: story.comments.map((comment) => ({
        ...comment,
        timeAgo: timeAgo(comment.createdAt),
      })),
      commentsCount: story._count.comments,
      likes: story.likes,
      likesCount: story._count.likes,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalStories / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return res.status(200).json({
      data: {
        id: studentDetails.id,
        fullName: studentDetails.fullName,
        studentImage: studentDetails.studentImage,
        // This clearly shows the TOTAL number of stories the student has
        totalStoriesCount: totalStories,
        // This shows how many stories are actually returned in this response
        returnedStoriesCount: formattedStories.length,
        stories: formattedStories,
        quizScore: studentDetails.quizScore,
        pagination: {
          totalStories,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      },
      message: "User details retrieved successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    return res.status(500).json({
      message: "Error while retrieving user details",
      error: error.message,
      status: false,
    });
  }
};

export {
  createStudent,
  loginStudent,
  logoutStudent,
  getStudentProfile,
  editStudent,
  getAllStudents,
  getStudentProfileDetails,
};
