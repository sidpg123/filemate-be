import db from '../lib/db';
import TryCatch from '../lib/healpers';
import { ErrorHandler } from '../lib/utils';

export const userInfo = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        return next(new ErrorHandler("Unauthourized: User ID not found", 401));
    }

    //we have to send no of clients, storaeg used, pending fees. 
    const [clientCount,storage,  totalPendingFees] = await Promise.all([
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
            storageUsed: storage?.storageUsed,
            allocatedStorage: storage?.allocatedStorage
        },
    });

})