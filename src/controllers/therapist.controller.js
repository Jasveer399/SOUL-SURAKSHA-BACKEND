import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";
import {
  decryptPassword,
  encryptPassword,
} from "../utils/passwordEncryptDescrypt.js";
import { generateAccessToken } from "../utils/generateAccessToken.js";
import { deleteSingleObjectFromS3 } from "./aws.controller.js";
import { accessTokenGenerator } from "../utils/Helper.js";

const createdTherapistSchema = z.object({
  userName: z
    .string()
    .min(2, { message: "Username must be at least 2 characters long" })
    .max(50, { message: "Username cannot exceed 50 characters" }),

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
  languageType: z.array(z.string()).optional(),
  qualifications: z.string().optional(),

  //   profileImage: z.string().optional(),
});

const TherapistLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
  password: z.string().min(1, { message: "Password is required" }),
});

const EditUserSchema = z.object({
  userName: z
    .string()
    .min(2, { message: "fullName must be at least 2 characters long" })
    .max(50, { message: "fullName cannot exceed 50 characters" }),

  qualifications: z.string().optional(),

  gender: z.string().optional(),

  recoveryEmail: z.string().optional(),
  licenseNO: z.string().optional(),

  languageType: z.array(z.string()).optional(),

  profileImage: z.string().optional(),

  bio: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),

  imageBeforeChange: z.string().optional().nullable(),
});

const createTherapist = async (req, res) => {
  try {
    // Validate input using Zod
    console.log("Request body", req.body);
    const { userName, phone, email, password, languageType, qualifications } =
      createdTherapistSchema.parse(req.body);

    // Check if email already exists
    const emailExists = await prisma.therapist.findUnique({
      where: { email },
    });

    if (emailExists) {
      return res.status(409).json({
        message: "Email already exists",
        status: false,
      });
    }

    // const [studentCheck, parentCheck, therapistCheck] =
    //   await prisma.$transaction([
    //     prisma.student.findFirst({
    //       where: { phone },
    //       select: { phone: true },
    //     }),
    //     prisma.parent.findFirst({
    //       where: { phone },
    //       select: { phone: true },
    //     }),
    //     prisma.therapist.findFirst({
    //       where: { phone },
    //       select: { phone: true },
    //     }),
    //   ]);

    // if (studentCheck?.phone === phone || parentCheck?.phone === phone) {
    //   return res.status(409).json({
    //     message: "Mobile number already registered with a user account.",
    //     status: false,
    //   });
    // }

    // if (therapistCheck?.phone === phone) {
    //   return res.status(409).json({
    //     message: "Mobile number already registered with a therapist account.",
    //     status: false,
    //   });
    // }

    // Hash password
    const hashedPassword = await encryptPassword(password);

    // Create user
    const createdTherapist = await prisma.therapist.create({
      data: {
        userName,
        phone,
        email,
        password: hashedPassword,
        languageType,
        qualifications,
      },
      select: {
        id: true,
        userName: true,
        email: true,
        createdAt: true,
        qualifications: true,
        languageType: true,
      },
    });
    const { accessToken } = await accessTokenGenerator(
      createTherapist.id,
      "therapist"
    );
    return res.status(201).json({
      data: createdTherapist,
      userType: "therapist",
      accessToken,
      message: "Therapist account created successfully",
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
      message: "Error while creating therapist account",
      error: error.message,
      status: false,
    });
  }
};

const editTherapist = async (req, res) => {
  try {
    const {
      userName,
      languageType,
      profileImage,
      qualifications,
      bio,
      specialization,
      gender,
      recoveryEmail,
      licenseNO,
      experience,
      imageBeforeChange,
    } = EditUserSchema.parse(req.body);

    const therapistId = req.user.id;

    const updatedTherapist = await prisma.therapist.update({
      where: { id: therapistId },
      data: {
        userName,
        languageType,
        therapistImage: profileImage,
        gender,
        recoveryEmail,
        licenseNO,
        qualifications,
        bio,
        specialization,
        experience: parseFloat(experience),
      },
      select: {
        id: true,
        userName: true,
        email: true,
        languageType: true,
        qualifications: true,
        bio: true,
        licenseNO: true,
        specialization: true,
        experience: true,
        createdAt: true,
      },
    });

    if (imageBeforeChange) {
      await deleteSingleObjectFromS3(imageBeforeChange);
    }

    return res.status(200).json({
      data: updatedTherapist,
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

const loginTherapist = async (req, res) => {
  try {
    // Validate input using Zod
    const { email, password } = TherapistLoginSchema.parse(req.body);

    // Find user
    const therapist = await prisma.therapist.findUnique({
      where: { email },
    });

    if (!therapist) {
      return res.status(404).json({
        message: "Therapist Account not found. Check your email correctly",
        status: false,
      });
    }

    // Verify password
    const isPasswordCorrect = await decryptPassword(
      password,
      therapist.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Password",
        status: false,
      });
    }

    // Generate access token
    const { accessToken } = await accessTokenGenerator(
      therapist.id,
      "therapist"
    );

    // Respond with token and user details
    return res.status(200).json({
      data: {
        id: therapist.id,
        userName: therapist.userName,
        userType: "therapist",
        email: therapist.email,
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

const logoutTherapist = async (req, res) => {
  try {
    // Verify user exists
    await prisma.therapist.findFirstOrThrow({
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
const getAllTherapist = async (_, res) => {
  try {
    const therapists = await prisma.therapist.findMany({
      select: {
        id: true,
        userName: true,
        specialization: true,
        therapistImage: true,
        experience: true,
        phone: true,
        bio: true,
        languageType: true,
        qualifications: true,
        ratings: true,
        Review: {
          select: {
            title: true,
            review: true,
            rating: true,
            createdAt: true,
            Student: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    return res.status(200).json({
      data: therapists,
      message: "All Therapists fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while fetching all therapists",
      error: error.message,
      status: false,
    });
  }
};

const getSpecificTherapist = async (req, res) => {
  try {
    const therapist = await prisma.therapist.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        userName: true,
        specialization: true,
        therapistImage: true,
        experience: true,
        phone: true,
        bio: true,
        languageType: true,
        qualifications: true,
        ratings: true,
        Review: {
          select: {
            title: true,
            review: true,
            rating: true,
            createdAt: true,
            Student: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    return res.status(200).json({
      data: therapist,
      message: "Therapist fetched successfully",
      status: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error while fetching therapist",
      error: error.message,
      status: false,
    });
  }
};

export {
  createTherapist,
  loginTherapist,
  logoutTherapist,
  editTherapist,
  getAllTherapist,
  getSpecificTherapist,
};
