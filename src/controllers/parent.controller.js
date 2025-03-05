import { z } from "zod";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { prisma } from "../db/prismaClientConfig.js";
import {
  decryptPassword,
  encryptPassword,
} from "../utils/passwordEncryptDescrypt.js";
import { deleteSingleObjectFromS3 } from "./aws.controller.js";
import { accessTokenGenerator } from "../utils/Helper.js";
import { generateOTP } from "../utils/otpUtils.js";

// Parent Creation Schema
const createParentSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

  phone: z
    .string()
    // .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" })
    .optional(),

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
  parentImage: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
});

// Parent Edit Schema
const EditParentSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
  gender: z.string().optional(),

  parentImage: z.string().optional(),
  imageBeforeChange: z.string().optional().nullable(),
});

// Zod validation schema for user login
const ParentLoginSchema = z.object({
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

// Create Parent Controller
const createParent = async (req, res) => {
  try {
    const { fullName, phone, email, password, parentImage, dob, gender } =
      createParentSchema.parse(req.body);

    // Check for email conflicts in other user types
    const [studentCheck, therapistCheck] = await prisma.$transaction([
      prisma.student.findUnique({
        where: { email: email },
        select: { phone: true },
      }),
      prisma.therapist.findUnique({
        where: { email: email },
        select: { phone: true },
      }),
    ]);

    // Conflict checks
    if (studentCheck) {
      return res.status(409).json({
        message: "Email already registered as a Student",
        status: false,
      });
    }
    if (therapistCheck) {
      return res.status(409).json({
        message: "Email already registered as a therapist",
        status: false,
      });
    }

    // Hash password
    const hashedPassword = await encryptPassword(password);

    // Find existing parent by email or phone
    const existingParent = await prisma.parent.findFirst({
      where: {
        OR: [{ email: email }, { phone: phone }],
      },
    });

    // If no existing parent, create new
    if (!existingParent) {
      const createdParent = await prisma.parent.create({
        data: {
          fullName,
          phone,
          email,
          password: hashedPassword,
          parentImage,
          dob,
          gender,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          parentImage: true,
          createdAt: true,
          dob: true,
          gender: true,
        },
      });

      const { accessToken } = await accessTokenGenerator(
        createdParent.id,
        "parent"
      );

      return res.status(201).json({
        data: createdParent,
        userType: "parent",
        accessToken,
        message: "Parent account created successfully",
        status: true,
      });
    }

    const queryKey = existingParent.email
      ? "email"
      : existingParent.phone
      ? "phone"
      : null;
    const queryValue = queryKey ? existingParent[queryKey] : null;
    // If existing parent found, update using email (unique identifier)
    if (queryKey) {
      const updatedParent = await prisma.parent.update({
        where: { [queryKey]: queryValue },
        data: {
          fullName,
          phone,
          password: hashedPassword,
          parentImage,
          dob,
          gender,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          parentImage: true,
          createdAt: true,
          dob: true,
          gender: true,
        },
      });

      const { accessToken } = await accessTokenGenerator(
        updatedParent.id,
        "parent"
      );

      return res.status(200).json({
        data: updatedParent,
        userType: "parent",
        accessToken,
        message: "Parent account updated successfully",
        status: true,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    // Handle unique constraint errors
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      return res.status(409).json({
        message:
          field === "email"
            ? "Email already exists"
            : field === "phone"
            ? "Phone number already exists"
            : "Account creation failed",
        status: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Error while creating parent account",
      error: error.message,
      status: false,
    });
  }
};

// Edit Parent Controller
const editParent = async (req, res) => {
  try {
    const { fullName, parentImage, email, gender, imageBeforeChange } =
      EditParentSchema.parse(req.body);

    const parentId = req.user.id;

    const updatedParent = await prisma.parent.update({
      where: { id: parentId },
      data: {
        fullName,
        parentImage,
        gender,
        email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        parentImage: true,
        createdAt: true,
      },
    });

    console.log("updatedParent: >>", updatedParent);

    if (imageBeforeChange) {
      await deleteSingleObjectFromS3(imageBeforeChange);
    }

    return res.status(200).json({
      data: updatedParent,
      message: "Parent updated successfully",
      status: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation Error",
        errors: error.errors.map((e) => e.message),
        status: false,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Error while updating parent",
      error: error.message,
      status: false,
    });
  }
};

// Login Parent Controller
const loginParent = async (req, res) => {
  try {
    // Validate input using Zod
    const { email, password, otp } = ParentLoginSchema.parse(req.body);
    console.log(req.body);

    // Find user
    const user = await prisma.parent.findUnique({
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
      await prisma.parent.update({
        where: { email: email },
        data: { otp: null, isMailOtpVerify: true },
      });

      // Generate access token
      const { accessToken } = await accessTokenGenerator(user.id, "parent");

      // Respond with token and user details
      return res.status(200).json({
        data: {
          id: user.id,
          email: user.email,
          userType: "parent",
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
      await prisma.parent.update({
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

// Logout Parent Controller
const logoutParent = async (req, res) => {
  try {
    await prisma.parent.findFirstOrThrow({
      where: { id: req.user?.id },
    });

    return res.status(200).json({
      message: "Logged out Successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while logging out parent",
      error: error.message,
      status: false,
    });
  }
};

const getAllParents = async (_, res) => {
  try {
    const parents = await prisma.parent.findMany({
      select: {
        id: true,
        fullName: true,
        parentImage: true,
      },
    });

    const formattedParents = parents.map((parent) => ({
      id: parent.id,
      fullName: parent.fullName,
      parentImage: parent.parentImage,
    }));

    return res.status(200).json({
      data: formattedParents,
      message: "All Parents fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while fetching all parents",
      error: error.message,
      status: false,
    });
  }
};

export { createParent, editParent, loginParent, logoutParent, getAllParents };
