import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import TryCatch from "../lib/healpers";
import db from '../lib/db';
import { userSchema } from "../zodSchemas/user.schema";
import { ErrorHandler } from "../lib/utils";

const JWT_SECRET = process.env.AUTH_SECRET || "yoursecret";
const ACCESS_TOKEN_EXPIRY = "15m"; // Increased from 2m
const REFRESH_TOKEN_EXPIRY = "7d";

export const login = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Generate tokens with consistent payload
  const tokenPayload = { 
    id: user.id, 
    role: user.role,
    // type: 'user' // Add type to distinguish user vs client
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  
  const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

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
});

export const googleLogin = TryCatch(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email is required", 400));
  }

  // Check both user and client tables
  const [user, client] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.client.findUnique({ where: { email } })
  ]);

  if (!user && !client) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Determine which account to use
  const account = user || client;
//   const accountType = user ? 'user' : 'client';

  const tokenPayload = { 
    id: account?.id, 
    role: account?.role,
    // type: accountType
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  
  const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: {
      id: account?.id,
      name: account?.name,
      email: account?.email,
      role: account?.role,
    },
    accessToken,
    refreshToken,
  });
});

export const register = TryCatch(async (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) { 
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  const validatedData = userSchema.parse({name, email, password});

  const existingUser = await db.user.findUnique({
    where: { email: validatedData.email },
  });

  if(existingUser) {
    return next(new ErrorHandler("User with this email already exists", 409));
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  await db.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      passwordHash: hashedPassword,
    },
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully!",
  });
});

export const refreshToken = TryCatch(async (req, res, next) => {
  let refreshToken = req.headers.authorization;
  console.log("hitted in refreshToken for user: ", req.user?.id);

  if (refreshToken && refreshToken.startsWith("Bearer ")) {
    refreshToken = refreshToken.split(" ")[1];
  }

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
    });
  }

  try {
    // Verify token signature AND expiration
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token payload",
      });
    }

    // Check if user exists based on token type
    let account;
    if (decoded.role === 'Client') {
      account = await db.client.findUnique({
        where: { id: decoded.id },
      });
    } else {
      account = await db.user.findUnique({
        where: { id: decoded.id },
      });
    }

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Generate new tokens with same payload structure
    const tokenPayload = { 
      id: account.id, 
      role: account.role,
    //   type: decoded.type || 'user'
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const newRefreshToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
});




export const getMyProfile = TryCatch(async (req, res, next) => {
  // const user = await User.findById(req.user);
  //console.log("hited")
  // if (!user) return nex t(new ErrorHandler("User not found", 404));
  // //console.log("req.user", req.user);
  // // //console.log("req.header", req.cookies);
  // //console.log("req.headers", req.headers.authorization);
  res.status(200).json({
    success: true,
    message: "Hello"
  });
});
