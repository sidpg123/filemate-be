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
    const feesStatusFilter = req.query.feeStatus as string | undefined; // Pending, Paid, Overdue
    const sortBy = req.query.sortBy as string | undefined; // pending fees, name
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

    if (feesStatusFilter) {
        where.fees = {
            some: {
                status: feesStatusFilter
            }
        };
    }

    // Build orderBy
    let orderBy: any[] = [];
    if (sortBy === "name") {
        orderBy.push({ name: sortOrder });
    } else {
        orderBy.push({ createdAt: sortOrder });
    }
    orderBy.push({ id: "desc" }); // tie breaker

    const clients = await db.client.findMany({
        where,
        take: limit + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy,
        include: {
            fees: true,
        },
    });

    const hasNextPage = clients.length > limit;
    const paginatedClients = hasNextPage ? clients.slice(0, limit) : clients;

    const lastClient = hasNextPage ? paginatedClients[paginatedClients.length - 1] : null;
    const nextCursor = lastClient
        ? { createdAt: lastClient.createdAt, id: lastClient.id }
        : undefined;

    res.status(200).json({
        success: true,
        message: "Clients fetched successfully",
        clients: paginatedClients,
        nextCursor
    });
});

export const getClientsSortedByFees = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;
    const limit = 2;
    const cursorId = req.query.cursorId as string | undefined;

    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

    // Step 1: Get all grouped + sorted clientIds (simulate cursor)
    const allFeeGroups = await db.pendingFees.groupBy({
        by: ["clientId"],
        where: {
            client: {
                caId: userId,
            },
            status: "Pending",
        },
        _sum: {
            amount: true,
        },
        orderBy: {
            _sum: { amount: sortOrder },
        },
    });

    // Step 2: Find cursor index
    let startIndex = 0;
    if (cursorId) {
        const index = allFeeGroups.findIndex((f) => f.clientId === cursorId);
        if (index !== -1) {
            startIndex = index + 1;
        }
    }

    const paginatedFeeGroups = allFeeGroups.slice(startIndex, startIndex + limit);
    const hasNextPage = startIndex + limit < allFeeGroups.length;
    const nextCursor = hasNextPage
        ? allFeeGroups[startIndex + limit]?.clientId
        : null;

    // Step 3: Fetch clients by ID
    const clientIds = paginatedFeeGroups.map((g) => g.clientId);

    const clients = await db.client.findMany({
        where: {
            id: { in: clientIds },
        },
        include: {
            fees: true,
        },
    });

    // Step 4: Sort clients in the same order as feeGroups
    const sortedClients = clientIds.map((id) =>
        clients.find((c) => c.id === id)
    );

    res.status(200).json({
        success: true,
        message: "Clients sorted by pending fees",
        clients: sortedClients,
        nextCursor,
    });
});


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

export const getClientById = TryCatch(async (req, res, next) => {
    console.log("getting client by ID")
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const client = await db.client.findUnique({
        where: {
            id: id,
            caId: userId,
        },
        include: {
            fees: true, // Include fees related to the client
            documents: true, // Include documents related to the client
        },

    });

    if (!client) {
        return next(new ErrorHandler("Client not found", 404));
    }

    res.status(200).json({
        success: true,
        message: "Client fetched successfully",
        client,
    });
})

export const updateClient = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const { name, email, phone, address } = req.body;

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
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!id) {
        return next(new ErrorHandler("Fee record ID is required", 400));
    }

    if (typeof userId !== 'string' || typeof id !== 'string') {
        return next(new ErrorHandler("Invalid input types", 400));
    }

    const feeRecord = await db.pendingFees.findMany({
        where: {
            clientId: id,
            client: {
                caId: userId,
            },
        },
    });
    console.log("Fee Record:", feeRecord);
    if (!feeRecord) {
        return next(new ErrorHandler("Fee record not found", 404));
    }

    res.status(200).json({
        success: true,
        message: "Fee record fetched successfully",
        feeRecord,
    });
})

export const addFeeRecord = TryCatch(async (req, res, next) => {
    console.log("hitted addFeeRecord")
    const { id } = req.params; // Client ID
    const userId = req.user?.id;

    const { amount, note, dueDate, status = 'Pending', } = req.body;

    if (!id) {
        return next(new ErrorHandler("Client ID is required", 400));
    }
    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (!amount || !dueDate) {
        return next(new ErrorHandler("Amount and due date are required", 400));
    }

    const isClientExists = await db.client.findUnique({
        where: {
            id: id,
            caId: userId,
        },
    });

    if (!isClientExists) {
        return next(new ErrorHandler("Client not found", 404));
    }

    const response = await db.pendingFees.create({
        data: {
            amount: parseFloat(amount),
            note,
            dueDate: new Date(dueDate),
            status,
            client: {
                connect: {
                    id: id,
                    caId: userId,
                },
            },
        },
    });

    res.status(201).json({
        success: true,
        message: "Fee record added successfully",
        feeRecord: response,
    });

})

export const updateFeeRecord = TryCatch(async (req, res, next) => {
    const { id, feeId } = req.params; // Client ID
    const userId = req.user?.id;
    console.log("FeeId", feeId);
    console.log("Id", id);
    const { amount, note, dueDate, status = 'Pending', paymentDate } = req.body;

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

    const isFeeRecordExists = await db.pendingFees.findUnique({
        where: {
            id: feeId,
            clientId: id,
        },
    });

    if (!isFeeRecordExists) {
        return next(new ErrorHandler("Fee record not found", 404));
    }

    const response = await db.pendingFees.update({
        where: {
            id: feeId,
        },
        data: {
            amount: parseFloat(amount),
            note,
            dueDate: new Date(dueDate),
            status,
            paymentDate: paymentDate ? new Date(paymentDate) : null, // Optional field
        },
    });

    res.status(200).json({
        success: true,
        message: "Fee record updated successfully",
        feeRecord: response,
    })
})


/// PENDING: TO UPLOAD storageUsed in user table
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
    } else if(fileType != 'pdf'){
        thumbnailKey = getThumbnailImageKey(fileType);
    }

    await db.document.create({
        data: {
            clientId,
            fileName,
            fileKey,
            thumbnailKey,
            year,
            fileSize,
        }
    })
    res.status(201).json({
        success: true,
        message: "Document data added successfully"
    })
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
        where.year = yearSearch; // Exact match
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
        document.thumbnailKey = getSignedUrl({
            url: `https://${process.env.AWS_CLOUDFRONT_DOMAIN_NAME}/${document.thumbnailKey}`,
            keyPairId: process.env.CLOUDfRONT_KEY_PAIR_ID || '',
            privateKey: process.env.CLOUDFRONT_PRIVATE_KEY || '',
            dateLessThan: new Date(Date.now() + 1000 * 60 * 15).toISOString()
        });

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
    