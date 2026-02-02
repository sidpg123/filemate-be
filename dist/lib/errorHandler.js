"use strict";
// lib/errorHandler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.globalErrorHandler = exports.ServerError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.ErrorHandler = void 0;
exports.isErrorHandler = isErrorHandler;
const zod_1 = require("zod");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_type_1 = require("@/types/auth.type");
// import { AuthErrorType } from '@/types/auth.type';
class ErrorHandler extends Error {
    statusCode;
    type;
    retryAfter;
    constructor(message, statusCode, type) {
        super(message);
        this.statusCode = statusCode;
        this.type = type;
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ErrorHandler = ErrorHandler;
// Specific error classes for different types
class ValidationError extends ErrorHandler {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends ErrorHandler {
    constructor(message = 'Authentication failed', type = auth_type_1.AuthErrorType.INVALID_CREDENTIALS) {
        super(message, 401, type);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends ErrorHandler {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends ErrorHandler {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends ErrorHandler {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends ErrorHandler {
    constructor(message = 'Too many requests', retryAfter) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
class ServerError extends ErrorHandler {
    constructor(message = 'Internal server error') {
        super(message, 500, 'SERVER_ERROR');
    }
}
exports.ServerError = ServerError;
// Type guard to check if error is an instance of ErrorHandler
function isErrorHandler(error) {
    return error instanceof ErrorHandler;
}
// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
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
    if (error instanceof zod_1.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        error = new ValidationError(`Validation failed: ${message}`);
    }
    else if (error instanceof jsonwebtoken_1.TokenExpiredError) {
        error = new AuthenticationError('Token has expired', auth_type_1.AuthErrorType.TOKEN_EXPIRED);
    }
    else if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
        error = new AuthenticationError('Invalid token', auth_type_1.AuthErrorType.INVALID_TOKEN);
    }
    else if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
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
        error = new ServerError(process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : error.message);
    }
    const errorHandler = error;
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
exports.globalErrorHandler = globalErrorHandler;
// Async error wrapper to catch async function errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
