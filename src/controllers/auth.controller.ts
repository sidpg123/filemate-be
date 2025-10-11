import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import TryCatch from "../lib/healpers";
import db from '../lib/db';
import { userSchema } from "../zodSchemas/user.schema";
import { ErrorHandler } from "../lib/utils";
import { AuthRequest, LoginAttempt, RateLimitData, TokenPayload, UserProfile } from "@/types/auth.type";

// Type definitions

// Environment validation
const ACCESS_JWT_SECRET = process.env.ACCESS_JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET;

if (!ACCESS_JWT_SECRET || !REFRESH_JWT_SECRET) {
  throw new Error("JWT secrets are required. Set ACCESS_JWT_SECRET and REFRESH_JWT_SECRET environment variables.");
}

if (ACCESS_JWT_SECRET.length < 32 || REFRESH_JWT_SECRET.length < 32) {
  throw new Error("JWT secrets must be at least 32 characters long.");
}

// Token configuration
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Rate limiting helpers (you should implement these with Redis or similar)
const loginAttempts = new Map<string, RateLimitData>(); // In production, use Redis
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Helper function to check rate limiting
function checkRateLimit(identifier: string): LoginAttempt {
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    return { allowed: true };
  }

  // If lockout period has passed, clear attempts
  if (Date.now() > attempts.lockoutEndsAt) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  // If still in lockout period
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return {
      allowed: false,
      lockoutEndsAt: attempts.lockoutEndsAt
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts.count
  };
}

function recordFailedAttempt(identifier: string): void {
  const existing = loginAttempts.get(identifier) || { count: 0, lockoutEndsAt: 0 };
  const newCount = existing.count + 1;

  loginAttempts.set(identifier, {
    count: newCount,
    lockoutEndsAt: newCount >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_TIME : 0
  });
}

function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// Helper function to generate secure tokens
function generateTokens(payload: { id: string; role: string }): { accessToken: string; refreshToken: string } {
  // Use consistent payload structure for both tokens
  const tokenPayload = {
    sub: payload.id,  // JWT standard: use 'sub' for subject
    id: payload.id,   // Keep 'id' for backward compatibility
    role: payload.role,
    // iss: 'filesmate-backend',
    // aud: 'filesmate-users'
  };

  const accessToken = jwt.sign(tokenPayload, ACCESS_JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    { ...tokenPayload, jti: crypto.randomUUID() },
    REFRESH_JWT_SECRET!,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    }
  );

  return { accessToken, refreshToken };
}

// Helper function for consistent error responses
function createErrorResponse(message: string, statusCode: number) {
  return {
    success: false,
    error: message.toUpperCase().replace(/\s+/g, '_'),
    message,
    timestamp: new Date().toISOString()
  };
}

// Input validation schema
const loginSchema = userSchema.pick({ email: true, password: true });

export const login = TryCatch(async (req: AuthRequest, res: Response) => {
  const clientIP = (req.ip || req.socket?.remoteAddress || 'unknown') as string;

  console.log('loigin IP', clientIP)
  // Rate limiting check
  const rateLimitResult = checkRateLimit(clientIP);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      ...createErrorResponse("Too many login attempts", 429),
      retryAfter: Math.ceil((rateLimitResult.lockoutEndsAt! - Date.now()) / 1000)
    });
  }

  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        lastLoginAt: true
      }
    });

    // Use constant-time comparison to prevent timing attacks
    /**A timing attack is a type of side-channel attack where an attacker tries to figure out secrets 
     * (like passwords, encryption keys, or whether an account exists) by measuring how long certain operations take.
        The core idea:
        If two different conditions take slightly different amounts of time to process, 
        a skilled attacker can measure those differences and use them to deduce sensitive information.
     */
    const isValidUser = user && user.isActive;
    const isValidPassword = isValidUser ? await bcrypt.compare(password, user.passwordHash) : false;

    // Always perform bcrypt comparison even if user doesn't exist (timing attack prevention)
    if (!isValidUser) {
      await bcrypt.compare(password, '$2a$10$fake.hash.to.prevent.timing.attacks.dummy.hash');
    }

    if (!isValidUser || !isValidPassword) {
      recordFailedAttempt(clientIP);
      recordFailedAttempt(email); // Also track by email

      return res.status(401).json(
        createErrorResponse("Invalid credentials", 401)
      );
    }

    // Success - clear failed attempts
    clearFailedAttempts(clientIP);
    clearFailedAttempts(email);

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const tokenPayload = {
      id: user.id, 
      role: user.role,
      // type: 'user'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json(
        createErrorResponse("Invalid input data", 400)
      );
    }
    throw error; // Let TryCatch handle unexpected errors
  }
});

export const googleLogin = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return next(new ErrorHandler("Email is required", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new ErrorHandler("Invalid email format", 400));
    }

    // Check both user and client tables
    const [user, client] = await Promise.all([
      db.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      }),
      db.client.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      })
    ]);

    const account = user || client;

    if (!account || !account.isActive) {
      return next(new ErrorHandler("Account not found or inactive", 404));
    }

    // Update last login
    const updatePromise = user
      ? db.user.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } })
      : db.client.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });

    await updatePromise;

    // Generate tokens
    const tokenPayload = {
      id: account.id,
      role: account.role,
      // type: user ? 'user' : 'client'
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
      },
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error("Google login error:", error);
    return next(new ErrorHandler("Login failed", 500));
  }
});

export const register = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validatedData = userSchema.parse(req.body);
    const { name, email, password } = validatedData;

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });

    if (existingUser) {
      return next(new ErrorHandler("User with this email already exists", 409));
    }

    // Hash password with higher cost for new registrations
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
   const user =  await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date()
      },
    });

     await db.subscription.create({
            data: {
                userId: user.id as string,
                planId: "e77dbc82-7325-4823-b3bc-1e8d4675946c", //FFA
                status: 'active',
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                createdAt: new Date(),
            }
        })


    res.status(201).json({
      success: true,
      message: "User registered successfully!",
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json(
        createErrorResponse("Invalid input data", 400)
      );
    }
    throw error;
  }
});

export const refreshToken = TryCatch(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let refreshToken = req.headers.authorization;

  
  // Extract token from Bearer header
  if (refreshToken?.startsWith("Bearer ")) {
    refreshToken = refreshToken.split(" ")[1];
  }
  
  if (!refreshToken) {
    return res.status(401).json(
      createErrorResponse("Refresh token missing", 401)
    );
  }
  
  try {
    // Verify refresh token with refresh secret
    const decoded = jwt.verify(refreshToken, REFRESH_JWT_SECRET) as TokenPayload;
    
    if (!decoded?.id || !decoded?.role) {
      return res.status(403).json(
        createErrorResponse("Invalid refresh token payload", 403)
      );
    }
    
    // Check if account exists and is active
    let account: UserProfile | null = null;
    const accountId = decoded.id;
    console.log("Token refresh request for user:", accountId || 'unknown', "at", new Date().toISOString());
    
    try {
      if (decoded.role === 'Client') {
        account = await db.client.findUnique({
          where: { id: accountId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }) as UserProfile | null;
      } else {
        account = await db.user.findUnique({
          where: { id: accountId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }) as UserProfile | null;
      }
    } catch (dbError) {
      console.error("Database error during refresh:", dbError);
      return res.status(500).json(
        createErrorResponse("Server error", 500)
      );
    }

    if (!account || !account.isActive) {
      return res.status(404).json(
        createErrorResponse("Account not found or inactive", 404)
      );
    }

    // Generate new tokens (refresh token rotation)
   const tokenPayload = {
      id: account.id,
      role: account.role,
      // type: decoded.type
    };

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

    // Optional: Store refresh token JTI in database for revocation capability
    // await db.refreshToken.create({
    //   data: {
    //     jti: jwt.decode(newRefreshToken)?.jti,
    //     userId: account.id,
    //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    //   }
    // });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err: any) {
    console.error("Refresh token verification failed:", {
      error: err.message,
      name: err.name,
      timestamp: new Date().toISOString()
    });

    // Provide specific error messages for different JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json(
        createErrorResponse("Refresh token has expired", 403)
      );
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json(
        createErrorResponse("Invalid refresh token", 403)
      );
    } else {
      return res.status(403).json(
        createErrorResponse("Token verification failed", 403)
      );
    }
  }
});

export const logout = TryCatch(async (req: Request, res: Response) => {
  // Optional: Implement token blacklisting here
  // const refreshToken = req.body.refreshToken;
  // if (refreshToken) {
  //   await db.refreshToken.delete({ where: { token: refreshToken } });
  // }

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
});

export const getMyProfile = TryCatch(async (req: AuthRequest, res: Response, next: NextFunction) => {
  // This assumes you have auth middleware that sets req.user
  const userId = req.user?.id || req.user?.id;

  if (!userId) {
    return next(new ErrorHandler("Authentication required", 401));
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return next(new ErrorHandler("Failed to fetch profile", 500));
  }
});