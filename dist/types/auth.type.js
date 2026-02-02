"use strict";
// types/auth.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthErrorType = void 0;
// Error types
var AuthErrorType;
(function (AuthErrorType) {
    AuthErrorType["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    AuthErrorType["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    AuthErrorType["ACCOUNT_INACTIVE"] = "ACCOUNT_INACTIVE";
    AuthErrorType["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    AuthErrorType["INVALID_TOKEN"] = "INVALID_TOKEN";
    AuthErrorType["REFRESH_TOKEN_MISSING"] = "REFRESH_TOKEN_MISSING";
    AuthErrorType["TOO_MANY_ATTEMPTS"] = "TOO_MANY_ATTEMPTS";
    AuthErrorType["EMAIL_ALREADY_EXISTS"] = "EMAIL_ALREADY_EXISTS";
    AuthErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    AuthErrorType["SERVER_ERROR"] = "SERVER_ERROR";
})(AuthErrorType || (exports.AuthErrorType = AuthErrorType = {}));
