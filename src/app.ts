import 'module-alias/register';
import cookieParser from "cookie-parser";
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { corsOptions } from './config/cors';
import errorMiddleware from './middlewares/error';
import authRoutes from './routes/auth';
import clientRoutes from './routes/client';
import paymentRoutes from './routes/payment';
import userRoutes from './routes/user';
import s3Routes from './routes/s3.route'; // Importing S3 routes
import adminRoutes from './routes/admin.route'
import clientDashboardRoutes from './routes/client-dashboard.route'
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler, notFoundHandler } from './lib/errorHandler';
// Load environment variables
dotenv.config({
  path: './.env'
});

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};


const app = express();
app.use(helmet())

const PORT = process.env.PORT || 5000;
app.use(cookieParser());
// Middleware
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});


app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/clients", clientRoutes)
app.use("/api/v1/payment", paymentRoutes)
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/s3", s3Routes); // Importing S3 routes
app.use("/api/v1/admin", adminRoutes)
app.use("/api/v1/client-dashboard", clientDashboardRoutes)
// Handle 404 for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log("process.env.CLIENT_URL: ", process.env.CLIENT_URL)
  console.log(`Server is running on port ${PORT}`);
});