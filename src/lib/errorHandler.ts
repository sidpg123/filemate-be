// lib/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import  { AuthErrorType } from '@/types/auth.type';
// import { AuthErrorType } from '@/types/auth.type';

export class ErrorHandler extends Error {
  public statusCode: number;
  public type?: string;
  public retryAfter?: number;

  constructor(message: string, statusCode: number, type?: string) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    
    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for different types
export class ValidationError extends ErrorHandler {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends ErrorHandler {
  constructor(message: string = 'Authentication failed', type: string = AuthErrorType.INVALID_CREDENTIALS) {
    super(message, 401, type);
  }
}

export class AuthorizationError extends ErrorHandler {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends ErrorHandler {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ErrorHandler {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends ErrorHandler {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends ErrorHandler {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'SERVER_ERROR');
  }
}

// Type guard to check if error is an instance of ErrorHandler
export function isErrorHandler(error: any): error is ErrorHandler {
  return error instanceof ErrorHandler;
}

// Global error handling middleware
export const globalErrorHandler = (
  err: Error | ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // Log the error for debugging (in production, use proper logging)
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle different types of errors
  if (error instanceof ZodError) {
    const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new ValidationError(`Validation failed: ${message}`);
  }
  
  else if (error instanceof TokenExpiredError) {
    error = new AuthenticationError('Token has expired', AuthErrorType.TOKEN_EXPIRED);
  }
  
  else if (error instanceof JsonWebTokenError) {
    error = new AuthenticationError('Invalid token', AuthErrorType.INVALID_TOKEN);
  }
  
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        error = new ConflictError('Resource already exists');
        break;
      case 'P2025':
        error = new NotFoundError('Resource not found');
        break;
      case 'P2003':
        error = new ValidationError('Foreign key constraint failed');
        break;
      default:
        error = new ServerError('Database error occurred');
    }
  }
  
  // Handle network/database connection errors
  else if (error.name === 'PrismaClientInitializationError' || 
           error.name === 'PrismaClientUnknownRequestError') {
    error = new ServerError('Database connection error');
  }
  
  // Handle async errors that weren't caught
  else if (error.name === 'UnhandledPromiseRejectionWarning') {
    error = new ServerError('Unhandled promise rejection');
  }

  // If it's not already an ErrorHandler, wrap it
  if (!isErrorHandler(error)) {
    error = new ServerError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message
    );
  }

  const errorHandler = error as ErrorHandler;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: errorHandler.type || 'UNKNOWN_ERROR',
    message: errorHandler.message,
    timestamp: new Date().toISOString(),
    ...(errorHandler.retryAfter && { retryAfter: errorHandler.retryAfter }),
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: errorHandler.stack })
  };

  // Send error response
  res.status(errorHandler.statusCode || 500).json(errorResponse);
};

// Async error wrapper to catch async function errors
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};