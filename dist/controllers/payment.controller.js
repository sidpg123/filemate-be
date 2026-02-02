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
exports.getSubscription = exports.getRazorpayKey = exports.paymentVerification = exports.hasActiveSubscription = exports.checkout = void 0;
const healpers_1 = __importStar(require("../lib/healpers"));
const razorpay_1 = require("../config/razorpay");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../lib/db"));
const utils_1 = require("../lib/utils");
exports.checkout = (0, healpers_1.default)(async (req, res, next) => {
    const userId = req.user?.id;
    const { plan, amount, expiresAt } = req.body;
    if (!plan || !amount) {
        return next(new utils_1.ErrorHandler("Plan and amount are required", 401));
    }
    const options = {
        amount: Number(amount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
            userId,
            plan, // attach the plan name here
            expiresAt
        },
    };
    const order = await razorpay_1.instance.orders.create(options);
    res.status(200).json({
        success: true,
        order
    });
});
exports.hasActiveSubscription = (0, healpers_1.default)(async (req, res, next) => {
    const userId = req.user?.id;
    const subscription = await db_1.default.subscription.findFirst({
        where: {
            userId: userId,
            status: 'active'
        },
        select: {
            status: true,
            expiresAt: true,
            plan: {
                select: {
                    name: true,
                }
            }
        }
    });
    if (subscription && subscription.expiresAt < new Date()) {
        await db_1.default.subscription.update({
            where: {
                userId: userId,
                status: 'active'
            },
            data: {
                status: 'expired'
            }
        });
        return res.json({ hasActiveSubscription: false });
    }
    if (subscription && subscription.plan.name === 'ff') {
        return res.json({ hasActiveSubscription: false });
    }
    res.json({ hasActiveSubscription: !!subscription });
});
exports.paymentVerification = (0, healpers_1.default)(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    // //console.log("Inside paymentVerification")
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    if (!process.env.RAZORPAY_KEY_SECRET) {
        return next(new utils_1.ErrorHandler("Razorpay API secret is not configured", 500));
    }
    // //console.log("Razorpay API secret is configured", process.env.RAZORPAY_KEY_SECRET);      
    const expectedSignature = crypto_1.default
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");
    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
        console.error("❌ Payment verification failed:", {
            razorpay_order_id,
            razorpay_payment_id
        });
        try {
            const refund = await razorpay_1.instance.payments.refund(razorpay_payment_id, {
                speed: "optimum" // or "instant" if you have it enabled
            });
            console.log("✅ Refund initiated for failed verification:", refund.id);
        }
        catch (refundError) {
            console.error("⚠️ Refund initiation failed:", refundError);
        }
        return next(new utils_1.ErrorHandler("Payment verification failed, refund initiated", 400));
    }
    const razorpayOrder = await razorpay_1.instance.orders.fetch(razorpay_order_id);
    const planId = razorpayOrder.notes?.plan || "Unknown";
    const userId = razorpayOrder.notes?.userId || "Unknown";
    const expiresAt = razorpayOrder.notes?.expiresAt;
    if (!planId || !userId || !expiresAt) {
        return next(new utils_1.ErrorHandler("Invalid payment metadata", 400));
    }
    //console.log("planId", planId);
    // //console.log("creating subscription");
    // //console.log("Subscription created")
    await db_1.default.$transaction(async (tx) => {
        await tx.subscription.delete({
            where: {
                userId: userId
            }
        });
        const user = await tx.user.findUnique({
            where: {
                id: userId,
            },
            select: { storageUsed: true, allocatedStorage: true }
        });
        if (!user)
            throw new utils_1.ErrorHandler("User not found", 404);
        const storageAllocated = BigInt((0, healpers_1.getStorageByPlan)(planId)) + BigInt(user?.allocatedStorage);
        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                allocatedStorage: storageAllocated
            }
        });
        await tx.subscription.create({
            data: {
                userId: userId,
                planId: planId,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                status: 'active',
                expiresAt: new Date(expiresAt),
                createdAt: new Date(),
            }
        });
        res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    });
});
exports.getRazorpayKey = (0, healpers_1.default)(async (req, res, next) => {
    //console.log("getRazorpayKey called");
    res.status(201).json({
        key: process.env.RAZORPAY_KEY_ID
    });
});
exports.getSubscription = (0, healpers_1.default)(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        return next(new utils_1.ErrorHandler("User not found", 404));
    }
    const subscription = await db_1.default.subscription.findFirst({
        where: {
            userId: userId
        },
        select: {
            id: true,
            planId: true,
            status: true,
            razorpay_order_id: true,
            razorpay_payment_id: true,
            razorpay_signature: true,
            startDate: true,
            expiresAt: true,
            createdAt: true,
            cancelledAt: true,
            plan: {
                select: {
                    name: true,
                    displayName: true,
                    features: true,
                    price: true,
                }
            }
        }
    });
    if (!subscription) {
        return next(new utils_1.ErrorHandler("No subscription found for this user", 404));
    }
    res.status(200).json({
        success: true,
        subscription
    });
});
