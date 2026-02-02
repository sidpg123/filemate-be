"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import ErrorHandler from "../utils/ErrorHandler";
const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.default = errorMiddleware;
