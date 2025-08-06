import db from '../lib/db';
import TryCatch from '../lib/healpers';
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
    // console.log("role", req.user?.role)
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
    
})

export const getUserDocuments = TryCatch(async (req, res, next) => {

})