"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middlewares/auth.js");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const app = express_1.default.Router();
// app.use(isAuthenticated)
app.get('/me', auth_js_1.isAuthenticated, auth_controller_js_1.getMyProfile);
app.post('/login', auth_controller_js_1.login);
app.post('/register', auth_controller_js_1.register);
app.post('/refresh', auth_controller_js_1.refreshToken);
app.post('/google-login', auth_controller_js_1.googleLogin);
exports.default = app;
