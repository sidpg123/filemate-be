"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient();
};
const prisma = globalThis.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== "production")
    globalThis.prisma = prisma;
exports.default = prisma;
