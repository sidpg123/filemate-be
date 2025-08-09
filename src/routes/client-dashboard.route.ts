import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getDocuments, getFeeRecords, getTotalPendingFees } from "@/controllers/client-dashboard.controller.js";
// import { createFeeCategory, deleteFeeCategory, editFeeCategory, getFeesCategories, userInfo } from "../controllers/user.controller.js";

const app = express.Router();

app.use(isAuthenticated)
// app.use('/creaetPlan', createPlan)
// app.get('/info')
app.get('/documents', getDocuments)
app.get('/totalpendingfees', getTotalPendingFees)
app.get('/fees', getFeeRecords)

export default app;