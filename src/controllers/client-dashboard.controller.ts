import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import db from '../lib/db';
import TryCatch from '../lib/healpers';
import { ErrorHandler } from '../lib/utils';


export const getDocuments = TryCatch(async (req, res, next) => {

    const userId = req.user?.id;
    const limit = 20;
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
        clientId: userId,
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

    const documents = await db.document.findMany({
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

    const nextCursor = lastDocument ? { uploadedAt: lastDocument.uploadedAt, id: lastDocument.id } : undefined;

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

export const getTotalPendingFees = TryCatch(async (req, res, next) => {
    // const { id } = req.params; // Client ID
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    try {
        const stats = await db.pendingFees.groupBy({
            by: ['status'],
            where: {
                clientId: userId,
                // client: { caId: userId }
            },
            _sum: {
                amount: true
            },
        });

        type StatusKey = 'pending' | 'paid';
        const summary = stats.reduce((acc, stat) => {
            const key = stat.status.toLowerCase() as StatusKey;
            if (key === 'pending') {
                acc[key] = {
                    // count: stat._count.id,
                    amount: stat._sum.amount || 0
                };
            }
            return acc;
        }, {
            pending: {  amount: 0 },
            // overdue: {  amount: 0 }
        } as Record<StatusKey, { amount: number }>);

        res.status(200).json({
            success: true,
            message: "Fee statistics fetched successfully",
            summary
        });

    } catch (error) {
        console.error("Error fetching fee statistics:", error);
        return next(new ErrorHandler("Failed to fetch fee statistics", 500));
    }
});

export const getFeeRecords = TryCatch(async (req, res, next) => {
    // const { id } = req.params; // Client ID
    const userId = req.user?.id;

    const {
        cursorId,
        cursorCreatedAt,
        limit = '10',
        search,
        status,
        page = '1',
        // feeCategoryId
    } = req.query;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    // if (!id) {
    //     return next(new ErrorHandler("Client ID is required", 400));
    // }

    if (typeof userId !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    // const clientExists = await db.client.findUnique({
    //     where: {
    //         id,
    //         caId: userId,
    //     },
    // });

    // if (!clientExists) {
    //     return next(new ErrorHandler("Client not found or does not belong to you", 404));
    // }

    let whereClause: any = {
        clientId: userId,
        // client: { caId: userId }
    };

    if (search && typeof search === 'string') {
        whereClause.OR = [
            { note: { contains: search, mode: 'insensitive' } },
            ...(isNaN(Number(search)) ? [] : [{ amount: { equals: parseFloat(search) } }])
        ];
    }

    // if (feeCategoryId && typeof feeCategoryId === 'string') {
    //     whereClause.feeCategoryId = feeCategoryId;
    // }

    if (status && typeof status === 'string') {
        if (status === 'pending') {
            whereClause.status = { in: ['Pending'] };
        } else if (status === 'paid') {
            whereClause.status = 'Paid';
        }
    }

    try {
        const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50);
        const currentPage = parseInt(page as string, 10) || 1;

        const queryOptions: any = {
            where: whereClause,
            take: limitNum + 1, // Take one extra to check if there are more
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ],
            select: {
                id: true,
                amount: true,
                note: true,
                dueDate: true,
                status: true,
                createdAt: true,
                feeCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        };

        if (cursorId && cursorCreatedAt && typeof cursorId === 'string' && typeof cursorCreatedAt === 'string') {
            queryOptions.cursor = {
                createdAt_id: {
                    createdAt: new Date(cursorCreatedAt),
                    id: cursorId
                }
            };
            queryOptions.skip = 1;
        }

        const feeRecordsRaw = await db.pendingFees.findMany(queryOptions);

        const now = new Date();

        const feeRecords = feeRecordsRaw.map(fee => {
            if (fee.status === 'Pending' && new Date(fee.dueDate) < now) {
                return { ...fee, status: 'Overdue' };
            }
            return fee;
        });

        const hasMore = feeRecords.length > limitNum;
        const data = hasMore ? feeRecords.slice(0, -1) : feeRecords;
        const last = data[data.length - 1];
        const nextCursor = hasMore
            ? { cursorId: last?.id, cursorCreatedAt: last?.createdAt }
            : null;


        res.status(200).json({
            success: true,
            message: "Fee records fetched successfully",
            data,
            nextCursor,
            hasMore,
            // summary,
            pagination: {
                currentPage,
                limit: limitNum,
                // total: allFees.length
            }
        });

    } catch (error) {
        console.error("Error fetching fee records:", error);
        return next(new ErrorHandler("Failed to fetch fee records", 500));
    }
});
