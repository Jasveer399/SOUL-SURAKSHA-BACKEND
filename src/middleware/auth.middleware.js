import jwt from "jsonwebtoken";
import { prisma } from "../db/prismaClientConfig.js";

export const verifyJWT = (roles) => async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Access token not found",
        status: false,
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decodedToken?.id || !decodedToken?.userType) {
      return res.status(401).json({
        message: "Invalid token format",
        status: false,
      });
    }

    let user;
    if (roles.includes("student")) {
      user = await prisma.student.findUnique({
        where: { id: decodedToken?.id },
      });
      if (!user && roles.includes("therapist")) {
        user = await prisma.therapist.findUnique({
          where: { id: decodedToken?.id },
          include: {
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
      }
      if (!user && roles.includes("parent")) {
        user = await prisma.parent.findUnique({
          where: { id: decodedToken?.id },
        });
      }
    } else if (roles.includes("therapist")) {
      user = await prisma.therapist.findUnique({
        where: { id: decodedToken?.id },
        include: {
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
      if (!user && roles.includes("parent")) {
        user = await prisma.parent.findUnique({
          where: { id: decodedToken?.id },
        });
      }
    } else if (roles.includes("parent")) {
      user = await prisma.parent.findUnique({
        where: { id: decodedToken?.id },
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        status: false,
      });
    }

    const isStudent = await prisma.student.findUnique({
      where: { id: user.id },
    });
    const isTherapist = await prisma.therapist.findUnique({
      where: { id: user.id },
    });

    req.user = { ...user, userType: decodedToken.userType };
    req.role = isStudent ? "student" : isTherapist ? "therapist" : "parent";
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid or expired token",
        status: false,
      });
    }

    console.error("JWT Verification Error:", error);
    return res.status(500).json({
      message: "Error while authenticating user",
      status: false,
    });
  }
};
