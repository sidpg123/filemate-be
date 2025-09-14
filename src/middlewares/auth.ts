import { AuthError, AuthErrorType, TokenPayload } from "@/types/auth.type.js";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import db from '../lib/db';
import TryCatch from "../lib/healpers.js";
import { AuthenticatedRequest } from "../types/express.js";


const ACCESS_JWT_SECRET = process.env.ACCESS_JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET;

if (!ACCESS_JWT_SECRET) {
  throw new Error('ACCESS_JWT_SECRET is required');
}

// Create auth error helper
function createAuthError(type: AuthErrorType, message: string, statusCode: number): AuthError {
  const error = new Error(message) as AuthError;
  error.type = type;
  error.statusCode = statusCode;
  return error;
}


const isAuthenticated = TryCatch(async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createAuthError(
        AuthErrorType.INVALID_TOKEN,
        'Access token missing or invalid format',
        401
      ));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(createAuthError(
        AuthErrorType.INVALID_TOKEN,
        'Access token missing',
        401
      ));
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_JWT_SECRET) as TokenPayload;


    const userId = decoded.sub || decoded.id;

    if (!userId) {
      console.log('Token missing user identifier:', decoded);
      return next(createAuthError(
        AuthErrorType.INVALID_TOKEN,
        'Invalid token payload: missing user identifier',
        401
      ));
    }
    // Optional: Verify user/client still exists and is active
    let account;
    try {
      if (decoded.role === 'Client') {
        account = await db.client.findUnique({
          where: { id: decoded.sub },
          select: { id: true, isActive: true, role: true }
        });
      } 
      if(decoded.role === 'CA' ) {
        account = await db.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, isActive: true, role: true }
        });
      }
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return next(createAuthError(
        AuthErrorType.SERVER_ERROR,
        'Database error',
        500
      ));
    }

    if (!account || !account.isActive) {
      return next(createAuthError(
        AuthErrorType.ACCOUNT_INACTIVE,
        'Account not found or inactive',
        401
      ));
    }

    // Set user info on request
    req.user = {
      id: decoded.sub,
      sub: decoded.sub,
      role: decoded.role,
      // type: decoded.type
    };

    next();

  } catch (err: any) {
    console.error('Token verification error:', err);

    if (err.name === 'TokenExpiredError') {
      return next(createAuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Access token has expired',
        401
      ));
    }

    if (err.name === 'JsonWebTokenError') {
      return next(createAuthError(
        AuthErrorType.INVALID_TOKEN,
        'Invalid access token',
        401
      ));
    }

    return next(createAuthError(
      AuthErrorType.SERVER_ERROR,
      'Token verification failed',
      500
    ));
  }
})

export { isAuthenticated };
