import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import TryCatch from "../lib/healpers";
import db from '../lib/db';
import { userSchema } from "../zodSchemas/user.schema";
import { ErrorHandler } from "../lib/utils";

const JWT_SECRET = process.env.AUTH_SECRET || "yoursecret";

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

  console.log(JWT_SECRET)
  // Generate access and refresh tokens
  const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  const refreshToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  console.log("hitted");
  console.log("accessToken in backend", accessToken);
  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // storageUsed: user.storageUsed,
    },
    accessToken,
    refreshToken,
  });
});

export const googleLogin = TryCatch(async (req, res, next) => {
  const { email, name, picture } = req.body;
  console.log("hitted in google login")
  console.log("req.body", req.body)

  if (!email) {
    return next(new ErrorHandler("Email and name are required", 400));
  }

  // Check if user already exists
  const user = await db.user.findUnique({
    where: { email },
  });

  const client = await db.client.findUnique({
    where: { email },
  });

  if(user) {
    // User exists, generate tokens
    const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const refreshToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        // storageUsed: user.storageUsed,
      },
      accessToken,
      refreshToken,
    });
  }

  if(client) {
    // Client exists, generate tokens
    const accessToken = jwt.sign({ id: client.id, role: client.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const refreshToken = jwt.sign({ id: client.id, role: client.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        role: client.role,
        // storageUsed: client.storageUsed,
      },
      accessToken,
      refreshToken,
    });
  }


});

export const register = TryCatch(async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log("hitted in register")
  console.log("req.body", req.body)
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

  if(existingUser) return next(new ErrorHandler("User with this email already exists", 409));

  // Hash the password
  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  // Create new user
  const newUser = await db.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      passwordHash: hashedPassword,
    },
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully!",
  })

});


export const refreshToken = TryCatch(async (req, res, next) => {
  let refreshToken = req.headers.authorization;

  if (refreshToken && refreshToken.startsWith("Bearer ")) {
    refreshToken = refreshToken.split(" ")[1];
  }

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
    });
  }

  // Decode without verifying expiration
  const decoded = jwt.decode(refreshToken) as jwt.JwtPayload | null;

  if (!decoded || typeof decoded === "string" || !decoded.id) {
    return res.status(403).json({
      success: false,
      message: "Invalid refresh token",
    });
  }

  try {
    // You can optionally verify token signature, ignoring expiration
    jwt.verify(refreshToken, JWT_SECRET, { ignoreExpiration: true });

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new tokens
    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const newRefreshToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    
    console.log("newAccessToken in backend", newAccessToken);
    console.log("newRefreshToken in backend", newRefreshToken);


    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err) {
    console.log("Refresh token invalid:", err);
    return res.status(403).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});



export const getMyProfile = TryCatch(async (req, res, next) => {
  // const user = await User.findById(req.user);
  console.log("hited")
  // if (!user) return nex t(new ErrorHandler("User not found", 404));
  // console.log("req.user", req.user);
  // // console.log("req.header", req.cookies);
  // console.log("req.headers", req.headers.authorization);
  res.status(200).json({
    success: true,
    message: "Hello"
  });
});
