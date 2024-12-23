import jwt from "jsonwebtoken";
import { prisma } from "../DB/prismaClientConfig.js";

export const verifyJWT = (roles) => async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({
        message: "Access token not found",
        status: false
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    if (!decodedToken?.id || !decodedToken?.userType) {
      return res.status(401).json({
        message: "Invalid token format",
        status: false
      });
    }

    // Check if the user's role is allowed
    if (!roles.includes(decodedToken.userType)) {
      return res.status(403).json({
        message: "You don't have permission to access this resource",
        status: false
      });
    }

    let user;

    // Find user based on their type
    switch (decodedToken.userType) {
      case 'student':
        user = await prisma.student.findUnique({
          where: { id: decodedToken.id }
        });
        break;
        
      case 'parent':
        user = await prisma.parent.findUnique({
          where: { id: decodedToken.id }
        });
        break;

      default:
        return res.status(401).json({
          message: "Invalid user type",
          status: false
        });
    }

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        status: false
      });
    }

    // Attach user to request object

    req.user = user;
    req.userType = decodedToken.userType;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid or expired token",
        status: false
      });
    }

    console.error('JWT Verification Error:', error);
    return res.status(500).json({
      message: "Error while authenticating user",
      status: false
    });
  }
};