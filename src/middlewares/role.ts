import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/express";
import { ErrorHandler } from "../lib/utils";

// Higher-order function to check user role
export const authorizeRoles = (allowedRoles: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // console.log("req.user.role", req?.user)
    if (!req.user || allowedRoles !== req.user.role) {
      return next(new ErrorHandler("Forbidden: You do not have permission", 403));
    }
    next();
  };
};
