import { ErrorHandler } from "@/lib/utils";
import { NextFunction, Request, Response } from "express";
// import ErrorHandler from "../utils/ErrorHandler";

const errorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
