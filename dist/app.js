"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_2 = require("./config/cors");
const error_1 = __importDefault(require("./middlewares/error"));
const auth_1 = __importDefault(require("./routes/auth"));
const client_1 = __importDefault(require("./routes/client"));
const payment_1 = __importDefault(require("./routes/payment"));
const user_1 = __importDefault(require("./routes/user"));
const s3_route_1 = __importDefault(require("./routes/s3.route")); // Importing S3 routes
const admin_route_1 = __importDefault(require("./routes/admin.route"));
const client_dashboard_route_1 = __importDefault(require("./routes/client-dashboard.route"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errorHandler_1 = require("./lib/errorHandler");
// Load environment variables
dotenv_1.default.config({
    path: './.env'
});
BigInt.prototype.toJSON = function () {
    return Number(this);
};
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const PORT = process.env.PORT || 5000;
app.use((0, cookie_parser_1.default)());
// Middleware
app.use((0, cors_1.default)(cors_2.corsOptions));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use("/api/v1/auth", auth_1.default);
app.use("/api/v1/clients", client_1.default);
app.use("/api/v1/payment", payment_1.default);
app.use("/api/v1/user", user_1.default);
app.use("/api/v1/s3", s3_route_1.default); // Importing S3 routes
app.use("/api/v1/admin", admin_route_1.default);
app.use("/api/v1/client-dashboard", client_dashboard_route_1.default);
// Handle 404 for unmatched routes
app.use(errorHandler_1.notFoundHandler);
// Global error handling middleware (must be last)
app.use(errorHandler_1.globalErrorHandler);
app.use(error_1.default);
app.listen(PORT, () => {
    console.log("process.env.CLIENT_URL: ", process.env.CLIENT_URL);
    console.log(`Server is running on port ${PORT}`);
});
