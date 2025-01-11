import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";
import {
  decryptPassword,
  encryptPassword,
} from "../utils/passwordEncryptDescrypt.js";
import { deleteSingleObjectFromS3 } from "./aws.controller.js";
import { accessTokenGenerator } from "../utils/Helper.js";

// Parent Creation Schema
const createParentSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),

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
  parentImage: z.string().optional(),
});

// Parent Login Schema
const ParentLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Parent Edit Schema
const EditParentSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" }),
  
  parentImage: z.string().optional(),
  imageBeforeChange: z.string().optional().nullable(),
});

// Create Parent Controller
const createParent = async (req, res) => {
  try {
    const { fullName, phone, email, password, parentImage } =
      createParentSchema.parse(req.body);

    // Check if email already exists
    const emailExists = await prisma.parent.findUnique({
      where: { email },
    });

    if (emailExists) {
      return res.status(409).json({
        message: "Email already exists",
        status: false,
      });
    }

    // Check phone number across all user types
    const [studentCheck, parentCheck, therapistCheck] =
      await prisma.$transaction([
        prisma.student.findFirst({
          where: { phone },
          select: { phone: true },
        }),
        prisma.parent.findFirst({
          where: { phone },
          select: { phone: true },
        }),
        prisma.therapist.findFirst({
          where: { phone },
          select: { phone: true },
        }),
      ]);

    if (studentCheck?.phone === phone || therapistCheck?.phone === phone) {
      return res.status(409).json({
        message: "Mobile number already registered with another account",
        status: false,
      });
    }

    if (parentCheck?.phone === phone) {
      return res.status(409).json({
        message: "Mobile number already registered with a parent account",
        status: false,
      });
    }

    // Hash password
    const hashedPassword = await encryptPassword(password);

    // Create parent
    const createdParent = await prisma.parent.create({
      data: {
        fullName,
        phone,
        email,
        password: hashedPassword,
        parentImage,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        parentImage: true,
        createdAt: true,
      },
    });

    const { accessToken } = await accessTokenGenerator(createdParent.id, "parent");

    return res.status(201).json({
      data: createdParent,
      userType: "parent",
      accessToken,
      message: "Parent account created successfully",
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
      message: "Error while creating parent account",
      error: error.message,
      status: false,
    });
  }
};

// Edit Parent Controller
const editParent = async (req, res) => {
  try {
    const { fullName, parentImage, imageBeforeChange } = EditParentSchema.parse(
      req.body
    );

    const parentId = req.user.id;

    const updatedParent = await prisma.parent.update({
      where: { id: parentId },
      data: {
        fullName,
        parentImage,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        parentImage: true,
        createdAt: true,
      },
    });

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
    const { email, password } = ParentLoginSchema.parse(req.body);

    const parent = await prisma.parent.findUnique({
      where: { email },
    });

    if (!parent) {
      return res.status(404).json({
        message: "Parent Account not found. Check your email correctly",
        status: false,
      });
    }

    const isPasswordCorrect = await decryptPassword(password, parent.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Password",
        status: false,
      });
    }

    const { accessToken } = await accessTokenGenerator(parent.id,"parent");

    return res.status(200).json({
      data: {
        id: parent.id,
        fullName: parent.fullName,
        userType: "parent",
        email: parent.email,
      },
      accessToken,
      message: "Logged In Successfully",
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

export {
  createParent,
  editParent,
  loginParent,
  logoutParent,
};