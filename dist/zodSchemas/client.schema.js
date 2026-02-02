"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientSchema = void 0;
const zod_1 = require("zod");
exports.clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Client name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    phoneNumber: zod_1.z.string().optional(),
    professionalId: zod_1.z.string().uuid("Invalid Professional ID"),
});
