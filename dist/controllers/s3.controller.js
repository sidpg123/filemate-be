"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFile = exports.getDownloadUrl = exports.getUploadUrl = void 0;
const healpers_1 = __importDefault(require("@/lib/healpers"));
const utils_1 = require("@/lib/utils");
const s3_service_1 = require("@/services/s3.service");
const db_1 = __importDefault(require("../lib/db"));
const cloudfront_service_1 = require("@/services/cloudfront.service");
exports.getUploadUrl = (0, healpers_1.default)(async (req, res, next) => {
    const { key, contentType, fileSize } = req.body;
    const userId = req.user?.id;
    if (!key || !contentType) {
        return next(new utils_1.ErrorHandler("Key and content type are required", 400));
    }
    if (!fileSize) {
        return next(new utils_1.ErrorHandler("File size not provided", 400));
    }
    const user = await db_1.default.user.findUnique({
        where: {
            id: userId
        }
    });
    if (!user) {
        return next(new utils_1.ErrorHandler("User not found", 401));
    }
    const allowedStorage = user?.allocatedStorage;
    const usedStorage = user.storageUsed;
    if (BigInt(usedStorage) + BigInt(fileSize) > BigInt(allowedStorage)) {
        return res.status(400).json({ error: "Storage limit exceeded" });
    }
    if (typeof key !== "string" || typeof contentType !== "string") {
        return next(new utils_1.ErrorHandler("Key and content type must be strings", 400));
    }
    const url = await (0, s3_service_1.generateUploadUrl)(key, contentType);
    res.json({ success: true, url });
});
exports.getDownloadUrl = (0, healpers_1.default)(async (req, res, next) => {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
        return next(new utils_1.ErrorHandler("Key is required and must be a string", 400));
    }
    const url = await (0, s3_service_1.generateDownloadUrl)(key);
    res.json({ success: true, url });
});
exports.removeFile = (0, healpers_1.default)(async (req, res, next) => {
    const { key, clientId, fileId } = req.body;
    if (!key || typeof key !== "string" || !clientId || typeof clientId !== "string") {
        return next(new utils_1.ErrorHandler("Key and clientId are required and must be strings", 400));
    }
    const userId = req.user?.id;
    if (!userId) {
        return next(new utils_1.ErrorHandler("User not found", 401));
    }
    const client = await db_1.default.client.findUnique({
        where: {
            caId: userId,
            id: clientId
        }
    });
    if (!client) {
        return next(new utils_1.ErrorHandler("Client not found", 401));
    }
    const file = await db_1.default.document.findUnique({
        where: {
            id: fileId,
            fileKey: key,
            clientId: clientId
        }
    });
    if (!file) {
        return next(new utils_1.ErrorHandler("file not found", 404));
    }
    if (file.clientId !== clientId) {
        return next(new utils_1.ErrorHandler("You are not authorized to delete this file", 403));
    }
    await db_1.default.$transaction(async (tx) => {
        await tx.document.delete({
            where: {
                id: file.id,
                fileKey: key,
                clientId: clientId
            }
        });
        await tx.client.update({
            where: {
                id: clientId
            },
            data: {
                storageUsed: {
                    decrement: file.fileSize
                }
            }
        });
        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                storageUsed: {
                    decrement: file.fileSize
                }
            }
        });
    });
    let keyarr = [];
    if (file.fileName.endsWith(".pdf")) {
        keyarr = [key, file.thumbnailKey];
        await (0, s3_service_1.deleteFile)(file.thumbnailKey);
        await (0, s3_service_1.deleteFile)(key);
    }
    else {
        keyarr = [key];
        await (0, s3_service_1.deleteFile)(key);
    }
    await (0, cloudfront_service_1.deleteFromCloudFront)(keyarr);
    res.json({ success: true, message: "Deleted" });
});
