import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createFeeCategory, deleteFeeCategory, editFeeCategory, getFeesCategories, getUserDocuments, uploadUserDocMetaData, userInfo } from "../controllers/user.controller.js";

const app = express.Router();

app.use(isAuthenticated)
app.get('/info', userInfo)

app.get('/fees/categories', getFeesCategories);
app.post('/fees/categories', createFeeCategory);
app.put('/fees/categories/:id', editFeeCategory);
app.delete('/fees/categories/:id', deleteFeeCategory);

app.get('/documents', getUserDocuments);
app.post('/documents', uploadUserDocMetaData);
export default app;