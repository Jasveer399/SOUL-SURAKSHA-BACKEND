import { createStudent } from "./student.controller.js";
import { createTherapist } from "./therapist.controller.js";

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
      case 'student':
        return await createStudent(req, res);
      
      case 'therapist':
        return await createTherapist(req, res);
      
      default:
        return res.status(400).json({
          message: "Invalid user type. Must be either 'student' or 'therapist'",
          status: false,
        });
    }
  } catch (error) {
    console.error('Error in createUser middleware:', error);
    return res.status(500).json({
      message: "Error processing request",
      error: error.message,
      status: false,
    });
  }
};

export { createUser };
