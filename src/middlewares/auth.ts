import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types/express.js";
import TryCatch from "../lib/healpers.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ErrorHandler } from "../lib/utils.js";

const isAuthenticated = TryCatch(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  // //console.log("Authorization header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ErrorHandler("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];
  // //console.log("Token extracted:", token);
  try {
    const decoded = jwt.verify(token, process.env.AUTH_SECRET!) as JwtPayload;
    if (decoded.id === undefined || typeof decoded.id !== 'string') {
      return next(new ErrorHandler("Invalid token payload", 401));
    }
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (err) {
    return next(new ErrorHandler("Invalid token", 401));
  }

});

export { isAuthenticated };
