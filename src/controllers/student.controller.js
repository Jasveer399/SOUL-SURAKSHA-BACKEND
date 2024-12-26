import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import { prisma } from "../DB/prismaClientConfig.js";

// Zod validation schema for user creation
const CreateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "fullName must be at least 2 characters long" })
    .max(50, { message: "fullName cannot exceed 50 characters" }),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" }),

  email: z.string().email({ message: "Invalid email address" }),

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

  age: z.number().int().min(0).max(120).optional(),

  profileImage: z.string().optional(),

  trustPhoneNo: z.string().optional(),
});

// Zod validation schema for user login
const UserLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const accessTokenGenerator = async (userId, userType) => {
  let user;
  try {
    if (userType === "student") {
      user = await prisma.student.findFirstOrThrow({
        where: { id: userId },
      });
    } else if (userType === "parent") {
      user = await prisma.parent.findFirstOrThrow({
        where: { id: userId },
      });
    } else {
      user = await prisma.therapist.findFirstOrThrow({
        where: { id: userId },
      });
    }
    const accessToken = generateAccessToken(user.id, user.email, userType);
    return { accessToken };
  } catch (error) {
    throw new Error("Failed to generate access token");
  }
};

const createStudent = async (req, res) => {
  try {
    // Validate input using Zod
    console.log("Request body",req.body);
    const {
      fullName,
      phone,
      email,
      password,
      age,
      profileImage,
      trustPhoneNo,
    } = CreateUserSchema.parse(req.body);

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
    const createdStudent = await prisma.student.create({
      data: {
        fullName,
        phone,
        email,
        studentImage: profileImage,
        password: hashedPassword,
        age,
        trustPhoneNo,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        age: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      data: createdStudent,
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

const loginStudent = async (req, res) => {
  try {
    // Validate input using Zod
    const { email, password } = UserLoginSchema.parse(req.body);

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

    // Generate access token
    const { accessToken } = await accessTokenGenerator(user.id, "student");

    // Set cookie options
    // const options = {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict'
    // };

    // Respond with token and user details
    return res.status(200).json({
      data: {
        id: user.id,
        userName: user.userName,
        email: user.email,
        userType: user.userType,
      },
      accessToken,
      message: "Logged In Successfully",
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
        userName: true,
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

export { createStudent, loginStudent, logoutStudent, getStudentProfile };
