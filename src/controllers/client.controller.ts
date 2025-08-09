// /*---

// ## 👨‍⚖️ **3. Client Management (`/clients`)**

// | Method | Route                     | Description                       |
// | ------ | ------------------------- | --------------------------------- |
// | GET    | `/clients`                | Get all clients of logged-in user |
// | POST   | `/clients`                | Add a new client                  |
// | GET    | `/clients/:id`            | Get specific client details       |
// | PUT    | `/clients/:id`            | Edit client details               |
// | DELETE | `/clients/:id`            | Remove client                     |
// | PUT    | `/clients/:id/fee-status` | Mark fee as paid/unpaid           |

// ---
// */

import db from '../lib/db';
import TryCatch, { getThumbnailImageKey } from '../lib/healpers';
import { ErrorHandler } from '../lib/utils';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

export const getClients = TryCatch(async (req, res, next) => {
    console.log("Fetching clients for user...");
    const userId = req.user?.id;
    const limit = 30;
    const rawCursorCreatedAt = req.query.cursorCreatedAt;
    const rawCursorId = req.query.cursorId;
    const nameSearch = req.query.search as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const feesStatusFilter = req.query.feeStatus as string | undefined; // Pending, Paid
    const sortBy = req.query.sortBy as string | undefined; // pendingPayment, name, createdAt
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

    let cursor;
    if (rawCursorCreatedAt && rawCursorId) {
        cursor = {
            createdAt: new Date(rawCursorCreatedAt as string),
            id: rawCursorId as string
        }
    }

    // Build where clause for search and filter
    const where: any = {
        caId: userId,
    };

    if (nameSearch) {
        where.name = { contains: nameSearch, mode: "insensitive" };
    }

    if (statusFilter) {
        where.status = statusFilter;
    }

    // Note: We'll handle payment status filtering after calculating pending fees
    // because it's a computed field, not a direct database field

    // Build orderBy - For pending payment sort, we'll handle it after fetching
    let orderBy: any[] = [];
    if (sortBy === "name") {
        orderBy.push({ name: sortOrder });
    } else if (sortBy === "pendingPayment") {
        // We'll sort this after calculating pending payments
        orderBy.push({ createdAt: "desc" }); // Default order for now
    } else {
        orderBy.push({ createdAt: sortOrder });
    }
    orderBy.push({ id: "desc" }); // tie breaker

    // For pending payment sort or payment status filter, we need more data
    const needsPostProcessing = sortBy === "pendingPayment" || feesStatusFilter;
    const fetchLimit = needsPostProcessing ? limit * 3 : limit + 1;

    const clients = await db.client.findMany({
        where,
        take: fetchLimit,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy,
        include: {
            fees: true,
        },
    });

    // Calculate pending fees for each client
    let clientsWithPendingFees = clients.map(client => {
        const pendingFees = client.fees
            .filter(fee => fee.status === "Pending")
            .reduce((sum, fee) => sum + fee.amount, 0);

        return {
            ...client,
            pendingFees
        };
    });

    // Apply payment status filter based on computed pending fees
    if (feesStatusFilter === "Pending") {
        clientsWithPendingFees = clientsWithPendingFees.filter(client => client.pendingFees > 0);
    } else if (feesStatusFilter === "Paid") {
        clientsWithPendingFees = clientsWithPendingFees.filter(client => client.pendingFees === 0);
    }

    // If sorting by pending payment, sort here
    let sortedClients = clientsWithPendingFees;
    if (sortBy === "pendingPayment") {
        sortedClients = clientsWithPendingFees.sort((a, b) => {
            if (sortOrder === "asc") {
                return a.pendingFees - b.pendingFees;
            } else {
                return b.pendingFees - a.pendingFees;
            }
        });
    }

    // Apply pagination after filtering and sorting
    const hasNextPage = sortedClients.length > limit;
    const paginatedClients = hasNextPage ? sortedClients.slice(0, limit) : sortedClients;

    const lastClient = hasNextPage ? paginatedClients[paginatedClients.length - 1] : null;
    const nextCursor = lastClient
        ? { createdAt: lastClient.createdAt, id: lastClient.id }
        : undefined;

    // Calculate total pending fees
    let totalPendingFees = 0;
    paginatedClients.forEach(client => {
        totalPendingFees += client.pendingFees;
    });

    // Format response data
    const clientsResponse = paginatedClients.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        pendingFees: client.pendingFees,
        createdAt: client.createdAt
    }));

    res.status(200).json({
        success: true,
        message: "Clients fetched successfully",
        clients: clientsResponse,
        nextCursor,
        totalPendingFees,
        meta: {
            sortBy,
            sortOrder,
            feesStatusFilter,
            hasFilters: !!(nameSearch || statusFilter || feesStatusFilter),
            // Add warning when sorting by pending payment with "Paid" filter
            sortWarning: feesStatusFilter === "Paid" && sortBy === "pendingPayment"
                ? "All clients have $0 pending - sort by name or date instead"
                : null
        }
    });
});

// export const getClientsSortedByFees = TryCatch(async (req, res, next) => {
//     const userId = req.user?.id;
//     const limit = 2;
//     const cursorId = req.query.cursorId as string | undefined;

//     const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

//     // Step 1: Get all grouped + sorted clientIds (simulate cursor)
//     const allFeeGroups = await db.pendingFees.groupBy({
//         by: ["clientId"],
//         where: {
//             client: {
//                 caId: userId,
//             },
//             status: "Pending",
//         },
//         _sum: {
//             amount: true,
//         },
//         orderBy: {
//             _sum: { amount: sortOrder },
//         },
//     });

//     // Step 2: Find cursor index
//     let startIndex = 0;
//     if (cursorId) {
//         const index = allFeeGroups.findIndex((f) => f.clientId === cursorId);
//         if (index !== -1) {
//             startIndex = index + 1;
//         }
//     }

//     const paginatedFeeGroups = allFeeGroups.slice(startIndex, startIndex + limit);
//     const hasNextPage = startIndex + limit < allFeeGroups.length;
//     const nextCursor = hasNextPage
//         ? allFeeGroups[startIndex + limit]?.clientId
//         : null;

//     // Step 3: Fetch clients by ID
//     const clientIds = paginatedFeeGroups.map((g) => g.clientId);

//     const clients = await db.client.findMany({
//         where: {
//             id: { in: clientIds },
//         },
//         include: {
//             fees: true,
//         },
//     });

//     // Step 4: Sort clients in the same order as feeGroups
//     const sortedClients = clientIds.map((id) =>
//         clients.find((c) => c.id === id)
//     );

//     res.status(200).json({
//         success: true,
//         message: "Clients sorted by pending fees",
//         clients: sortedClients,
//         nextCursor,
//     });
// });


export const addClient = TryCatch(async (req, res, next) => {
    console.log("Adding new client...");
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware
    console.log("User ID:", userId);
    console.log("Typeof user ID:", typeof userId);

    const { name, email, phone, } = req.body;

    if (!name || !email || !phone) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof name !== 'string' || typeof email !== 'string' || typeof phone !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }
    const existingClient = await db.client.findFirst({
        where: {
            email: email,
            caId: userId,
        },
    });

    if (existingClient) {
        return next(new ErrorHandler("Client with this email already exists", 400));
    }

    const newClient = await db.client.create({
        data: {
            caId: userId,
            name,
            email,
            phone,
        },
    });

    res.status(201).json({
        success: true,
        message: "Client added successfully",
        client: newClient,
    });
});
// import { isBefore } from "date-fns";

export const getClientById = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    // Fetch only basic client info
    const client = await db.client.findUnique({
        where: { id, caId: userId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            storageUsed: true,
            createdAt: true,
        },
    });

    if (!client) {
        return next(new ErrorHandler("Client not found", 404));
    }

    // Fetch fees and process
    // const allFees = await db.pendingFees.findMany({
    //     where: { clientId: id },
    //     select: { 
    //         status: true, 
    //         dueDate: true, 
    //         amount: true 
    //     },
    // });

    const today = new Date();

    // let pendingFeesAmount = 0;
    // let paidFeesAmount = 0;
    // // let overdueFeesAmount = 0;

    // for (const fee of allFees) {
    //     if (fee.status === "Paid") {
    //         paidFeesAmount += fee.amount;
    //     }

    //     if (fee.status === "Pending") {
    //         //   pendingFeesCount++;
    //         pendingFeesAmount += fee.amount;
    //     }
    // }
    const allFees = await db.pendingFees.findMany({
        where: {
            clientId: id,
            client: { caId: userId }
        },
        select: {
            amount: true,
            status: true,
            dueDate: true,
        }
    });

    const summary = allFees.reduce((acc, fee) => {
        acc.totalFees += 1;
        if (fee.status === 'Paid') {
            acc.totalReceived += fee.amount;
        } else if (fee.status === 'Pending' && new Date(fee.dueDate) < today) {
            acc.totalOverdue += fee.amount;
        } else if (fee.status === 'Pending') {
            acc.totalPending += fee.amount;
        }
        return acc;
    }, {
        totalReceived: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalFees: 0
    });

    res.status(200).json({
        success: true,
        message: "Client summary fetched successfully",
        client,
        summary
    });
});


export const updateClient = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const { name, email, phone, status } = req.body;

    if (!name || !email || !phone) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    const updatedClient = await db.client.update({
        where: {
            id: id,
            caId: userId,
        },
        data: {
            name,
            email,
            phone,
            status
        },
    });

    res.status(200).json({
        success: true,
        message: "Client updated successfully",
        client: updatedClient,
    });
});

export const deleteClient = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const deletedClient = await db.client.delete({
        where: {
            id: id,
            caId: userId,
        },
    });

    res.status(200).json({
        success: true,
        message: "Client deleted successfully",
        client: deletedClient,
    });
});


export const getFeeRecords = TryCatch(async (req, res, next) => {
    const { id } = req.params; // Client ID
    const userId = req.user?.id;

    const {
        cursorId,
        cursorCreatedAt,
        limit = '10',
        search,
        status,
        page = '1',
        feeCategoryId
    } = req.query;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const clientExists = await db.client.findUnique({
        where: {
            id,
            caId: userId,
        },
    });

    if (!clientExists) {
        return next(new ErrorHandler("Client not found or does not belong to you", 404));
    }

    let whereClause: any = {
        clientId: id,
        client: { caId: userId }
    };

    if (search && typeof search === 'string') {
        whereClause.OR = [
            { note: { contains: search, mode: 'insensitive' } },
            ...(isNaN(Number(search)) ? [] : [{ amount: { equals: parseFloat(search) } }])
        ];
    }

    if (feeCategoryId && typeof feeCategoryId === 'string') {
        whereClause.feeCategoryId = feeCategoryId;
    }

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


export const addFeeRecord = TryCatch(async (req, res, next) => {
    console.log("Hit addFeeRecord");
    const { id } = req.params; // Client ID
    const userId = req.user?.id;

    const {
        amount,
        note,
        dueDate,
        status = 'Pending',
        paymentDate,
        feeCategoryId
    } = req.body;

    console.log(req.body)

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }
    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!amount || !dueDate) {
        return next(new ErrorHandler("Amount and due date are required", 400));
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return next(new ErrorHandler("Amount must be a positive number", 400));
    }

    // Validate status
    const validStatuses = ['Pending', 'Paid'];
    if (!validStatuses.includes(status)) {
        return next(new ErrorHandler("Invalid status. Must be Pending, Paid, or Overdue", 400));
    }

    // Validate dates
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
        return next(new ErrorHandler("Invalid due date format", 400));
    }

    let parsedPaymentDate = null;
    if (paymentDate) {
        parsedPaymentDate = new Date(paymentDate);
        if (isNaN(parsedPaymentDate.getTime())) {
            return next(new ErrorHandler("Invalid payment date format", 400));
        }
    }

    // Auto-set payment date if status is Paid and no payment date provided
    if (status === 'Paid' && !paymentDate) {
        parsedPaymentDate = new Date();
    }

    try {
        // Verify client exists and belongs to CA
        const isClientExists = await db.client.findUnique({
            where: {
                id: id,
                caId: userId,
            },
        });

        if (!isClientExists) {
            return next(new ErrorHandler("Client not found or unauthorized", 404));
        }

        const response = await db.pendingFees.create({
            data: {
                amount: parsedAmount,
                note: note?.trim() || null,
                dueDate: parsedDueDate,
                status,
                paymentDate: parsedPaymentDate,
                clientId: id, // Direct assignment instead of connect
                feeCategoryId: feeCategoryId ? feeCategoryId : null, // Optional category
            },
        });

        res.status(201).json({
            success: true,
            message: "Fee record added successfully",
            feeRecord: response,
        });

    } catch (error) {
        console.error("Error adding fee record:", error);
        return next(new ErrorHandler("Failed to add fee record", 500));
    }
});

export const updateFeeRecord = TryCatch(async (req, res, next) => {
    const { id, feeId } = req.params; // Client ID and Fee ID
    const userId = req.user?.id;

    console.log("FeeId:", feeId);
    console.log("ClientId:", id);

    const {
        amount,
        note,
        dueDate,
        status = 'Pending',
        paymentDate,
        feeCategoryId
    } = req.body;

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }
    if (!feeId) {
        return next(new ErrorHandler("Fee record ID is required", 400));
    }
    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!amount || !dueDate) {
        return next(new ErrorHandler("Amount and due date are required", 400));
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return next(new ErrorHandler("Amount must be a positive number", 400));
    }

    // Validate status
    const validStatuses = ['Pending', 'Paid'];
    if (!validStatuses.includes(status)) {
        return next(new ErrorHandler("Invalid status. Must be Pending or Paid", 400));
    }

    // Validate dates
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
        return next(new ErrorHandler("Invalid due date format", 400));
    }

    let parsedPaymentDate = null;
    if (paymentDate) {
        parsedPaymentDate = new Date(paymentDate);
        if (isNaN(parsedPaymentDate.getTime())) {
            return next(new ErrorHandler("Invalid payment date format", 400));
        }
    }

    try {
        // Verify fee record exists and belongs to the CA's client
        const isFeeRecordExists = await db.pendingFees.findFirst({
            where: {
                id: feeId,
                clientId: id,
                client: {
                    caId: userId,
                },
            },
        });

        if (!isFeeRecordExists) {
            return next(new ErrorHandler("Fee record not found or unauthorized", 404));
        }

        // Auto-set payment date if status is changed to Paid and no payment date provided
        if (status === 'Paid' && !paymentDate && !isFeeRecordExists.paymentDate) {
            parsedPaymentDate = new Date();
        }

        // Clear payment date if status is changed from Paid to Pending/Overdue
        if (status !== 'Paid' && isFeeRecordExists.status === 'Paid') {
            parsedPaymentDate = null;
        }

        const response = await db.pendingFees.update({
            where: {
                id: feeId,
            },
            data: {
                amount: parsedAmount,
                note: note?.trim() || null,
                dueDate: parsedDueDate,
                status,
                paymentDate: parsedPaymentDate,
                feeCategoryId: feeCategoryId

            },
        });

        res.status(200).json({
            success: true,
            message: "Fee record updated successfully",
            feeRecord: response,
        });

    } catch (error) {
        console.error("Error updating fee record:", error);
        return next(new ErrorHandler("Failed to update fee record", 500));
    }
});

export const deleteFeeRecord = TryCatch(async (req, res, next) => {
    const { id, feeId } = req.params; // Client ID and Fee ID
    const userId = req.user?.id;

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }
    if (!feeId) {
        return next(new ErrorHandler("Fee record ID is required", 400));
    }
    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    try {
        // Verify fee record exists and belongs to the CA's client
        const isFeeRecordExists = await db.pendingFees.findFirst({
            where: {
                id: feeId,
                clientId: id,
                client: {
                    caId: userId,
                },
            },
        });

        if (!isFeeRecordExists) {
            return next(new ErrorHandler("Fee record not found or unauthorized", 404));
        }

        const delData = await db.pendingFees.delete({
            where: {
                id: feeId,
            },
        });

        res.status(200).json({
            success: true,
            message: "Fee record deleted successfully",
            data: delData
        });

    } catch (error) {
        console.error("Error deleting fee record:", error);
        return next(new ErrorHandler("Failed to delete fee record", 500));
    }
});

// Additional utility function for getting fee statistics
export const getFeeStatistics = TryCatch(async (req, res, next) => {
    const { id } = req.params; // Client ID
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }

    try {
        // Verify client belongs to the CA
        const clientExists = await db.client.findUnique({
            where: {
                id: id,
                caId: userId,
            },
        });

        if (!clientExists) {
            return next(new ErrorHandler("Client not found or unauthorized", 404));
        }

        const stats = await db.pendingFees.groupBy({
            by: ['status'],
            where: {
                clientId: id,
                client: { caId: userId }
            },
            _sum: {
                amount: true
            },
            _count: {
                id: true
            }
        });

        type StatusKey = 'pending' | 'paid';
        const summary = stats.reduce((acc, stat) => {
            const key = stat.status.toLowerCase() as StatusKey;
            if (key === 'pending' || key === 'paid') {
                acc[key] = {
                    count: stat._count.id,
                    amount: stat._sum.amount || 0
                };
            }
            return acc;
        }, {
            pending: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
            overdue: { count: 0, amount: 0 }
        } as Record<StatusKey, { count: number; amount: number }>);

        res.status(200).json({
            success: true,
            message: "Fee statistics fetched successfully",
            statistics: summary
        });

    } catch (error) {
        console.error("Error fetching fee statistics:", error);
        return next(new ErrorHandler("Failed to fetch fee statistics", 500));
    }
});


export const uploadDocMetaData = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;
    console.log("hitted uploadDocMetaDeta")

    const { clientId, fileName, fileKey, year, fileSize } = req.body;
    let thumbnailKey = req.body.thumbnailKey || '';

    if (!userId) {
        return next(new ErrorHandler("Unauthorized access", 401));
    }

    if (!clientId) {
        return next(new ErrorHandler("ClientId not found", 400));
    }

    if (!fileName || !fileKey || !year || !fileSize || typeof fileName != 'string' || typeof fileKey != 'string' || typeof year != 'string') {
        return next(new ErrorHandler("File info is not complete", 400));
    }

    const isClientExists = await db.client.findUnique({
        where: {
            id: clientId,
            caId: userId,
        },
    });

    if (!isClientExists) {
        return next(new ErrorHandler("Client not found", 404));
    }

    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    if (['png', 'jpg', 'jpeg', 'tiff', 'titf'].includes(fileType)) {
        thumbnailKey = fileKey;
    } else if (fileType != 'pdf') {
        thumbnailKey = getThumbnailImageKey(fileType);
    }

    await db.$transaction(async (tx) => {
        await tx.document.create({
            data: {
                clientId,
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

        await tx.client.update({
            where: {
                id: clientId
            },
            data: {
                storageUsed: {
                    increment: BigInt(fileSize),
                }
            }
        })

        res.status(201).json({
            success: true,
            message: "Document data added successfully",
        });
    });

})

export const getDocuments = TryCatch(async (req, res, next) => {
    console.log("fetching documents");

    const userId = req.user?.id;
    const limit = 10;
    const { id: clientId } = req.params;
    const nameSearch = req.query.search as string | undefined;
    const yearSearch = req.query.year as string | undefined; // <-- Add this
    const rawCursorCreatedAt = req.query.cursorUploadedAt;
    const rawCursorId = req.query.cursorId;
    console.log("clientId: ", clientId);
    console.log("userId", userId);

    const isClientExists = await db.client.findUnique({
        where: {
            id: clientId,
            caId: userId,
        },
    });

    if (!isClientExists) {
        return next(new ErrorHandler("Client not found", 404));
    }

    let cursor;
    if (rawCursorCreatedAt && rawCursorId) {
        cursor = {
            uploadedAt: new Date(rawCursorCreatedAt as string),
            id: rawCursorId as string
        };
    }

    const where: any = {
        clientId: clientId,
        client: {
            caId: userId
        }
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
});
