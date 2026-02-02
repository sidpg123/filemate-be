"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middlewares/auth.js");
const client_dashboard_controller_js_1 = require("@/controllers/client-dashboard.controller.js");
const role_js_1 = require("@/middlewares/role.js");
// import { createFeeCategory, deleteFeeCategory, editFeeCategory, getFeesCategories, userInfo } from "../controllers/user.controller.js";
const app = express_1.default.Router();
app.use(auth_js_1.isAuthenticated);
app.use((0, role_js_1.authorizeRoles)('Client'));
// app.use('/creaetPlan', createPlan)
// app.get('/info')
app.get('/documents', client_dashboard_controller_js_1.getDocuments);
app.get('/totalpendingfees', client_dashboard_controller_js_1.getTotalPendingFees);
app.get('/fees', client_dashboard_controller_js_1.getFeeRecords);
exports.default = app;
