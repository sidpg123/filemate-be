"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN = exports.corsOptions = void 0;
const corsOptions = {
    origin: [
        "http://localhost:3000",
        process.env.CLIENT_URL || 'http://localhost:3000',
        'https://www.filesmate.in/'
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};
exports.corsOptions = corsOptions;
const TOKEN = "authjs.session-token";
exports.TOKEN = TOKEN;
