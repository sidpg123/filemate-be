import { Router } from "express";
import { getUploadUrl, getDownloadUrl, removeFile } from "@/controllers/s3.controller";
import { isAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/role";

const app = Router();

app.use(isAuthenticated);
// app.use(authorizeRoles('CA'))
app.post("/upload-url", getUploadUrl);
app.get("/download-url",  getDownloadUrl);
app.delete("/delete-file", removeFile);

export default app;
