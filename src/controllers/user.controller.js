import { z } from "zod";
import { prisma } from "../db/prismaClientConfig.js";
import {
  accessTokenGenerator,
  getGoogleOauthTokens,
  getGoogleUser,
} from "../utils/Helper.js";
import { createParent, editParent, loginParent } from "./parent.controller.js";
import {
  createStudent,
  editStudent,
  loginStudent,
} from "./student.controller.js";
import {
  createTherapist,
  editTherapist,
  loginTherapist,
} from "./therapist.controller.js";
import jwt from "jsonwebtoken";

export const phoneNumberSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(13, "Phone number cannot exceed 13 digits");

export const userTypeSchema = z.enum(["student", "parent", "therapist"], {
  errorMap: () => ({
    message: "User type must be either 'student', 'parent', or 'therapist'",
  }),
});

export const otpRequestSchema = z.object({
  phone: phoneNumberSchema,
  userType: userTypeSchema,
});

const verifyOtpSchema = z.object({
  phone: phoneNumberSchema,
  otp: z.string().length(4, "OTP must be 4 digits"),
  userType: userTypeSchema,
});
export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      data: req.user,
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

const createUser = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!userType) {
      return res.status(400).json({
        message: "User type is required",
        status: false,
      });
    }

    // Convert userType to lowercase for case-insensitive comparison
    const userTypeLower = userType.toLowerCase();

    switch (userTypeLower) {
      case "student":
        return await createStudent(req, res);

      case "therapist":
        return await createTherapist(req, res);

      case "parent":
        return await createParent(req, res);

      default:
        return res.status(400).json({
          message:
            "Invalid user type. Must be either 'student','therapist' Or 'parent'",
          status: false,
        });
    }
  } catch (error) {
    console.error("Error in createUser middleware:", error);
    return res.status(500).json({
      message: "Error processing request",
      error: error.message,
      status: false,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!userType) {
      return res.status(400).json({
        message: "User type is required",
        status: false,
      });
    }

    // Convert userType to lowercase for case-insensitive comparison
    const userTypeLower = userType.toLowerCase();

    switch (userTypeLower) {
      case "student":
        return await loginStudent(req, res);

      case "therapist":
        return await loginTherapist(req, res);

      case "parent":
        return await loginParent(req, res);

      default:
        return res.status(400).json({
          message:
            "Invalid user type. Must be either 'student','therapist' Or 'parent'",
          status: false,
        });
    }
  } catch (error) {
    console.error("Error in createUser middleware:", error);
    return res.status(500).json({
      message: "Error processing request",
      error: error.message,
      status: false,
    });
  }
};

const editUser = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!userType) {
      return res.status(400).json({
        message: "User type is required",
        status: false,
      });
    }

    // Convert userType to lowercase for case-insensitive comparison
    const userTypeLower = userType.toLowerCase();

    switch (userTypeLower) {
      case "student":
        return await editStudent(req, res);

      case "therapist":
        return await editTherapist(req, res);

      case "parent":
        return await editParent(req, res);

      default:
        return res.status(400).json({
          message:
            "Invalid user type. Must be either 'student','therapist' Or 'parent'",
          status: false,
        });
    }
  } catch (error) {
    console.error("Error in createUser middleware:", error);
    return res.status(500).json({
      message: "Error processing request",
      error: error.message,
      status: false,
    });
  }
};

const googleOauthHandler = async (req, res) => {
  try {
    const code = req.query.code;
    const stateParam = req.query.state;
    const platform = req.query.platform || "web";

    // Decode and validate state parameter
    let userType;
    try {
      const stateData = JSON.parse(atob(stateParam));
      userType = stateData.userType;
      if (!["student", "parent"].includes(userType.toLowerCase())) {
        throw new Error("Invalid user type");
      }
    } catch (error) {
      const errorResponse = {
        message: "Invalid state parameter or user type",
        status: false,
      };

      return platform === "mobile"
        ? res.status(400).json(errorResponse)
        : handleWebRedirect(res, {
            error: true,
            message: errorResponse.message,
          });
    }

    // Get tokens and user info
    const { id_token, access_token } = await getGoogleOauthTokens({ code });
    const googleUser = await getGoogleUser({ id_token, access_token });

    if (!googleUser.verified_email) {
      const errorResponse = {
        message: "Google account is not verified",
        status: false,
      };

      return platform === "mobile"
        ? res.status(400).json(errorResponse)
        : handleWebRedirect(res, {
            error: true,
            message: errorResponse.message,
          });
    }

    // Check if user exists in either table
    const existingStudent = await prisma.student.findUnique({
      where: { email: googleUser.email },
    });

    const existingParent = await prisma.parent.findUnique({
      where: { email: googleUser.email },
    });

    let result;
    if (existingStudent || existingParent) {
      result = await handleGoogleSignin(
        googleUser,
        userType,
        existingStudent,
        existingParent
      );
    } else {
      result = await handleGoogleSignup(googleUser, userType);
    }

    // Return response based on platform
    if (platform === "mobile") {
      return res.status(200).json({
        status: true,
        ...result,
      });
    } else {
      return handleWebRedirect(res, {
        accessToken: result.accessToken,
        userType: result.userType,
        isNewUser: !existingStudent && !existingParent,
      });
    }
  } catch (error) {
    console.error("Error in googleOauthHandler:", error);

    let errorMessage;
    let statusCode = 400;

    switch (error.message) {
      case "Email already registered":
        errorMessage =
          "This email is already registered with a different account type.";
        break;
      case "Invalid user type":
        errorMessage =
          "Invalid user type for this account Or Email already registered with a different account type.";
        break;
      default:
        errorMessage = "Error processing request. Please try again.";
        statusCode = 500;
    }

    if (req.query.platform === "mobile") {
      return res.status(statusCode).json({
        status: false,
        message: errorMessage,
      });
    } else {
      return handleWebRedirect(res, {
        error: true,
        message: errorMessage,
      });
    }
  }
};

const handleGoogleSignin = async (
  googleUser,
  requestedUserType,
  existingStudent,
  existingParent
) => {
  try {
    const userTypeLower = requestedUserType.toLowerCase();
    let existingUser;
    let finalUserType;

    if (userTypeLower === "student" && existingStudent) {
      existingUser = existingStudent;
      finalUserType = "student";

      // Update student information
      await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          studentImage: googleUser.picture,
        },
      });
    } else if (userTypeLower === "parent" && existingParent) {
      existingUser = existingParent;
      finalUserType = "parent";

      // Update parent information
      await prisma.parent.update({
        where: { id: existingParent.id },
        data: {
          parentImage: googleUser.picture,
        },
      });
    } else {
      throw new Error("Invalid user type");
    }

    // Generate access token
    const { accessToken } = await accessTokenGenerator(
      existingUser.id,
      finalUserType
    );

    return {
      data: existingUser,
      userType: finalUserType,
      accessToken,
    };
  } catch (error) {
    throw error;
  }
};

// Your existing handleGoogleSignup function remains the same
const handleGoogleSignup = async (googleUser, userType) => {
  try {
    const { email, name: fullName, picture } = googleUser;

    // Convert userType to lowercase for consistency
    const userTypeLower = userType.toLowerCase();

    // Check if user already exists in either table
    const existingStudent = await prisma.student.findUnique({
      where: { email },
    });

    const existingParent = await prisma.parent.findUnique({
      where: { email },
    });

    if (existingStudent || existingParent) {
      throw new Error("Email already registered");
    }

    let createdUser;
    let finalUserType;

    switch (userTypeLower) {
      case "student": {
        createdUser = await prisma.student.create({
          data: {
            email,
            fullName,
            studentImage: picture,
            password: "", // Empty password for Google auth
            phone: "",
            trustPhoneNo: "",
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            studentImage: true,
            dob: true,
            createdAt: true,
            gender: true,
          },
        });
        finalUserType = "student";
        break;
      }

      case "parent": {
        createdUser = await prisma.parent.create({
          data: {
            email,
            fullName,
            parentImage: picture,
            password: "", // Empty password for Google auth
            phone: "",
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            parentImage: true,
            dob: true,
            createdAt: true,
            gender: true,
          },
        });
        finalUserType = "parent";
        break;
      }

      default:
        throw new Error(
          "Invalid user type. Must be either 'student' or 'parent'"
        );
    }

    // Generate access token
    const { accessToken } = await accessTokenGenerator(
      createdUser.id,
      finalUserType
    );

    return {
      data: createdUser,
      userType: finalUserType,
      accessToken,
    };
  } catch (error) {
    throw error;
  }
};

// Helper functions remain the same
const handleWebRedirect = (res, params) => {
  const redirectUrl = new URL(process.env.REDIRECT_URL);
  Object.entries(params).forEach(([key, value]) => {
    redirectUrl.searchParams.append(key, value);
  });
  return res.redirect(redirectUrl.toString());
};

const createUserAndGetOtp = async (req, res) => {
  try {
    // Validate request body using Zod
    const validationResult = otpRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors,
        status: false,
      });
    }

    const { phone, userType } = validationResult.data;

    // Check if phone number exists in all user types
    const [studentCheck, parentCheck, therapistCheck] =
      await prisma.$transaction([
        prisma.student.findUnique({
          where: { phone: phone },
          select: { phone: true },
        }),
        prisma.parent.findUnique({
          where: { phone: phone },
          select: { phone: true },
        }),
        prisma.therapist.findUnique({
          where: { phone: phone },
          select: { phone: true },
        }),
      ]);

    // Check for existing phone number in other user types
    const existingUserTypes = [];
    if (studentCheck) existingUserTypes.push("student");
    if (parentCheck) existingUserTypes.push("parent");
    if (therapistCheck) existingUserTypes.push("therapist");

    // If phone exists in a different user type, return error
    if (existingUserTypes.length > 0 && !existingUserTypes.includes(userType)) {
      return res.status(409).json({
        message: `Phone number already registered as ${existingUserTypes.join(
          ", "
        )}`,
        status: false,
        errorType: "ACCOUNT_TYPE_MISMATCH",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Handle user creation/update based on user type
    let user;
    try {
      switch (userType) {
        case "student":
          user = studentCheck
            ? await prisma.student.update({
                where: { phone: phone },
                data: { otp },
              })
            : await prisma.student.create({
                data: {
                  phone: phone,
                  otp,
                  fullName: "",
                  email: "",
                  password: "",
                },
              });
          break;

        case "parent":
          user = parentCheck
            ? await prisma.parent.update({
                where: { phone: phone },
                data: { otp },
              })
            : await prisma.parent.create({
                data: {
                  phone: phone,
                  otp,
                  fullName: "",
                  email: "",
                  password: "",
                },
              });
          break;

        case "therapist":
          user = therapistCheck
            ? await prisma.therapist.update({
                where: { phone: phone },
                data: { otp },
              })
            : await prisma.therapist.create({
                data: {
                  phone: phone,
                  otp,
                  userName: "",
                  email: "",
                  password: "",
                  languageType: [],
                },
              });
          break;
      }
    } catch (dbError) {
      console.error("Database Error:", dbError);
      return res.status(500).json({
        message: "Database operation failed",
        errorType: "DATABASE_ERROR",
        status: false,
      });
    }

    if (!user) {
      return res.status(500).json({
        message: "Failed to process user account",
        errorType: "USER_CREATION_FAILED",
        status: false,
      });
    }

    // For development, returning OTP in response
    // In production, should integrate with SMS service
    return res.status(200).json({
      data: {
        otp,
        isOtpSent: true,
      },
      message: "OTP sent successfully!",
      status: true,
    });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      errorType: "INTERNAL_SERVER_ERROR",
      status: false,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    // Validate request body
    const validationResult = verifyOtpSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors,
        status: false,
      });
    }

    const { otp, phone, userType } = validationResult.data;

    // Check if user exists and verify OTP
    if (userType === "student") {
      const student = await prisma.student.findUnique({
        where: { phone: phone },
      });

      if (!student) {
        return res.status(404).json({
          message: "User not found",
          status: false,
        });
      }

      if (student.otp !== otp) {
        return res.status(400).json({
          message: "Invalid OTP",
          status: false,
        });
      }

      // Update patient record
      const updatedstudent = await prisma.student.update({
        where: { phone: phone },
        data: {
          otp: "",
          isOtpVerify: true,
        },
      });

      return res.status(200).json({
        message: "OTP verified successfully",
        data: {
          isOtpVerify: updatedstudent.isOtpVerify,
        },
        status: true,
      });
    } else if (userType === "parent") {
      // Handle therapist authentication
      const parent = await prisma.parent.findUnique({
        where: { phone: phone },
      });

      if (!parent) {
        return res.status(404).json({
          message: "User not found",
          status: false,
        });
      }

      if (parent.otp !== otp) {
        return res.status(400).json({
          message: "Invalid OTP",
          status: false,
        });
      }

      // Update patient record
      const updatedparent = await prisma.parent.update({
        where: { phone: phone },
        data: {
          otp: "",
          isOtpVerify: true,
        },
      });

      return res.status(200).json({
        message: "OTP verified successfully",
        data: {
          isOtpVerify: updatedparent.isOtpVerify,
        },
        status: true,
      });
    } else if (userType === "therapist") {
      // Handle therapist authentication
      const therapist = await prisma.therapist.findUnique({
        where: { phone: phone },
      });

      if (!therapist) {
        return res.status(404).json({
          message: "User not found",
          status: false,
        });
      }

      if (therapist.otp !== otp) {
        return res.status(400).json({
          message: "Invalid OTP",
          status: false,
        });
      }

      // Update patient record
      const updatedtherapist = await prisma.therapist.update({
        where: { phone: phone },
        data: {
          otp: "",
          isOtpVerify: true,
        },
      });

      return res.status(200).json({
        message: "OTP verified successfully",
        data: {
          isOtpVerify: updatedtherapist.isOtpVerify,
        },
        status: true,
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Phone number already registered",
        status: false,
      });
    }
    return res.status(500).json({
      message: "Error while authenticating user",
      error: error.message,
      status: false,
    });
  }
};

export {
  createUser,
  loginUser,
  editUser,
  googleOauthHandler,
  createUserAndGetOtp,
  verifyOtp,
};
