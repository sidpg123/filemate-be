import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { corsOptions } from './constants/config';
import userRoutes from './routes/users';
import cookieParser from "cookie-parser";
// Load environment variables
dotenv.config({
    path: './.env'
});
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cookieParser());
// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/user", userRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
