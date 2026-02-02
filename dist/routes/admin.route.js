"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middlewares/auth.js");
// import { createFeeCategory, deleteFeeCategory, editFeeCategory, getFeesCategories, userInfo } from "../controllers/user.controller.js";
const app = express_1.default.Router();
app.use(auth_js_1.isAuthenticated);
// app.use('/creaetPlan', createPlan)
exports.default = app;
