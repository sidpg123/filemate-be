"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDocuments = exports.uploadUserDocMetaData = exports.deleteFeeCategory = exports.editFeeCategory = exports.createFeeCategory = exports.getFeesCategories = exports.userInfo = void 0;
const cloudfront_signer_1 = require("@aws-sdk/cloudfront-signer");
const db_1 = __importDefault(require("../lib/db"));
const healpers_1 = __importStar(require("../lib/healpers"));
const utils_1 = require("../lib/utils");
exports.userInfo = (0, healpers_1.default)(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return next(new utils_1.ErrorHandler("Unauthourized: User ID not found", 401));
    }
    //we have to send no of clients, storaeg used, pending fees. 
    const [clientCount, storage, totalPendingFees] = await Promise.all([
        db_1.default.client.count({
            where: {
                caId: userId,
                status: 'active'
            },
        }),
        db_1.default.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                storageUsed: true,
                allocatedStorage: true
            }
        }),
        db_1.default.pendingFees.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: "Pending",
                client: {
                    caId: userId,
                },
            },
        }),
    ]);
    const pendingFeesTotal = totalPendingFees._sum.amount || 0;
    res.status(200).json({
        success: true,
        data: {
            totalClients: clientCount,
            totalPendingFees: pendingFeesTotal,
            storageUsed: Number(storage?.storageUsed),
            allocatedStorage: Number(storage?.allocatedStorage)
        },
    });
});
exports.getFeesCategories = (0, healpers_1.default)(async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const categories = await db_1.default.feeCategory.findMany({
        where: {
            userId: req.user?.id
        }
    });
    res.status(200).json({
        success: true,
        data: categories
    });
});
exports.createFeeCategory = (0, healpers_1.default)(async (req, res, next) => {
    // //console.log("role", req.user?.role)
    if (!req.user?.id) {
        return next(new utils_1.ErrorHandler("Unauthorized", 401));
    }
    const { name } = req.body;
    if (!name) {
        return next(new utils_1.ErrorHandler("Category name is required", 400));
    }
    const existingCategory = await db_1.default.feeCategory.findFirst({
        where: {
            name: name,
            userId: req.user.id
        }
    });
    if (existingCategory) {
        return next(new utils_1.ErrorHandler("Category witht this name already exists", 400));
    }
    const newCategory = await db_1.default.feeCategory.create({
        data: {
            name: name,
            userId: req.user.id
        }
    });
    res.status(201).json({
        success: true,
        data: newCategory
    });
});
exports.editFeeCategory = (0, healpers_1.default)(async (req, res, next) => {
    if (!req.user?.id || req.user?.role !== "CA") {
        return next(new utils_1.ErrorHandler("Unauthorized", 401));
    }
    const { name } = req.body;
    const id = req.params.id;
    if (!id || !name) {
        return next(new utils_1.ErrorHandler("Category ID and name are required", 400));
    }
    const existingCategory = await db_1.default.feeCategory.findUnique({
        where: {
            id: id
        }
    });
    if (!existingCategory) {
        return next(new utils_1.ErrorHandler("Category not found", 404));
    }
    const updatedCategory = await db_1.default.feeCategory.update({
        where: { id: id },
        data: { name: name }
    });
    res.status(200).json({
        success: true,
        data: updatedCategory
    });
});
exports.deleteFeeCategory = (0, healpers_1.default)(async (req, res, next) => {
    if (!req.user?.id || req.user?.role !== "CA") {
        return next(new utils_1.ErrorHandler("Unauthorized", 401));
    }
    const id = req.params.id;
    if (!id) {
        return next(new utils_1.ErrorHandler("Category ID is required", 400));
    }
    const existingCategory = await db_1.default.feeCategory.findUnique({
        where: {
            id: id
        }
    });
    if (!existingCategory) {
        return next(new utils_1.ErrorHandler("Category not found", 404));
    }
    await db_1.default.feeCategory.delete({
        where: { id: id }
    });
    res.status(200).json({
        success: true,
        message: "Category deleted successfully"
    });
});
exports.uploadUserDocMetaData = (0, healpers_1.default)(async (req, res, next) => {
    const userId = req.user?.id;
    //console.log("hitted uploadDocMetaDeta")
    const { fileName, fileKey, year, fileSize } = req.body;
    let thumbnailKey = req.body.thumbnailKey || '';
    if (!userId) {
        return next(new utils_1.ErrorHandler("Unauthorized access", 401));
    }
    if (!fileName || !fileKey || !year || !fileSize || typeof fileName != 'string' || typeof fileKey != 'string' || typeof year != 'string') {
        return next(new utils_1.ErrorHandler("File info is not complete", 400));
    }
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'tiff', 'titf'].includes(fileType)) {
        thumbnailKey = fileKey;
    }
    else if (fileType != 'pdf') {
        thumbnailKey = (0, healpers_1.getThumbnailImageKey)(fileType);
    }
    await db_1.default.$transaction(async (tx) => {
        await tx.userDocument.create({
            data: {
                userId,
                fileName,
                fileKey,
                thumbnailKey,
                year,
                fileSize, // should be a number or bigint
            },
        });
        await tx.user.update({
            where: {
                id: userId,
            },
            data: {
                storageUsed: {
                    increment: BigInt(fileSize), // Make sure it's a bigint if storageUsed is bigint in DB
                },
            },
        });
        res.status(201).json({
            success: true,
            message: "Document data added successfully",
        });
    });
});
exports.getUserDocuments = (0, healpers_1.default)(async (req, res, next) => {
    //console.log("fetching documents");
    const userId = req.user?.id;
    const limit = 1;
    // const { id: clientId } = req.params;
    const nameSearch = req.query.search;
    const yearSearch = req.query.year; // <-- Add this
    const rawCursorCreatedAt = req.query.cursorUploadedAt;
    const rawCursorId = req.query.cursorId;
    // //console.log("clientId: ", clientId);
    //console.log("userId", userId);
    let cursor;
    if (rawCursorCreatedAt && rawCursorId) {
        cursor = {
            uploadedAt: new Date(rawCursorCreatedAt),
            id: rawCursorId
        };
    }
    const where = {
        userId: userId,
    };
    if (nameSearch) {
        where.fileName = {
            contains: nameSearch,
            mode: "insensitive"
        };
    }
    if (yearSearch) {
        where.year = {
            contains: yearSearch,
            mode: "insensitive"
        }; // Exact match
    }
    const documents = await db_1.default.userDocument.findMany({
        where,
        take: limit + 1,
        cursor: cursor,
        skip: cursor ? 1 : 0,
        orderBy: [
            { year: 'desc' },
            { uploadedAt: 'desc' }
        ]
    });
    const hasNextPage = documents.length > limit;
    const paginatedDocuments = hasNextPage ? documents.slice(0, limit) : documents;
    const lastDocument = hasNextPage ? paginatedDocuments[paginatedDocuments.length - 1] : null;
    const nextCursor = lastDocument ? { uploadedAt: (lastDocument.uploadedAt).toISOString(), id: lastDocument.id } : undefined;
    for (const document of paginatedDocuments) {
        // Example for canned policy usage (Node.js SDK v3 style)
        if (!document.thumbnailKey?.startsWith('/thumbnails/')) {
            document.thumbnailKey = (0, cloudfront_signer_1.getSignedUrl)({
                url: `https://${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}/${document.thumbnailKey}`,
                keyPairId: process.env.CLOUDfRONT_KEY_PAIR_ID || '',
                privateKey: process.env.CLOUDFRONT_PRIVATE_KEY || '',
                dateLessThan: new Date(Date.now() + 1000 * 60 * 15).toISOString()
            });
        }
        document.fileKey = (0, cloudfront_signer_1.getSignedUrl)({
            url: `https://${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}/${document.fileKey}?response-content-disposition=attachment`,
            keyPairId: process.env.CLOUDfRONT_KEY_PAIR_ID || '',
            privateKey: process.env.CLOUDFRONT_PRIVATE_KEY || '',
            dateLessThan: new Date(Date.now() + 1000 * 60 * 15).toISOString()
        });
    }
    res.status(200).json({
        success: true,
        data: paginatedDocuments,
        nextCursor
    });
});
