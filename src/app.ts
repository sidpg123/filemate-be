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
// Load environment variables
dotenv.config({
    path: './.env'  
});

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};


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
app.use("/api/v1/user", userRoutes );
app.use("/api/v1/s3", s3Routes); // Importing S3 routes

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});