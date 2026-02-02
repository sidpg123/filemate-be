"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middlewares/auth.js");
const payment_controller_js_1 = require("../controllers/payment.controller.js");
const app = express_1.default.Router();
app.post('/paymentverification', payment_controller_js_1.paymentVerification);
app.use(auth_js_1.isAuthenticated);
app.post('/checkout', payment_controller_js_1.checkout);
app.get('/getKey', payment_controller_js_1.getRazorpayKey);
app.get('/subscriptions', payment_controller_js_1.getSubscription);
app.get('/subscription/status', payment_controller_js_1.hasActiveSubscription);
exports.default = app;
