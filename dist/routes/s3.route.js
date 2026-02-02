"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const s3_controller_1 = require("@/controllers/s3.controller");
const auth_1 = require("@/middlewares/auth");
const app = (0, express_1.Router)();
app.use(auth_1.isAuthenticated);
// app.use(authorizeRoles('CA'))
app.post("/upload-url", s3_controller_1.getUploadUrl);
app.get("/download-url", s3_controller_1.getDownloadUrl);
app.delete("/delete-file", s3_controller_1.removeFile);
exports.default = app;
