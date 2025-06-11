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
import TryCatch from '../lib/healpers';
import { ErrorHandler } from '../lib/utils';

export const getClients = TryCatch(async (req, res, next) => {
    console.log("Fetching clients for user...");
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware
    const limit = 2;
    const rawCursorCreatedAt = req.query.cursorCreatedAt;
    const rawCursorId = req.query.cursorId;

    let cursor;
    if (rawCursorCreatedAt && rawCursorId) {
        cursor = {
            createdAt: new Date(rawCursorCreatedAt as string),
            id: rawCursorId as string
        }
    }
    console.log("User ID:", userId);
    console.log("Typeof user ID:", typeof userId);
    const clients = await db.client.findMany({
        where: {
            caId: userId,
        },
        take: limit + 1,
        cursor,
        skip: cursor ? 1 : 0,
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }, // tie breaker
        ],
        include: {
            fees: true, // Include fees related to the client
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
        clients: paginatedClients, // ✅ now returns only `limit` clients
        nextCursor
    });
})

export const addClient = TryCatch(async (req, res, next) => {
    console.log("Adding new client...");
    const userId = req.user?.id; // Assuming user ID is stored in req.user by authentication middleware
    console.log("User ID:", userId);
    console.log("Typeof user ID:", typeof userId);

    const { name, email, phone, address } = req.body;

    if (!name || !email || !phone || !address) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    if (!userId) {
        return next(new ErrorHandler("Unauthorized: User ID not found", 401));
    }

    if (typeof userId !== 'string' || typeof name !== 'string' || typeof email !== 'string' || typeof phone !== 'string' || typeof address !== 'string') {
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
            address,
        },
    });

    res.status(201).json({
        success: true,
        message: "Client added successfully",
        client: newClient,
    });
});

export const getClientById = TryCatch(async (req, res, next) => {
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

    if (!name || !email || !phone || !address) {
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
            address,
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