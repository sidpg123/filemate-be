"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const auth_type_js_1 = require("@/types/auth.type.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../lib/db"));
const healpers_js_1 = __importDefault(require("../lib/healpers.js"));
const ACCESS_JWT_SECRET = process.env.ACCESS_JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET;
if (!ACCESS_JWT_SECRET) {
    throw new Error('ACCESS_JWT_SECRET is required');
}
// Create auth error helper
function createAuthError(type, message, statusCode) {
    const error = new Error(message);
    error.type = type;
    error.statusCode = statusCode;
    return error;
}
const isAuthenticated = (0, healpers_js_1.default)(async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(createAuthError(auth_type_js_1.AuthErrorType.INVALID_TOKEN, 'Access token missing or invalid format', 401));
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(createAuthError(auth_type_js_1.AuthErrorType.INVALID_TOKEN, 'Access token missing', 401));
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_JWT_SECRET);
        const userId = decoded.sub || decoded.id;
        if (!userId) {
            console.log('Token missing user identifier:', decoded);
            return next(createAuthError(auth_type_js_1.AuthErrorType.INVALID_TOKEN, 'Invalid token payload: missing user identifier', 401));
        }
        // Optional: Verify user/client still exists and is active
        let account;
        try {
            if (decoded.role === 'Client') {
                account = await db_1.default.client.findUnique({
                    where: { id: decoded.sub },
                    select: { id: true, isActive: true, role: true }
                });
            }
            if (decoded.role === 'CA') {
                account = await db_1.default.user.findUnique({
                    where: { id: decoded.sub },
                    select: { id: true, isActive: true, role: true }
                });
            }
        }
        catch (dbError) {
            console.error('Database error in auth middleware:', dbError);
            return next(createAuthError(auth_type_js_1.AuthErrorType.SERVER_ERROR, 'Database error', 500));
        }
        if (!account || !account.isActive) {
            return next(createAuthError(auth_type_js_1.AuthErrorType.ACCOUNT_INACTIVE, 'Account not found or inactive', 401));
        }
        // Set user info on request
        req.user = {
            id: decoded.sub,
            sub: decoded.sub,
            role: decoded.role,
            // type: decoded.type
        };
        next();
    }
    catch (err) {
        console.error('Token verification error:', err);
        if (err.name === 'TokenExpiredError') {
            return next(createAuthError(auth_type_js_1.AuthErrorType.TOKEN_EXPIRED, 'Access token has expired', 401));
        }
        if (err.name === 'JsonWebTokenError') {
            return next(createAuthError(auth_type_js_1.AuthErrorType.INVALID_TOKEN, 'Invalid access token', 401));
        }
        return next(createAuthError(auth_type_js_1.AuthErrorType.SERVER_ERROR, 'Token verification failed', 500));
    }
});
exports.isAuthenticated = isAuthenticated;
