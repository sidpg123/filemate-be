    // types/auth.types.ts

import { NextFunction, Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// JWT Token payload structure
export interface TokenPayload extends JwtPayload {
  sub: string;
  role: string; 
//   type: 'user' | 'client';
  jti?: string;
}

// Extended Request interface for authenticated requests
export interface AuthRequest extends Request {
  user?: {
    id: string;
    sub: string;
    role: string;
    // type: string;
  };
}

// User/Client profile structure
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
}

// Rate limiting types
export interface RateLimitData {
  count: number;
  lockoutEndsAt: number;
}

export interface LoginAttempt {
  allowed: boolean;
  remainingAttempts?: number;
  lockoutEndsAt?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface LoginResponse extends ApiResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse extends ApiResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ErrorResponse extends ApiResponse {
  error: string;
  retryAfter?: number;
}

// Validation schemas types
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  email: string;
}

// Environment configuration type
export interface AuthConfig {
  accessJwtSecret: string;
  refreshJwtSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

// Database model interfaces (adjust based on your Prisma schema)
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional: Refresh token tracking
export interface RefreshTokenRecord {
  id: string;
  jti: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date | null;
}

// Middleware types
export type AuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// Error types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REFRESH_TOKEN_MISSING = 'REFRESH_TOKEN_MISSING',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

export interface AuthError extends Error {
  type: AuthErrorType;
  statusCode: number;
  retryAfter?: number;
} 