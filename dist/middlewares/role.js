"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const utils_1 = require("../lib/utils");
// Higher-order function to check user role
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        // console.log("req.user.role", req?.user)
        if (!req.user || allowedRoles !== req.user.role) {
            return next(new utils_1.ErrorHandler("Forbidden: You do not have permission", 403));
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
