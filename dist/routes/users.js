import express from "express";
import { isAuthenticated } from "../middlewares/auth";
import { getMyProfile } from "../controllers/user.controller";
const app = express.Router();
app.use(isAuthenticated);
app.get('/me', getMyProfile);
export default app;
