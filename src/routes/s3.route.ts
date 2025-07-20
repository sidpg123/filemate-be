import { Router } from "express";
import { getUploadUrl, getDownloadUrl, removeFile } from "@/controllers/s3.controller";
import { isAuthenticated } from "@/middlewares/auth";

const app = Router();

app.post("/upload-url", isAuthenticated, getUploadUrl);
app.get("/download-url", isAuthenticated, getDownloadUrl);
app.delete("/delete-file", isAuthenticated, removeFile);

export default app;
