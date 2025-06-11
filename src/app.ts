import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { corsOptions } from './constants/config';
import authRoutes from './routes/auth'
import clientRoutes from './routes/client'
import paymentRoutes from './routes/payment'
import cookieParser from "cookie-parser";
import errorMiddleware from './middlewares/error';
import Razorpay from 'razorpay';
import { S3Client } from '@aws-sdk/client-s3';
// Load environment variables
dotenv.config({
    path: './.env'  
});

export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cookieParser());
// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use("/api/v1/auth", authRoutes )
app.use("/api/v1/clients", clientRoutes )
app.use("/api/v1/payment", paymentRoutes )


app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});