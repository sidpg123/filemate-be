import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import db from '../lib/db';
import TryCatch, { getThumbnailImageKey } from '../lib/healpers';
import { ErrorHandler } from '../lib/utils';

export const userInfo = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthourized: User ID not found", 401));
    }

    //we have to send no of clients, storaeg used, pending fees. 
    const [clientCount, storage, totalPendingFees] = await Promise.all([
        db.client.count({
            where: { caId: userId },
        }),
        db.user.findUnique({
            where: {
                id: userId
            },
            select: {
                storageUsed: true,
                allocatedStorage: true
            }
        }),
        db.pendingFees.aggregate({
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

})

export const getFeesCategories = TryCatch(async (req, res) => {
    
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const categories = await db.feeCategory.findMany({
        where: {
            userId: req.user?.id
        }
    });

    res.status(200).json({
        success: true,
        data: categories
    });
})

export const createFeeCategory = TryCatch(async (req, res, next) => {
    // //console.log("role", req.user?.role)
    if(!req.user?.id ) {
        return next(new ErrorHandler("Unauthorized", 401));
    }

    const { name } = req.body;

    if (!name) {
        return next(new ErrorHandler("Category name is required", 400));
    }

    const existingCategory = await db.feeCategory.findFirst({
        where: {
            name: name, 
            userId: req.user.id
        }
    })
    
    if(existingCategory) {
        return next(new ErrorHandler("Category witht this name already exists", 400));
    }

    const newCategory = await db.feeCategory.create({
        data: {
            name: name, 
            userId: req.user.id
        }
    })

    res.status(201).json({
        success: true, 
        data: newCategory
    })
})

export const editFeeCategory = TryCatch(async (req, res, next) => {
    if(!req.user?.id || req.user?.role !== "CA") {
        return next(new ErrorHandler("Unauthorized", 401));
    }

    const { name } = req.body;
    const { id } = req.params;

    if (!id || !name) {
        return next(new ErrorHandler("Category ID and name are required", 400));
    }

    const existingCategory = await db.feeCategory.findUnique({
        where: {
            id: id
        }
    });

    if (!existingCategory) {
        return next(new ErrorHandler("Category not found", 404));
    }

    const updatedCategory = await db.feeCategory.update({
        where: { id: id },
        data: { name: name }
    });

    res.status(200).json({
        success: true,
        data: updatedCategory
    });
})

export const deleteFeeCategory = TryCatch(async (req, res, next) => {
    if(!req.user?.id || req.user?.role !== "CA") {
        return next(new ErrorHandler("Unauthorized", 401));
    }

    const { id } = req.params;

    if (!id) {
        return next(new ErrorHandler("Category ID is required", 400));
    }

    const existingCategory = await db.feeCategory.findUnique({
        where: {
            id: id
        }
    });

    if (!existingCategory) {
        return next(new ErrorHandler("Category not found", 404));
    }

    await db.feeCategory.delete({
        where: { id: id }
    });

    res.status(200).json({
        success: true,
        message: "Category deleted successfully"
    });
});

export const uploadUserDocMetaData = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;
    //console.log("hitted uploadDocMetaDeta")

    const { fileName, fileKey, year, fileSize } = req.body;
    let thumbnailKey = req.body.thumbnailKey || '';

    if (!userId) {
        return next(new ErrorHandler("Unauthorized access", 401));
    }


    if (!fileName || !fileKey || !year || !fileSize || typeof fileName != 'string' || typeof fileKey != 'string' || typeof year != 'string') {
        return next(new ErrorHandler("File info is not complete", 400));
    }

    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    if (['png', 'jpg', 'jpeg', 'tiff', 'titf'].includes(fileType)) {
        thumbnailKey = fileKey;
    } else if (fileType != 'pdf') {
        thumbnailKey = getThumbnailImageKey(fileType);
    }

    await db.$transaction(async (tx) => {
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

})

export const getUserDocuments = TryCatch(async (req, res, next) => {
    //console.log("fetching documents");

    const userId = req.user?.id;
    const limit = 1;
    // const { id: clientId } = req.params;
    const nameSearch = req.query.search as string | undefined;
    const yearSearch = req.query.year as string | undefined; // <-- Add this
    const rawCursorCreatedAt = req.query.cursorUploadedAt;
    const rawCursorId = req.query.cursorId;
    // //console.log("clientId: ", clientId);
    //console.log("userId", userId);

    let cursor;
    if (rawCursorCreatedAt && rawCursorId) {
        cursor = {
            uploadedAt: new Date(rawCursorCreatedAt as string),
            id: rawCursorId as string
        };
    }

    const where: any = {
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
        } // Exact match
    }

    const documents = await db.userDocument.findMany({
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
            document.thumbnailKey = getSignedUrl({
                url: `https://${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}/${document.thumbnailKey}`,
                keyPairId: process.env.CLOUDfRONT_KEY_PAIR_ID || '',
                privateKey: process.env.CLOUDFRONT_PRIVATE_KEY || '',
                dateLessThan: new Date(Date.now() + 1000 * 60 * 15).toISOString()
            });
        }

        document.fileKey = getSignedUrl({
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
})