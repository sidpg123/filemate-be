import { ErrorHandler } from "../lib/utils";
// Higher-order function to check user role
export const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || allowedRoles !== req.user.role) {
            return next(new ErrorHandler("Forbidden: You do not have permission", 403));
        }
        next();
    };
};
