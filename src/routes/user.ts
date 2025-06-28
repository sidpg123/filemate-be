import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { userInfo } from "../controllers/user.controller.js";

const app = express.Router();

app.use(isAuthenticated)
app.get('/info', userInfo)

export default app;