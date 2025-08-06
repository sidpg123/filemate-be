import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
// import { createFeeCategory, deleteFeeCategory, editFeeCategory, getFeesCategories, userInfo } from "../controllers/user.controller.js";

const app = express.Router();

app.use(isAuthenticated)
// app.use('/creaetPlan', createPlan)

export default app;