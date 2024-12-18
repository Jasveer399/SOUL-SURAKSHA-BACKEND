import jwt from "jsonwebtoken";
import { prisma } from "../DB/prismaClientConfig.js";

export const verifyJWT = (roles) => async (req, res, next) => {
  console.log("headers token: ", req.header("Authorization"));
  console.log("roles: ", roles);

  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        message: "Access token not found !!",
        success: false,
      });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    let user;
    if (roles.includes("user")) {
      user = await prisma.user.findUnique({
        where: { id: decodedToken?.id },
      });
    //   if (!user && roles.includes("admin")) {
    //     user = await prisma.admin.findUnique({
    //       where: { id: decodedToken?.id },
    //     });
    //   }
    } else if (roles.includes("therapist")) {
      user = await prisma.therapist.findUnique({ where: { id: decodedToken?.id } });
    }

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized request !!",
        success: false,
      });
    }
    // const isDealer = await prisma.dealer.findUnique({ where: { id: user.id } });

    req.user = user;
    // req.role = isDealer ? "dealer" : "admin";
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid access token",
      success: false,
    });
  }
};
